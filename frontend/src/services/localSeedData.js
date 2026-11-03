/**
 * Initial master seed dataset for standalone local-storage prototype.
 * Mirrors 100% of the Veridex One v4.6 insurance SaaS schema.
 */

export const INITIAL_TENANTS = [
  {
    id: 'tenant-harbor-mga',
    name: 'Harbor MGA Pvt. Ltd.',
    tenant_type: 'MGA',
    currency: 'USD',
    state: 'TX',
    fiduciary_compliance: 'Texas § 4053',
    status: 'ACTIVE'
  },
  {
    id: 'tenant-summit-carrier',
    name: 'Summit Mutual Insurance Company',
    tenant_type: 'CARRIER',
    currency: 'USD',
    state: 'TX',
    status: 'ACTIVE'
  },
  {
    id: 'tenant-brightline-broker',
    name: 'Brightline Risk Services LLC',
    tenant_type: 'BROKER',
    currency: 'USD',
    state: 'TX',
    status: 'ACTIVE'
  }
];

export const INITIAL_USER = {
  id: 'usr-controller-01',
  email: 'alex.controller@harbor-mga.com',
  name: 'Alex Mercer (Controller)',
  tenant_id: 'tenant-harbor-mga',
  is_platform_admin: true,
  roles: ['TENANT_ADMIN', 'CONTROLLER']
};

