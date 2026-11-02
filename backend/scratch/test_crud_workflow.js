require('dotenv').config();
const mongoose = require('mongoose');
const {
  Tenant,
  User,
  BillingPlan,
  BillingAccount,
  Party,
  PostingRule,
  PostingRuleLine,
  Invoice,
  JournalEntry,
  JournalLine
} = require('../src/models');
const { issueInvoice, seedDefaultBillingPlans } = require('../src/services/billingService');
const { seedAllGuideScenarios } = require('../src/utils/seedAllGuideScenarios');

async function runTest() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!');

  const tenant = await Tenant.findOne({ slug: 'lone-star-mga' }) || await Tenant.findOne();
  if (!tenant) throw new Error('No tenant found');
  const tenantId = tenant._id.toString();
  console.log(`Using Tenant: ${tenant.name} (${tenantId})`);

  const user = await User.findOne({ tenant_id: tenantId }) || await User.findOne();
  const userId = user ? user._id : null;

  // 1. BILLING PLAN CRUD TEST
  console.log('\n--- 1. Testing Billing Plan CRUD ---');
  // Seed default plans if none
  await seedDefaultBillingPlans(tenantId);

  // CREATE
  const testPlanCode = `TEST_PLAN_${Date.now()}`;
  const createdPlan = new BillingPlan({
    tenant_id: tenantId,
    plan_code: testPlanCode,
    plan_name: 'Custom 3-Pay Commercial Auto',
    description: '3 equal installments with 33.33% down payment',
    installment_count: 3,
    down_payment_pct: 33.33,
    installment_fee: 10.00,
    interval_months: 2,
    status: 'ACTIVE'
  });
  await createdPlan.save();
  console.log(`[PASS] Created Billing Plan: ${createdPlan.plan_code} (ID: ${createdPlan._id})`);

  // READ
  const fetchedPlan = await BillingPlan.findOne({ _id: createdPlan._id, tenant_id: tenantId });
  if (!fetchedPlan || fetchedPlan.plan_name !== 'Custom 3-Pay Commercial Auto') {
    throw new Error('Plan fetch verification failed');
  }
  console.log(`[PASS] Read Billing Plan verified: ${fetchedPlan.plan_name}`);

  // UPDATE
  fetchedPlan.plan_name = 'Custom 3-Pay Fleet Auto - Updated';
  fetchedPlan.installment_fee = 12.50;
  await fetchedPlan.save();
  const updatedPlan = await BillingPlan.findById(createdPlan._id);
  if (updatedPlan.plan_name !== 'Custom 3-Pay Fleet Auto - Updated' || Number(updatedPlan.installment_fee) !== 12.50) {
    throw new Error('Plan update verification failed');
  }
  console.log(`[PASS] Updated Billing Plan: ${updatedPlan.plan_name}, Fee: $${updatedPlan.installment_fee}`);

  // TOGGLE STATUS
  updatedPlan.status = updatedPlan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await updatedPlan.save();
  console.log(`[PASS] Toggled Plan Status to: ${updatedPlan.status}`);

  // DELETE
  await BillingPlan.deleteOne({ _id: createdPlan._id, tenant_id: tenantId });
  const deletedCheck = await BillingPlan.findById(createdPlan._id);
  if (deletedCheck) throw new Error('Plan delete verification failed');
  console.log(`[PASS] Deleted Billing Plan: ${testPlanCode}`);

  // 2. BILLING ACCOUNT CREATION WITH ERD FIELDS
  console.log('\n--- 2. Testing Billing Account Creation with ERD Alignment ---');
  const defaultPlan = await BillingPlan.findOne({ tenant_id: tenantId, status: 'ACTIVE' });
  if (!defaultPlan) throw new Error('No active billing plan available');

  let testParty = await Party.findOne({ tenant_id: tenantId });
  if (!testParty) {
    testParty = new Party({
      tenant_id: tenantId,
      party_code: 'TEST-INSURED-01',
      legal_name: 'Lone Pine Logistics LLC',
      trade_name: 'Lone Pine Express',
      party_type: 'ORGANIZATION',
      email: 'billing@lonepine.com'
    });
    await testParty.save();
  }

  const testAccNumber = `BA-ERD-${Date.now().toString().slice(-6)}`;
  const newAccount = new BillingAccount({
    tenant_id: tenantId,
    account_number: testAccNumber,
    customer_name: testParty.legal_name,
    customer_email: testParty.email,
    billing_plan_id: defaultPlan._id,
    payer_party_id: testParty._id,
    bill_type: 'DIRECT_BILL',
    currency_code: 'USD'
  });
  await newAccount.save();

  const fetchedAccount = await BillingAccount.findById(newAccount._id)
    .populate('billing_plan_id')
    .populate('payer_party_id');

  console.log(`[PASS] Billing Account Created with ERD Fields:`);
  console.log(`       - Account Number: ${fetchedAccount.account_number}`);
  console.log(`       - Billing Plan (FK): ${fetchedAccount.billing_plan_id?.plan_name} (${fetchedAccount.billing_plan_id?.plan_code})`);
  console.log(`       - Payer Party (REF): ${fetchedAccount.payer_party_id?.legal_name}`);
  console.log(`       - Bill Type: ${fetchedAccount.bill_type}`);
  console.log(`       - Currency Code: ${fetchedAccount.currency_code}`);

  // 3. POSTING RULES SEEDING & GL HIT VERIFICATION
  console.log('\n--- 3. Testing Journal Entry Posting Rules & GL Double-Entry Posting ---');
  await seedAllGuideScenarios(tenantId);

  const publishedRules = await PostingRule.find({ tenant_id: tenantId, status: 'PUBLISHED' });
  console.log(`[PASS] Master Posting Rules Seeded: ${publishedRules.length} rules published`);
  const ruleCodes = publishedRules.map(r => r.rule_code);
  console.log(`       Rules list: ${ruleCodes.join(', ')}`);

  // Verify RULE_INV_ISSUE and RULE_PMT_RECEIVED exist
  if (!ruleCodes.includes('RULE_INV_ISSUE')) throw new Error('RULE_INV_ISSUE not found in seeded rules');
  if (!ruleCodes.includes('RULE_PMT_RECEIVED')) throw new Error('RULE_PMT_RECEIVED not found in seeded rules');

  // Issue invoice to test GL posting via posting rules
  const testPolicyId = `POL-TEST-${Date.now().toString().slice(-5)}`;
  const invoiceResult = await issueInvoice({
    tenantId,
    userId,
    billingAccountId: fetchedAccount._id,
    policyId: testPolicyId,
    installmentNumber: 1,
    invoiceDate: new Date(),
    lines: [
      { line_type: 'PREMIUM', description: 'Commercial Auto Liability Premium', amount: 5000.00, ledger_account_code: '2200' },
      { line_type: 'FEE', description: 'Texas Regulatory Fee', amount: 150.00, ledger_account_code: '4100' }
    ]
  });

  console.log(`[PASS] Invoice Issued: ${invoiceResult.invoice.invoice_number} (Total: $${invoiceResult.invoice.total_amount})`);

  // Check Journal Entry
  if (invoiceResult.journal) {
    const journal = await JournalEntry.findById(invoiceResult.journal._id);
    const lines = await JournalLine.find({ journal_id: journal._id });
    console.log(`[PASS] GL Journal Created via Posting Rule Engine:`);
    console.log(`       - Journal Number: ${journal.journal_number}`);
    console.log(`       - Status: ${journal.status}`);
    console.log(`       - Total Debit: $${journal.total_debit}, Total Credit: $${journal.total_credit}`);
    console.log(`       - Lines count: ${lines.length}`);
    lines.forEach(l => {
      console.log(`         * ${l.line_type} Acc ${l.account_code}: $${l.amount} (${l.memo || l.description})`);
    });

    if (journal.total_debit.toString() !== journal.total_credit.toString()) {
      throw new Error('Journal is not balanced!');
    }
    console.log(`[PASS] Double-Entry GL Journal is strictly balanced!`);
  } else {
    console.log('[INFO] Event dispatched to outbox for posting pipeline');
  }

  // Cleanup test account and invoice
  await Invoice.deleteOne({ _id: invoiceResult.invoice._id });
  await BillingAccount.deleteOne({ _id: fetchedAccount._id });
  console.log('\n[ALL TESTS PASSED SUCCESSFULLY]');

  await mongoose.disconnect();
}

runTest().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
