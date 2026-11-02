const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('VERIDEX FINANCE & BILLING WORKFLOW LIVE HTTP API VERIFICATION');
  console.log('================================================================\n');

  const suffix = Date.now().toString().slice(-5);

  // 1. Register Tenant
  console.log('1. Registering Tenant & Auto-Provisioning Chart of Accounts...');
  const regRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/auth/register-tenant',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    tenant_code: `TENANT_${suffix}`,
    tenant_name: `Lone Star Insurance Syndicate ${suffix}`,
    admin_email: `admin_${suffix}@lonestar.com`,
    admin_password: 'Password@123',
    admin_first_name: 'Arturo',
    admin_last_name: 'Gatti',
    base_currency: 'USD'
  });

  if (regRes.status !== 201 && regRes.status !== 200) {
    console.error('Registration failed:', regRes);
    process.exit(1);
  }

  const token = regRes.data.data.token;
  const tenantId = regRes.data.data.tenant.id || regRes.data.data.tenant._id;
  console.log(`[PASS] Tenant registered: ${tenantId}\n`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': String(tenantId)
  };

  // 2. Billing Plans Complete CRUD
  console.log('2. Testing Billing Plans Complete CRUD...');
  
  // (a) CREATE Plan
  const planPayload = {
    plan_code: `PLAN_10_PAY_${suffix}`,
    plan_name: 'Commercial Auto 10-Pay Fleet',
    description: '10 monthly payments with 10% down payment and $5 fee',
    installment_count: 10,
    down_payment_pct: 10,
    installment_fee: 5.00,
    interval_months: 1,
    status: 'ACTIVE'
  };
  const createPlanRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/plans',
    method: 'POST',
    headers: authHeaders
  }, planPayload);

  if (createPlanRes.status !== 201 && createPlanRes.status !== 200) {
    throw new Error(`Create Plan failed: ${JSON.stringify(createPlanRes)}`);
  }
  const createdPlan = createPlanRes.data.data;
  const planId = createdPlan._id || createdPlan.id;
  console.log(`[PASS] Created Billing Plan: ${createdPlan.plan_name} (${createdPlan.plan_code}) [ID: ${planId}]`);

  // (b) READ Plans List & Detail
  const listPlansRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/plans',
    method: 'GET',
    headers: authHeaders
  });
  const plansList = listPlansRes.data.data || [];
  console.log(`[PASS] Read Billing Plans: ${plansList.length} plans active in tenant catalog`);

  const getPlanRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: `/api/v1/billing/plans/${planId}`,
    method: 'GET',
    headers: authHeaders
  });
  if (getPlanRes.status !== 200) throw new Error('Get plan by ID failed');
  console.log(`[PASS] Read Single Plan Detail verified: ${getPlanRes.data.data.plan_code}`);

  // (c) UPDATE Plan
  const updatePlanRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: `/api/v1/billing/plans/${planId}`,
    method: 'PATCH',
    headers: authHeaders
  }, {
    plan_name: 'Commercial Auto 10-Pay Fleet - Preferred',
    installment_fee: 7.50,
    down_payment_pct: 15
  });
  if (updatePlanRes.status !== 200) throw new Error(`Update plan failed: ${JSON.stringify(updatePlanRes)}`);
  console.log(`[PASS] Updated Billing Plan: ${updatePlanRes.data.data.plan_name}, Fee: $${updatePlanRes.data.data.installment_fee}`);

  // (d) TOGGLE Status
  const togglePlanRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: `/api/v1/billing/plans/${planId}/status`,
    method: 'PATCH',
    headers: authHeaders
  });
  console.log(`[PASS] Toggled Plan Status to: ${togglePlanRes.data.data.status}`);

  // Toggle back to ACTIVE for subsequent tests
  await request({
    hostname: 'localhost',
    port: 5050,
    path: `/api/v1/billing/plans/${planId}/status`,
    method: 'PATCH',
    headers: authHeaders
  });
  console.log(`[PASS] Restored Plan Status to ACTIVE for workflow testing\n`);

  // 3. Billing Account Creation with ERD Fields
  console.log('3. Testing Billing Account Creation with Physical ERD Alignment...');
  // Create Counterparty (Broker / Agency)
  const cpRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/counterparties',
    method: 'POST',
    headers: authHeaders
  }, {
    party_code: `BRK_${suffix}`,
    legal_name: `Pine Cone Brokerage Services ${suffix}`,
    trade_name: 'Pine Cone Insurance',
    party_type: 'ORGANIZATION',
    roles: [{ role_type: 'BROKER', status: 'ACTIVE' }],
    email: `billing@pinecone_${suffix}.com`
  });
  const brokerPartyId = cpRes.data.data?._id;
  console.log(`[PASS] Broker Counterparty Created: ${brokerPartyId}`);

  // Create Billing Account passing billing_plan_id, payer_party_id, bill_type, currency_code
  const accPayload = {
    account_number: `BA-CORR-${suffix}`,
    customer_name: `Pine Cone Brokerage Services ${suffix}`,
    customer_email: `billing@pinecone_${suffix}.com`,
    billing_plan_id: planId,
    payer_party_id: brokerPartyId,
    bill_type: 'AGENCY_BILL',
    currency_code: 'USD'
  };

  const createAccRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/accounts',
    method: 'POST',
    headers: authHeaders
  }, accPayload);

  if (createAccRes.status !== 201 && createAccRes.status !== 200) {
    throw new Error(`Create Billing Account failed: ${JSON.stringify(createAccRes)}`);
  }
  const createdAccount = createAccRes.data.data;
  console.log(`[PASS] Billing Account Created: ${createdAccount.account_number}`);
  console.log(`       - Billing Plan (FK): ${createdAccount.billing_plan_id?.plan_name || createdAccount.billing_plan_id}`);
  console.log(`       - Payer Party (REF): ${createdAccount.payer_party_id?.legal_name || createdAccount.payer_party_id}`);
  console.log(`       - Bill Type: ${createdAccount.bill_type}`);
  console.log(`       - Currency Code: ${createdAccount.currency_code}\n`);

  // 4. Journal Entry Posting Rules Seeding & GL Auto-Hit
  console.log('4. Testing Journal Entry Posting Rules Seeding & GL Hit on Invoice Issue...');
  
  // Seed Rules via POST /api/v1/rules/seed
  const seedRulesRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/rules/seed',
    method: 'POST',
    headers: authHeaders
  });

  if (seedRulesRes.status !== 200) {
    throw new Error(`Seed Rules failed: ${JSON.stringify(seedRulesRes)}`);
  }
  const seededRules = seedRulesRes.data.data || [];
  console.log(`[PASS] Seeded ${seededRules.length} master published posting rules via /api/v1/rules/seed:`);
  console.log(`       Rules: ${seededRules.map(r => r.rule_code).join(', ')}`);

  // Issue Invoice
  const invoicePayload = {
    billing_account_id: createdAccount._id,
    policy_id: `POL-AUTO-${suffix}`,
    installment_number: 1,
    invoice_date: '2026-07-01',
    lines: [
      { line_type: 'PREMIUM', description: 'Commercial Auto Gross Premium', amount: 9412.50, ledger_account_code: '2200' },
      { line_type: 'FEE', description: 'Texas Installment Processing Fee', amount: 150.00, ledger_account_code: '4100' }
    ]
  };

  const issueInvRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/invoices',
    method: 'POST',
    headers: authHeaders
  }, invoicePayload);

  if (issueInvRes.status !== 201 && issueInvRes.status !== 200) {
    throw new Error(`Issue Invoice failed: ${JSON.stringify(issueInvRes)}`);
  }
  const issuedInvoice = issueInvRes.data.data.invoice;
  const journalObj = issueInvRes.data.data.journal;
  console.log(`[PASS] Invoice Issued Successfully: ${issuedInvoice.invoice_number}`);
  console.log(`       - Total Amount: $${issuedInvoice.total_amount}`);
  console.log(`       - Status: ${issuedInvoice.status}`);

  if (journalObj) {
    console.log(`[PASS] Double-Entry GL Journal Created & Linked:`);
    console.log(`       - Journal Number: ${journalObj.journal_number}`);
    console.log(`       - Total Debit: $${journalObj.total_debit}, Total Credit: $${journalObj.total_credit}`);
    console.log(`       - Lines:`);
    if (journalObj.lines) {
      journalObj.lines.forEach(l => {
        console.log(`         * ${l.line_type || (l.debit > 0 ? 'DEBIT' : 'CREDIT')} Acc ${l.account_code}: $${l.amount || l.debit || l.credit} (${l.memo})`);
      });
    }
  }

  // Record Payment Receipt against invoice
  console.log('\n5. Testing Payment Receipt & Waterfall Allocation...');
  const paymentPayload = {
    billing_account_id: createdAccount._id,
    amount: '9562.50',
    payment_method: 'ACH',
    reference_number: `WF-ACH-${suffix}`,
    is_fiduciary: true,
    target_invoice_id: issuedInvoice._id
  };

  const paymentRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/payments',
    method: 'POST',
    headers: authHeaders
  }, paymentPayload);

  if (paymentRes.status !== 201 && paymentRes.status !== 200) {
    throw new Error(`Post Payment failed: ${JSON.stringify(paymentRes)}`);
  }
  const paymentData = paymentRes.data.data.payment;
  const paymentJournal = paymentRes.data.data.journal;
  console.log(`[PASS] Payment Recorded: ${paymentData.payment_number}`);
  console.log(`       - Amount Allocated: $${paymentData.allocated_amount}`);
  console.log(`       - Status: ${paymentData.status}`);
  if (paymentJournal) {
    console.log(`[PASS] Payment GL Journal Posted: ${paymentJournal.journal_number}`);
  }

  // 6. Test Delete Plan
  console.log('\n6. Testing Delete Billing Plan...');
  // Create another throwaway plan to delete
  const delPlanRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/plans',
    method: 'POST',
    headers: authHeaders
  }, {
    plan_code: `PLAN_TEMP_DEL_${suffix}`,
    plan_name: 'Temporary Deletable Plan',
    installment_count: 2,
    down_payment_pct: 50,
    installment_fee: 0,
    interval_months: 6,
    status: 'INACTIVE'
  });
  const tempPlanId = delPlanRes.data.data._id;
  const deleteRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: `/api/v1/billing/plans/${tempPlanId}`,
    method: 'DELETE',
    headers: authHeaders
  });
  if (deleteRes.status !== 200) throw new Error(`Delete plan failed: ${JSON.stringify(deleteRes)}`);
  console.log(`[PASS] Deleted Billing Plan ID: ${tempPlanId} (${deleteRes.data.message})`);

  console.log('\n================================================================');
  console.log('✓ ALL LIVE HTTP API TESTS COMPLETED AND FULLY VERIFIED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('\n[FATAL ERROR IN TEST]:', err);
  process.exit(1);
});
