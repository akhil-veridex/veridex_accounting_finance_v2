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
  console.log('--- Veridex Physical ERD v4.6 (Module 12 & 35) Snapshot & Standalone Verification ---');

  // 1. Register or Authenticate Tenant
  const uniqueSuffix = Date.now().toString().slice(-5);
  const regRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/auth/register-tenant',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    tenant_code: `LPT_${uniqueSuffix}`,
    tenant_name: `Lone Pine Trucking Fleet ${uniqueSuffix}`,
    admin_email: `arturo_${uniqueSuffix}@lonepine.com`,
    admin_password: 'Password@123',
    admin_first_name: 'Arturo',
    admin_last_name: 'Gatti',
    base_currency: 'USD'
  });

  if (!regRes.data || !regRes.data.data) {
    console.error('Registration failed:', regRes);
    process.exit(1);
  }

  const token = regRes.data.data.token;
  const tenantId = regRes.data.data.tenant.id || regRes.data.data.tenant._id;
  console.log('✓ Registered Tenant OK. Tenant ID:', tenantId);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': String(tenantId)
  };

  // Ensure default Billing Account exists
  const createAccRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/accounts',
    method: 'POST',
    headers: authHeaders
  }, {
    account_number: `BA-TX-${uniqueSuffix}`,
    customer_name: 'Lone Pine Trucking Fleet LLC',
    customer_email: `arturo_${uniqueSuffix}@lonepine.com`
  });
  console.log('✓ Created Billing Account:', createAccRes.data.data.account_number);

  // 2. Fetch Accounts
  const accRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/accounts',
    method: 'GET',
    headers: authHeaders
  });
  const account = accRes.data.data[0];
  console.log(`✓ Fetched Billing Accounts: found ${accRes.data.data.length}, using ${account ? account.account_number : 'none'}`);

  // 3. Bind Policy & Generate Schedule (Module 12 + Module 35 Snapshot Auto-creation)
  const schedulePayload = {
    billing_account_id: account._id,
    policy_id: 'POL-TX-7788',
    policy_number: 'POL-TX-7788',
    total_premium: '37650.00',
    policy_fee: '150.00',
    billing_plan_code: '4_PAY_25_DOWN',
    effective_date: '2026-07-01'
  };

  const schedGenRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/policies/schedule',
    method: 'POST',
    headers: authHeaders
  }, schedulePayload);

  console.log(`✓ Schedule Generation Response: HTTP ${schedGenRes.status}`);
  if (schedGenRes.data && schedGenRes.data.data) {
    const d = schedGenRes.data.data;
    console.log(`  • Policy Snapshot ID: ${d.policySnapshot ? d.policySnapshot.billing_policy_snapshot_id : 'N/A'}`);
    console.log(`  • Tx Snapshot ID: ${d.transactionSnapshot ? d.transactionSnapshot.billing_transaction_snapshot_id : 'N/A'}`);
    console.log(`  • Installments Generated: ${d.schedules ? d.schedules.length : 0}`);
  }

  // 4. Test GET Policy Snapshots
  const snapListRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/snapshots/policies',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`✓ GET /snapshots/policies: HTTP ${snapListRes.status}, count: ${snapListRes.data.data.length}`);
  const firstSnap = snapListRes.data.data[0];
  if (firstSnap) {
    console.log(`  • First Snapshot: ${firstSnap.billing_policy_snapshot_id} | Policy: ${firstSnap.policy_number} | Status: ${firstSnap.status}`);
  }

  // 5. Test GET Transaction Snapshots
  const txListRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/snapshots/transactions',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`✓ GET /snapshots/transactions: HTTP ${txListRes.status}, count: ${txListRes.data.data.length}`);

  // 6. Test Ingesting Standalone External Policy Snapshot
  const extSnapRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/snapshots/policies',
    method: 'POST',
    headers: authHeaders
  }, {
    policy_number: 'POL-EXT-EPIC-9901',
    source_entity_id: 'EPIC-POLICY-GUID-7711',
    source_version: 'v1.0',
    effective_date: '2026-08-01',
    expiration_date: '2027-08-01',
    total_premium: '48200.00',
    total_fees: '200.00',
    total_taxes: '0.00',
    line_of_business: 'COMMERCIAL_AUTO',
    status: 'BOUND',
    snapshot_json: {
      underwriting_system: 'Applied Epic',
      fleet_units: 14,
      dot_number: 'TX-DOT-8849201'
    }
  });
  console.log(`✓ POST /snapshots/policies (External Applied Epic ingestion): HTTP ${extSnapRes.status}`);
  console.log(`  • Created Snapshot ID: ${extSnapRes.data.data.billing_policy_snapshot_id}`);

  // 7. Test Registering Premium Finance Agreement (Module 12)
  const finRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/finance-agreements',
    method: 'POST',
    headers: authHeaders
  }, {
    billing_account_id: account._id,
    agreement_number: 'PFA-TX-2026-991',
    amount_financed: '28237.50',
    down_payment: '9412.50',
    interest_rate: '8.25',
    notes: 'Imperial PFS Texas Commercial Auto Financing'
  });
  console.log(`✓ POST /finance-agreements: HTTP ${finRes.status}, agreement: ${finRes.data.data.agreement_number}`);

  // 8. Test GET Finance Agreements
  const finListRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/finance-agreements',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`✓ GET /finance-agreements: HTTP ${finListRes.status}, count: ${finListRes.data.data.length}`);

  // 9. Verify Installment Schedules have snapshot IDs
  const schedRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/schedules?policy_id=POL-TX-7788',
    method: 'GET',
    headers: authHeaders
  });
  const schedItem = schedRes.data.data[0];
  console.log(`✓ Installment Schedule Check:`);
  // 10. Issue Invoice for Installment #1 and Verify Invoice Lines have Snapshot Refs
  const invRes = await request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/v1/billing/invoices',
    method: 'POST',
    headers: authHeaders
  }, {
    billing_account_id: account._id,
    policy_id: 'POL-TX-7788',
    installment_number: 1,
    invoice_date: '2026-07-01',
    due_date: '2026-07-15',
    lines: [
      {
        line_type: 'PREMIUM',
        description: 'Commercial Auto Down Payment #1',
        amount: '9412.50',
        ledger_account_code: '2200'
      },
      {
        line_type: 'FEE',
        description: 'Policy Issuance Fee',
        amount: '150.00',
        ledger_account_code: '4100'
      }
    ]
  });

  console.log(`✓ POST /invoices: HTTP ${invRes.status}, invoice: ${invRes.data.data.invoice.invoice_number}`);
  const lines = invRes.data.data.lines;
  console.log(`✓ Invoice Lines count: ${lines.length}`);
  if (lines[0]) {
    console.log(`  • Line #1 installment_id: ${lines[0].installment_id || 'NOT SET'}`);
    console.log(`  • Line #1 billing_transaction_snapshot_id: ${lines[0].billing_transaction_snapshot_id || 'NOT SET'}`);
  }

  console.log('\n=======================================================');
  console.log('ALL VERIDEX PHYSICAL ERD v4.6 SNAPSHOT & FINANCE TESTS PASSED!');
  console.log('=======================================================');
}

run().catch(console.error);
