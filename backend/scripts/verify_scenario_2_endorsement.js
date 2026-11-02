const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const BigNumber = require('bignumber.js');
const {
  BillingAccount,
  BillingAccountPolicy,
  BillingPolicySnapshot,
  BillingTransactionSnapshot,
  InstallmentSchedule,
  Invoice,
  InvoiceLine,
  Journal
} = require('../src/models');
const billingService = require('../src/services/billingService');

async function runVerification() {
  console.log('=================================================================');
  console.log('🚀 TESTING SCENARIO 2: POLICY ENDORSEMENT SUB-SCENARIOS 1 & 2');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  const tenantId = '6ae5850c0c359c85e5373bb2'; // Harbor MGA
  const userId = '6ae5850c0c359c85e5373bb3';

  // -------------------------------------------------------------------------
  // TEST PART 1: SUB-SCENARIO 2 (OPTION B: SPREAD ACROSS REMAINING INSTALLMENTS)
  // -------------------------------------------------------------------------
  console.log('--- TEST PART 1: SUB-SCENARIO 2 (OPTION B: SPREAD_INSTALLMENTS) ---');
  await billingService.resetPolicyEndorsement({ tenantId, policyNumber: 'POL-TX-8821' });

  const resultB = await billingService.applyPolicyEndorsement({
    tenantId,
    userId,
    policyNumber: 'POL-TX-8821',
    endorsementNumber: 'END-2026-00001',
    vehicleId: 'TRUCK-T5',
    effectiveDate: '2026-09-01',
    annualRate: '8700.00',
    activeDays: 303,
    deltaPremium: '7222.19',
    billingOption: 'SPREAD_INSTALLMENTS',
    useMigrationAdapter: true
  });

  console.log('✅ Endorsement applied with Option B:', {
    policyNumber: resultB.policyNumber,
    revisedPremium: resultB.revisedPolicyPremium,
    delta: resultB.deltaPremium,
    updatedSchedulesCount: resultB.updatedSchedules.length
  });

  // Verify GL Entry
  if (resultB.journal) {
    console.log(`✅ Endorsement GL Journal: ${resultB.journal.entry_number || resultB.journal.reference_id}`);
    const lines = resultB.journal.lines || [];
    for (const l of lines) {
      console.log(`   Account ${l.account_code}: Dr $${l.debit} / Cr $${l.credit} (${l.memo || ''})`);
    }
  }

  // Verify Schedule Amounts
  const schedsAfterB = await InstallmentSchedule.find({
    tenant_id: tenantId,
    policy_number: 'POL-TX-8821'
  }).sort({ installment_number: 1 });

  console.log('\n📅 Installment Schedules after Option B Spread:');
  for (const s of schedsAfterB) {
    console.log(`   Installment #${s.installment_number}: Total = $${s.total_amount} (Premium = $${s.premium_amount}, Fee = $${s.fee_amount}) [${s.status}]`);
  }

  // Assertions for Option B
  const s2 = schedsAfterB.find(s => s.installment_number === 2);
  const s3 = schedsAfterB.find(s => s.installment_number === 3);
  const s4 = schedsAfterB.find(s => s.installment_number === 4);

  if (s2.total_amount.toString() !== '11819.90') throw new Error(`Installment 2 expected 11819.90, got ${s2.total_amount}`);
  if (s3.total_amount.toString() !== '11819.90') throw new Error(`Installment 3 expected 11819.90, got ${s3.total_amount}`);
  if (s4.total_amount.toString() !== '11819.89') throw new Error(`Installment 4 expected 11819.89, got ${s4.total_amount}`);
  console.log('✅ Assertion PASSED: Installments 2, 3, 4 properly revised to $11,819.90, $11,819.90, $11,819.89!');

  // Test issuing invoice for Installment #2 with revised amount
  console.log('\n🧾 Testing Invoice Issuance for Installment #2 ($11,819.90)...');
  const bAcc = await BillingAccount.findOne({ tenant_id: tenantId });
  const invRes = await billingService.issueInvoice({
    tenantId,
    userId,
    billingAccountId: bAcc._id,
    policyId: 'POL-TX-8821',
    installmentNumber: 2,
    invoiceDate: new Date('2026-10-01'),
    lines: [
      {
        line_type: 'PREMIUM',
        description: 'Commercial Auto Installment #2 (Base $9,412.50 + Truck T5 Delta $2,407.40)',
        amount: '11819.90',
        ledger_account_code: '2200'
      }
    ],
    useMigrationAdapter: true
  });

  console.log(`✅ Invoice ${invRes.invoice.invoice_number} issued for $${invRes.invoice.total_amount}`);
  if (invRes.journal) {
    console.log(`   GL Journal for Inv #2: ${invRes.journal.entry_number || invRes.journal.reference_id}`);
    for (const l of invRes.journal.lines || []) {
      console.log(`   Account ${l.account_code}: Dr $${l.debit} / Cr $${l.credit} (${l.memo || ''})`);
    }
    // Verify GL posted base amount ($9,412.50) without double-counting the $2,407.40 delta
    const drLine = (invRes.journal.lines || []).find(l => l.account_code === '1100');
    if (drLine && drLine.debit !== '9412.50') {
      throw new Error(`Expected Invoice GL debit to be base 9412.50, but got ${drLine.debit}`);
    }
    console.log('✅ Assertion PASSED: Zero double-counting! Invoice GL only booked base $9,412.50 since delta $2,407.40 was booked at endorsement.');
  }

  // Clean up invoice 2 for next test
  await InvoiceLine.deleteMany({ invoice_id: invRes.invoice._id });
  await Invoice.deleteOne({ _id: invRes.invoice._id });
  if (invRes.journal?._id) await Journal.deleteOne({ _id: invRes.journal._id });

  // -------------------------------------------------------------------------
  // TEST PART 2: SUB-SCENARIO 1 (OPTION A: STANDALONE SINGLE INVOICE)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST PART 2: SUB-SCENARIO 1 (OPTION A: STANDALONE_INVOICE) ---');
  await billingService.resetPolicyEndorsement({ tenantId, policyNumber: 'POL-TX-8821' });

  const resultA = await billingService.applyPolicyEndorsement({
    tenantId,
    userId,
    policyNumber: 'POL-TX-8821',
    endorsementNumber: 'END-2026-00001',
    vehicleId: 'TRUCK-T5',
    effectiveDate: '2026-09-01',
    annualRate: '8700.00',
    activeDays: 303,
    deltaPremium: '7222.19',
    billingOption: 'STANDALONE_INVOICE',
    autoIssueStandaloneInvoice: true,
    useMigrationAdapter: true
  });

  console.log('✅ Endorsement applied with Option A:', {
    policyNumber: resultA.policyNumber,
    revisedPremium: resultA.revisedPolicyPremium,
    standaloneInvoiceNumber: resultA.standaloneInvoice?.invoice_number,
    standaloneInvoiceAmount: resultA.standaloneInvoice?.total_amount?.toString()
  });

  const schedsAfterA = await InstallmentSchedule.find({
    tenant_id: tenantId,
    policy_number: 'POL-TX-8821'
  }).sort({ installment_number: 1 });

  console.log('\n📅 Installment Schedules after Option A:');
  for (const s of schedsAfterA) {
    console.log(`   Installment #${s.installment_number}: Total = $${s.total_amount} [${s.status}] ${s.dimensions?.standalone_endorsement ? '(STANDALONE ENDORSEMENT)' : ''}`);
  }

  // Assertions for Option A
  const s2A = schedsAfterA.find(s => s.installment_number === 2);
  const s3A = schedsAfterA.find(s => s.installment_number === 3);
  const s4A = schedsAfterA.find(s => s.installment_number === 4);
  const sStand = schedsAfterA.find(s => s.installment_number === 5 || s.dimensions?.standalone_endorsement);

  if (s2A.total_amount.toString() !== '9412.50') throw new Error(`Installment 2 expected 9412.50 in Option A, got ${s2A.total_amount}`);
  if (s3A.total_amount.toString() !== '9412.50') throw new Error(`Installment 3 expected 9412.50 in Option A, got ${s3A.total_amount}`);
  if (s4A.total_amount.toString() !== '9412.50') throw new Error(`Installment 4 expected 9412.50 in Option A, got ${s4A.total_amount}`);
  if (!sStand || sStand.total_amount.toString() !== '7222.19') throw new Error(`Standalone schedule expected 7222.19, got ${sStand?.total_amount}`);

  console.log('✅ Assertion PASSED: Existing installments remain untouched at $9,412.50, and standalone invoice/schedule created for $7,222.19!');

  // -------------------------------------------------------------------------
  // RESET BACK TO CLEAN STATE FOR USER PRACTICE
  // -------------------------------------------------------------------------
  console.log('\n--- RESETTING TO CLEAN PRE-ENDORSEMENT STATE FOR USER PRACTICE ---');
  await billingService.resetPolicyEndorsement({ tenantId, policyNumber: 'POL-TX-8821' });
  console.log('✅ Reset complete! Base installments 2, 3, 4 are at $9,412.50 ready for user UI testing.');

  console.log('\n=================================================================');
  console.log('🎉 ALL SCENARIO 2 SUB-SCENARIO TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('=================================================================');

  await mongoose.disconnect();
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