export const INITIAL_ACCOUNTS = [
  { id: 'acc-1000', code: '1000', name: 'Operating Cash', type: 'ASSET', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-1010', code: '1010', name: 'Premium Trust Bank (Texas § 4053)', type: 'ASSET', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: 'Texas § 4053' },
  { id: 'acc-1020', code: '1020', name: 'Cash - Claims Escrow Account', type: 'ASSET', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: 'Texas § 4053' },
  { id: 'acc-1100', code: '1100', name: 'Premium Receivable', type: 'ASSET', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-1120', code: '1120', name: 'Allowance for Doubtful Accounts', type: 'ASSET', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-1200', code: '1200', name: 'Prepaid Reinsurance Premium', type: 'ASSET', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-2010', code: '2010', name: 'Due to Carrier', type: 'LIABILITY', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: 'Texas § 4053' },
  { id: 'acc-2020', code: '2020', name: 'Broker Commission Payable', type: 'LIABILITY', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: 'Texas § 4053' },
  { id: 'acc-2100', code: '2100', name: 'Return Premium Payable', type: 'LIABILITY', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: 'Texas § 4053' },
  { id: 'acc-2190', code: '2190', name: 'Unapplied Cash', type: 'LIABILITY', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-2200', code: '2200', name: 'Unearned Premium Reserve (UPR - ASC 944)', type: 'LIABILITY', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-2500', code: '2500', name: 'Loss Reserves', type: 'LIABILITY', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-3000', code: '3000', name: 'Equity', type: 'EQUITY', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-4000', code: '4000', name: 'Earned Premium Revenue', type: 'REVENUE', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-4100', code: '4100', name: 'Policy Fee Income', type: 'REVENUE', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-4200', code: '4200', name: 'MGA Commission Income', type: 'REVENUE', normal: 'CREDIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-5000', code: '5000', name: 'General & Administrative Expense', type: 'EXPENSE', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-5010', code: '5010', name: 'Commission Expense - Retail Agent', type: 'EXPENSE', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-5020', code: '5020', name: 'Bad Debt Expense', type: 'EXPENSE', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null },
  { id: 'acc-5030', code: '5030', name: 'Merchant Processing & Banking Fees', type: 'EXPENSE', normal: 'DEBIT', debit_activity: 0, credit_activity: 0, balance: 0, compliance_tag: null }
];

export const INITIAL_COUNTERPARTIES = [
  {
    _id: 'cp-001',
    party_id: 'cp-001',
    legal_name: 'Summit Mutual Insurance Company',
    party_name: 'Summit Mutual Insurance Company',
    party_type: 'ORGANIZATION',
    roles: ['CARRIER'],
    tax_identifier: '74-1234567',
    jurisdiction_code: 'TX',
    fiduciary_compliance_status: 'COMPLIANT',
    status: 'ACTIVE'
  },
  {
    _id: 'cp-002',
    party_id: 'cp-002',
    legal_name: 'Brightline Risk Services LLC',
    party_name: 'Brightline Risk Services LLC',
    party_type: 'ORGANIZATION',
    roles: ['BROKER'],
    tax_identifier: '74-9876543',
    jurisdiction_code: 'TX',
    fiduciary_compliance_status: 'COMPLIANT',
    status: 'ACTIVE'
  },
  {
    _id: 'cp-003',
    party_id: 'cp-003',
    legal_name: 'Lone Pine Trucking LLC',
    party_name: 'Lone Pine Trucking LLC',
    party_type: 'ORGANIZATION',
    roles: ['INSURED'],
    tax_identifier: '75-4567890',
    jurisdiction_code: 'TX',
    fiduciary_compliance_status: 'COMPLIANT',
    status: 'ACTIVE'
  },
  {
    _id: 'cp-004',
    party_id: 'cp-004',
    legal_name: 'Imperial PFS Corporation',
    party_name: 'Imperial PFS Corporation',
    party_type: 'ORGANIZATION',
    roles: ['FINANCE_COMPANY'],
    tax_identifier: '43-1122334',
    jurisdiction_code: 'TX',
    fiduciary_compliance_status: 'COMPLIANT',
    status: 'ACTIVE'
  }
];

export const INITIAL_BILLING_ACCOUNTS = [
  {
    _id: 'ba-001',
    account_number: 'BA-INSURED-LONEPINE',
    customer_name: 'Lone Pine Trucking LLC',
    payer_party_id: { _id: 'cp-003', party_name: 'Lone Pine Trucking LLC' },
    bill_type: 'DIRECT_BILL',
    default_billing_plan_id: { _id: 'bp-4pay', plan_code: '4-Pay 25% Down' },
    currency_code: 'USD',
    ar_balance: 0.00,
    unapplied_cash: 0.00,
    status: 'ACTIVE'
  }
];

export const INITIAL_BILLING_PLANS = [
  {
    _id: 'bp-4pay',
    billing_plan_id: 'bp-4pay',
    plan_code: '4-Pay 25% Down',
    description: 'Commercial Auto 4-Pay plan: 25% down payment + 3 quarterly installments',
    installment_count: 4,
    down_payment_pct: 25,
    installment_fee: 0,
    split_method: 'PRO_RATA',
    is_active: true,
    status: 'ACTIVE'
  }
];

export const INITIAL_SCHEDULES = [
  {
    _id: 'sch-001',
    installment_id: 'sch-001',
    installment_no: 1,
    is_down_payment: true,
    policy_number: 'POL-TX-8821',
    billing_account_id: 'ba-001',
    customer_name: 'Lone Pine Trucking LLC',
    due_date: '2026-01-07',
    premium: 9412.50,
    fee: 150.00,
    total_due: 9562.50,
    status: 'SCHEDULED', // SCHEDULED, BILLED, PAID
    invoice_id: null,
    invoice_number: null
  },
  {
    _id: 'sch-002',
    installment_id: 'sch-002',
    installment_no: 2,
    is_down_payment: false,
    policy_number: 'POL-TX-8821',
    billing_account_id: 'ba-001',
    customer_name: 'Lone Pine Trucking LLC',
    due_date: '2026-04-07',
    premium: 9412.50,
    fee: 0.00,
    total_due: 9412.50,
    status: 'SCHEDULED',
    invoice_id: null,
    invoice_number: null
  },
  {
    _id: 'sch-003',
    installment_id: 'sch-003',
    installment_no: 3,
    is_down_payment: false,
    policy_number: 'POL-TX-8821',
    billing_account_id: 'ba-001',
    customer_name: 'Lone Pine Trucking LLC',
    due_date: '2026-07-07',
    premium: 9412.50,
    fee: 0.00,
    total_due: 9412.50,
    status: 'SCHEDULED',
    invoice_id: null,
    invoice_number: null
  },
  {
    _id: 'sch-004',
    installment_id: 'sch-004',
    installment_no: 4,
    is_down_payment: false,
    policy_number: 'POL-TX-8821',
    billing_account_id: 'ba-001',
    customer_name: 'Lone Pine Trucking LLC',
    due_date: '2026-10-07',
    premium: 9412.50,
    fee: 0.00,
    total_due: 9412.50,
    status: 'SCHEDULED',
    invoice_id: null,
    invoice_number: null
  }
];

export const INITIAL_POLICY_SNAPSHOTS = [
  {
    _id: 'snp-001',
    billing_policy_snapshot_id: 'SNP-POL-TX-8821',
    policy_number: 'POL-TX-8821',
    version_no: 1,
    line_of_business: 'Commercial Auto Fleet',
    insured_name: 'Lone Pine Trucking LLC',
    carrier_name: 'Summit Mutual Insurance Company',
    effective_from: '2026-01-01',
    effective_to: '2027-01-01',
    total_premium: 37650.00,
    charges: 150.00,
    taxes: 0.00,
    currency_code: 'USD',
    status: 'BOUND'
  }
];

export const INITIAL_TRANSACTION_SNAPSHOTS = [
  {
    _id: 'tx-snp-001',
    billing_transaction_snapshot_id: 'TX-SNAP-001',
    billing_policy_snapshot_id: 'SNP-POL-TX-8821',
    transaction_type: 'NEW_BUSINESS',
    effective_date: '2026-01-01',
    premium_change: 37650.00,
    charges: 150.00,
    taxes: 0.00,
    currency_code: 'USD'
  }
];

export const INITIAL_FINANCE_AGREEMENTS = [
  {
    _id: 'pfa-001',
    agreement_number: 'PFA-2026-0001',
    billing_account_id: { _id: 'ba-001', customer_name: 'Lone Pine Trucking LLC', account_number: 'BA-INSURED-LONEPINE' },
    finance_company_party_id: { _id: 'cp-004', party_name: 'Imperial PFS Corporation' },
    amount_financed: 28237.50,
    down_payment: 9412.50,
    interest_rate: 6.25,
    power_of_attorney_to_cancel: true,
    notice_of_intent_date: '2026-01-15',
    cancellation_request_date: null,
    status: 'ACTIVE',
    effective_from: '2026-01-01',
    effective_to: '2027-01-01'
  }
];

export const INITIAL_FISCAL_PERIODS = [
  { _id: 'fp-2026-01', period_name: '2026-01 (Jan 2026)', start_date: '2026-01-01', end_date: '2026-01-31', status: 'OPEN', is_locked: false },
  { _id: 'fp-2026-02', period_name: '2026-02 (Feb 2026)', start_date: '2026-02-01', end_date: '2026-02-28', status: 'OPEN', is_locked: false },
  { _id: 'fp-2026-03', period_name: '2026-03 (Mar 2026)', start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN', is_locked: false },
  { _id: 'fp-2026-04', period_name: '2026-04 (Apr 2026)', start_date: '2026-04-01', end_date: '2026-04-30', status: 'OPEN', is_locked: false }
];

export const INITIAL_POSTING_RULES = [
  {
    _id: 'rule-01',
    rule_code: 'RULE_INV_ISSUE',
    rule_name: 'Customer Installment Invoice Issuance',
    event_type: 'billing.invoice.issued',
    status: 'ACTIVE',
    description: 'Debits Premium Receivable (1100) and credits UPR Liability (2200) + Policy Fee Income (4100).',
    debit_account: '1100',
    credit_account: '2200'
  },
  {
    _id: 'rule-02',
    rule_code: 'RULE_PMT_RECEIVED',
    rule_name: 'Customer Premium Cash Receipt Waterfall',
    event_type: 'billing.payment.received',
    status: 'ACTIVE',
    description: 'Texas § 4053 Fiduciary deposit into Trust Bank (1010), clears AR (1100), provisions Carrier Net (2010), Broker Comm (2020), MGA Income (4200).',
    debit_account: '1010',
    credit_account: '1100'
  },
  {
    _id: 'rule-03',
    rule_code: 'RULE_COMMISSION_ALLOCATED',
    rule_name: 'Broker & MGA Commission Allocation',
    event_type: 'commission.split.allocated',
    status: 'ACTIVE',
    description: 'Provisions broker commission payable and recognizes earned managing general agency fee revenue.',
    debit_account: '2200',
    credit_account: '2020'
  },
  {
    _id: 'rule-04',
    rule_code: 'RULE_ADJ_APPLIED',
    rule_name: 'Customer AR Adjustment or Fee Waiver',
    event_type: 'billing.adjustment.applied',
    status: 'ACTIVE',
    description: 'Applies credit memo, fee waiver, or bad debt write-off against customer balance.',
    debit_account: '5020',
    credit_account: '1100'
  }
];

export const INITIAL_CHECKLIST_STEPS = [
  { step_no: 1, step_code: 'SUBLEDGER_RECON', title: 'AR & AP Subledger to General Ledger Reconciliation', status: 'PENDING', completed_at: null },
  { step_no: 2, step_code: 'BANK_RECON', title: 'Fiduciary Trust Account (Texas § 4053) 2-Pane Bank Reconciliation', status: 'PENDING', completed_at: null },
  { step_no: 3, step_code: 'UPR_AMORTIZATION', title: 'ASC 944 Unearned Premium Reserve Amortization to Earned Revenue', status: 'PENDING', completed_at: null },
  { step_no: 4, step_code: 'LOSS_RESERVES', title: 'Actuarial Loss Reserves & IBNR Certification', status: 'PENDING', completed_at: null },
  { step_no: 5, step_code: 'DEPRECIATION', title: 'Fixed Assets Depreciation & Prepaid Reinsurance Amortization', status: 'PENDING', completed_at: null },
  { step_no: 6, step_code: 'TRIAL_BALANCE_CERT', title: 'Trial Balance Balance Certification ($Dr = $Cr)', status: 'PENDING', completed_at: null },
  { step_no: 7, step_code: 'PERIOD_HARD_LOCK', title: 'Hard Period Accounting Lock & Financial Statements Release', status: 'PENDING', completed_at: null }
];
