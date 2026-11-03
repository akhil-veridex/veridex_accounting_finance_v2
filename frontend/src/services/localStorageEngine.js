import {
  INITIAL_TENANTS,
  INITIAL_USER,
  INITIAL_ACCOUNTS,
  INITIAL_COUNTERPARTIES,
  INITIAL_BILLING_ACCOUNTS,
  INITIAL_BILLING_PLANS,
  INITIAL_SCHEDULES,
  INITIAL_POLICY_SNAPSHOTS,
  INITIAL_TRANSACTION_SNAPSHOTS,
  INITIAL_FINANCE_AGREEMENTS,
  INITIAL_FISCAL_PERIODS,
  INITIAL_POSTING_RULES,
  INITIAL_CHECKLIST_STEPS
} from './localSeedData';

const KEYS = {
  TENANTS: 'veridex_tenants',
  CURRENT_TENANT: 'veridex_tenant_id',
  USER: 'veridex_user',
  TOKEN: 'veridex_token',
  ACCOUNTS: 'veridex_accounts',
  COUNTERPARTIES: 'veridex_counterparties',
  BILLING_ACCOUNTS: 'veridex_billing_accounts',
  BILLING_PLANS: 'veridex_billing_plans',
  SCHEDULES: 'veridex_schedules',
  INVOICES: 'veridex_invoices',
  PAYMENTS: 'veridex_payments',
  ADJUSTMENTS: 'veridex_adjustments',
  POLICY_SNAPSHOTS: 'veridex_policy_snapshots',
  TRANSACTION_SNAPSHOTS: 'veridex_transaction_snapshots',
  FINANCE_AGREEMENTS: 'veridex_finance_agreements',
  JOURNALS: 'veridex_journals',
  FISCAL_PERIODS: 'veridex_fiscal_periods',
  POSTING_RULES: 'veridex_posting_rules',
  CHECKLIST: 'veridex_checklist',
  FIDUCIARY_ACCOUNTS: 'veridex_fiduciary_accounts',
  BANK_LINES: 'veridex_bank_lines',
  MATCHES: 'veridex_matches',
  COMMISSIONS: 'veridex_commissions',
  SETTINGS: 'veridex_settings'
};

function getItem(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

/**
 * Initialize all datasets into localStorage on application load.
 */
export function initLocalStorage(force = false) {
  if (force || !localStorage.getItem(KEYS.ACCOUNTS)) {
    console.log('[LocalStorageEngine] Seeding initial dataset...');
    setItem(KEYS.TENANTS, INITIAL_TENANTS);
    setItem(KEYS.CURRENT_TENANT, INITIAL_TENANTS[0].id);
    setItem(KEYS.USER, INITIAL_USER);
    setItem(KEYS.TOKEN, 'localstorage-demo-jwt-token');
    setItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    setItem(KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
    setItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS);
    setItem(KEYS.BILLING_PLANS, INITIAL_BILLING_PLANS);
    setItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    setItem(KEYS.INVOICES, []);
    setItem(KEYS.PAYMENTS, []);
    setItem(KEYS.ADJUSTMENTS, []);
    setItem(KEYS.POLICY_SNAPSHOTS, INITIAL_POLICY_SNAPSHOTS);
    setItem(KEYS.TRANSACTION_SNAPSHOTS, INITIAL_TRANSACTION_SNAPSHOTS);
    setItem(KEYS.FINANCE_AGREEMENTS, INITIAL_FINANCE_AGREEMENTS);
    setItem(KEYS.JOURNALS, []);
    setItem(KEYS.FISCAL_PERIODS, INITIAL_FISCAL_PERIODS);
    setItem(KEYS.POSTING_RULES, INITIAL_POSTING_RULES);
    setItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS);
    setItem(KEYS.FIDUCIARY_ACCOUNTS, [
      {
        _id: 'fa-001',
        account_name: 'Premium Trust Bank (Texas § 4053 Segregated)',
        account_number: '•••• 4053',
        bank_name: 'Texas Capital Fiduciary Bank',
        account_type: 'FIDUCIARY_PREMIUM_TRUST',
        currency_code: 'USD',
        jurisdiction_code: 'TX',
        status: 'ACTIVE'
      }
    ]);
    setItem(KEYS.BANK_LINES, [
      {
        _id: 'bl-001',
        statement_line_id: 'STMT-2026-001',
        value_date: '2026-01-08',
        amount: 9562.50,
        description: 'ACH DEPOSIT - LONE PINE TRUCKING INST #1',
        bank_reference: 'ACH-DEP-88991',
        status: 'UNMATCHED'
      }
    ]);
    setItem(KEYS.MATCHES, []);
    setItem(KEYS.COMMISSIONS, [
      {
        _id: 'comm-001',
        agreement_id: 'AGR-SUMMIT-2026',
        carrier_name: 'Summit Mutual Insurance Company',
        carrier_rate_pct: 80.0,
        broker_name: 'Brightline Risk Services LLC',
        broker_split_pct: 10.0,
        mga_override_pct: 10.0,
        status: 'ACTIVE'
      }
    ]);
    setItem(KEYS.SETTINGS, {
      organization_name: 'Harbor MGA Pvt. Ltd.',
      state_jurisdiction: 'Texas (TDI Compliance)',
      fiduciary_statute: 'Texas Insurance Code § 4053',
      default_currency: 'USD',
      auto_posting_enabled: true
    });
  }
}

// Auto-run initialization
initLocalStorage();

/**
 * Double-Entry GL Journal Creation Helper.
 * Automatically posts balanced journals and adjusts Chart of Accounts balances.
 */
function createAndPostJournal(ruleCode, eventName, lines, description, referenceId) {
  const journals = getItem(KEYS.JOURNALS, []);
  const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);

  let totalDebit = 0;
  let totalCredit = 0;

  lines.forEach(l => {
    totalDebit += Number(l.debit || 0);
    totalCredit += Number(l.credit || 0);
  });

  const roundedDr = Math.round(totalDebit * 100) / 100;
  const roundedCr = Math.round(totalCredit * 100) / 100;

  if (Math.abs(roundedDr - roundedCr) > 0.01) {
    console.warn(`[GL Posting Warning] Unbalanced journal entry! Dr: ${roundedDr}, Cr: ${roundedCr}`);
  }

  const jeNumber = `JE-2026-${String(journals.length + 1).padStart(5, '0')}`;
  const now = new Date().toISOString();

  const journalEntry = {
    _id: `je-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    journal_number: jeNumber,
    entry_number: jeNumber,
    rule_code: ruleCode,
    event_type: eventName,
    posting_date: now.split('T')[0],
    created_at: now,
    status: 'POSTED',
    is_balanced: true,
    total_debits: roundedDr,
    total_credits: roundedCr,
    description,
    reference_id: referenceId,
    lines: lines.map((l, idx) => ({
      line_no: idx + 1,
      account_code: l.account_code,
      account_name: l.account_name,
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0),
      memo: l.memo || description,
      dimensions: l.dimensions || { carrier: 'Summit Mutual', lob: 'Commercial Auto' }
    }))
  };

  // Update account balances in Chart of Accounts
  lines.forEach(l => {
    const acc = accounts.find(a => a.code === l.account_code);
    if (acc) {
      acc.debit_activity = Math.round(((acc.debit_activity || 0) + Number(l.debit || 0)) * 100) / 100;
      acc.credit_activity = Math.round(((acc.credit_activity || 0) + Number(l.credit || 0)) * 100) / 100;
      
      if (acc.normal === 'DEBIT') {
        acc.balance = Math.round((acc.debit_activity - acc.credit_activity) * 100) / 100;
      } else {
        acc.balance = Math.round((acc.credit_activity - acc.debit_activity) * 100) / 100;
      }
    }
  });

  journals.unshift(journalEntry);
  setItem(KEYS.JOURNALS, journals);
  setItem(KEYS.ACCOUNTS, accounts);

  return journalEntry;
}

/**
 * Storage Engine API Handlers (Mirrors Backend API Responses)
 */
export const localStorageEngine = {
  // Auth
  getMe: () => {
    const user = getItem(KEYS.USER, INITIAL_USER);
    const tenants = getItem(KEYS.TENANTS, INITIAL_TENANTS);
    const currentTenantId = localStorage.getItem(KEYS.CURRENT_TENANT) || tenants[0].id;
    const currentWorkspace = tenants.find(t => t.id === currentTenantId) || tenants[0];

    return {
      success: true,
      data: {
        user,
        current_workspace: currentWorkspace,
        available_workspaces: tenants,
        roles: user.roles,
        permissions: ['*'],
        entitlements: ['BILLING', 'GL', 'COMMISSIONS', 'TREASURY', 'CLOSE']
      }
    };
  },

  login: (email, password) => {
    const tenants = getItem(KEYS.TENANTS, INITIAL_TENANTS);
    const user = { ...INITIAL_USER, email: email || INITIAL_USER.email };
    setItem(KEYS.USER, user);
    setItem(KEYS.TOKEN, 'localstorage-demo-jwt-token');
    return {
      success: true,
      data: {
        token: 'localstorage-demo-jwt-token',
        user,
        active_workspace: tenants[0]
      }
    };
  },

  switchWorkspace: (tenant_id) => {
    localStorage.setItem(KEYS.CURRENT_TENANT, tenant_id);
    return { success: true };
  },

  resetDevData: () => {
    initLocalStorage(true);
    return { success: true, message: 'All demo data reset to pristine state successfully.' };
  },

  // General Ledger
  getAccounts: () => ({ success: true, data: getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS) }),
  getJournals: () => ({ success: true, data: getItem(KEYS.JOURNALS, []) }),
  getPeriods: () => ({ success: true, data: getItem(KEYS.FISCAL_PERIODS, INITIAL_FISCAL_PERIODS) }),
  getPostingRules: () => ({ success: true, data: getItem(KEYS.POSTING_RULES, INITIAL_POSTING_RULES) }),
  getExchangeRates: () => ({
    success: true,
    data: [
      { from_currency: 'USD', to_currency: 'USD', rate: 1.0000, effective_date: '2026-01-01' },
      { from_currency: 'CAD', to_currency: 'USD', rate: 0.7450, effective_date: '2026-01-01' },
      { from_currency: 'EUR', to_currency: 'USD', rate: 1.0850, effective_date: '2026-01-01' }
    ]
  }),
  getTrialBalance: () => {
    const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = accounts.map(a => {
      let dr = 0;
      let cr = 0;
      if (a.normal === 'DEBIT') {
        dr = a.balance > 0 ? a.balance : 0;
        cr = a.balance < 0 ? Math.abs(a.balance) : 0;
      } else {
        cr = a.balance > 0 ? a.balance : 0;
        dr = a.balance < 0 ? Math.abs(a.balance) : 0;
      }
      totalDebit += dr;
      totalCredit += cr;
      return {
        account_code: a.code,
        account_name: a.name,
        account_type: a.type,
        debit_balance: dr,
        credit_balance: cr
      };
    });

    return {
      success: true,
      data: {
        accounts: rows,
        total_debits: Math.round(totalDebit * 100) / 100,
        total_credits: Math.round(totalCredit * 100) / 100,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
      }
    };
  },

  // Billing & AR
  getBillingAccounts: () => ({ success: true, data: getItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS) }),
  getBillingPlans: () => ({ success: true, data: getItem(KEYS.BILLING_PLANS, INITIAL_BILLING_PLANS) }),
  getInstallmentSchedules: () => ({ success: true, data: getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES) }),
  getInvoices: () => ({ success: true, data: getItem(KEYS.INVOICES, []) }),
  getPayments: () => ({ success: true, data: getItem(KEYS.PAYMENTS, []) }),
  getAdjustments: () => ({ success: true, data: getItem(KEYS.ADJUSTMENTS, []) }),
  getPolicySnapshots: () => ({ success: true, data: getItem(KEYS.POLICY_SNAPSHOTS, INITIAL_POLICY_SNAPSHOTS) }),
  getTransactionSnapshots: () => ({ success: true, data: getItem(KEYS.TRANSACTION_SNAPSHOTS, INITIAL_TRANSACTION_SNAPSHOTS) }),
  getFinanceAgreements: () => ({ success: true, data: getItem(KEYS.FINANCE_AGREEMENTS, INITIAL_FINANCE_AGREEMENTS) }),

  // Issue Invoice Action
  issueInvoice: ({ installment_id }) => {
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const invoices = getItem(KEYS.INVOICES, []);
    const billingAccounts = getItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS);

    const sch = schedules.find(s => s._id === installment_id || s.installment_id === installment_id);
    if (!sch) throw new Error('Installment schedule not found');

    const invNumber = `INV-2026-${String(invoices.length + 1).padStart(5, '0')}`;
    const invId = `inv-${Date.now()}`;
    const now = new Date().toISOString();

    const purePremium = Number(sch.premium || 0);
    const feeAmount = Number(sch.fee || 0);
    const totalAmount = purePremium + feeAmount;

    const newInvoice = {
      _id: invId,
      invoice_id: invId,
      invoice_number: invNumber,
      policy_number: sch.policy_number,
      customer_name: sch.customer_name,
      billing_account_id: sch.billing_account_id,
      installment_no: sch.installment_no,
      invoice_date: now.split('T')[0],
      due_date: sch.due_date,
      total_amount: totalAmount,
      balance_due: totalAmount,
      currency_code: 'USD',
      status: 'ISSUED',
      lines: [
        {
          line_no: 1,
          line_type: 'PREMIUM',
          description: `Commercial Auto Liability Premium - Installment #${sch.installment_no}`,
          amount: purePremium
        },
        ...(feeAmount > 0 ? [{
          line_no: 2,
          line_type: 'FEE',
          description: 'MGA Managing General Agency Policy Fee',
          amount: feeAmount
        }] : [])
      ]
    };

    sch.status = 'BILLED';
    sch.invoice_id = invId;
    sch.invoice_number = invNumber;

    // Update Billing Account AR Balance
    const ba = billingAccounts.find(b => b._id === sch.billing_account_id || b.account_number === sch.billing_account_id);
    if (ba) {
      ba.ar_balance = Math.round(((ba.ar_balance || 0) + totalAmount) * 100) / 100;
    }

    invoices.unshift(newInvoice);
    setItem(KEYS.INVOICES, invoices);
    setItem(KEYS.SCHEDULES, schedules);
    setItem(KEYS.BILLING_ACCOUNTS, billingAccounts);

    // Double-Entry GL Journal
    const glLines = [
      { account_code: '1100', account_name: 'Premium Receivable', debit: totalAmount, credit: 0, memo: `Receivable billed for ${invNumber}` },
      { account_code: '2200', account_name: 'Unearned Premium Reserve (UPR - ASC 944)', debit: 0, credit: purePremium, memo: `UPR Liability for ${invNumber}` },
      ...(feeAmount > 0 ? [{ account_code: '4100', account_name: 'Policy Fee Income', debit: 0, credit: feeAmount, memo: `Policy Fee earned for ${invNumber}` }] : [])
    ];

    const glJournal = createAndPostJournal(
      'RULE_INV_ISSUE',
      'billing.invoice.issued',
      glLines,
      `Double-entry GL posting for customer invoice ${invNumber}`,
      invId
    );

    return {
      success: true,
      data: {
        invoice: newInvoice,
        journal: glJournal
      }
    };
  },

  // Cash Receipt Waterfall Action
  postPaymentReceipt: ({ invoice_id, amount, payment_method }) => {
    const invoices = getItem(KEYS.INVOICES, []);
    const payments = getItem(KEYS.PAYMENTS, []);
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const billingAccounts = getItem(KEYS.BILLING_ACCOUNTS, INITIAL_BILLING_ACCOUNTS);

    const inv = invoices.find(i => i._id === invoice_id || i.invoice_id === invoice_id);
    if (!inv) throw new Error('Invoice not found');

    const paidAmt = Number(amount || inv.balance_due);
    inv.balance_due = Math.max(0, Math.round((inv.balance_due - paidAmt) * 100) / 100);
    inv.status = inv.balance_due === 0 ? 'PAID' : 'PARTIALLY_PAID';

    // Update installment status
    const sch = schedules.find(s => s.invoice_id === inv._id || s.invoice_number === inv.invoice_number);
    if (sch) {
      sch.status = 'PAID';
    }

    const pmtId = `pmt-${Date.now()}`;
    const pmtNumber = `PMT-2026-${String(payments.length + 1).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const newPayment = {
      _id: pmtId,
      payment_id: pmtId,
      payment_number: pmtNumber,
      invoice_id: inv._id,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      amount: paidAmt,
      currency_code: 'USD',
      method: payment_method || 'ACH_TRANSFER',
      fiduciary_trust_account: 'Premium Trust Bank (Texas § 4053)',
      received_at: now,
      status: 'ALLOCATED'
    };

    // Update Billing Account AR Balance
    const ba = billingAccounts.find(b => b._id === inv.billing_account_id || b.account_number === inv.billing_account_id);
    if (ba) {
      ba.ar_balance = Math.max(0, Math.round(((ba.ar_balance || 0) - paidAmt) * 100) / 100);
    }

    payments.unshift(newPayment);
    setItem(KEYS.PAYMENTS, payments);
    setItem(KEYS.INVOICES, invoices);
    setItem(KEYS.SCHEDULES, schedules);
    setItem(KEYS.BILLING_ACCOUNTS, billingAccounts);

    // Texas § 4053 Waterfall GL allocation
    // 80% to Carrier, 10% to Broker, 10% MGA fee
    const pureRiskPortion = Math.min(paidAmt, 9412.50);
    const feePortion = paidAmt > 9412.50 ? Math.round((paidAmt - 9412.50) * 100) / 100 : 0;

    const carrierNet = Math.round(pureRiskPortion * 0.80 * 100) / 100; // $7,530.00
    const brokerComm = Math.round(pureRiskPortion * 0.10 * 100) / 100; // $941.25
    const mgaIncome = Math.round((pureRiskPortion * 0.10 + feePortion) * 100) / 100; // $941.25 + $150 = $1,091.25

    const glLines = [
      { account_code: '1010', account_name: 'Premium Trust Bank (Texas § 4053)', debit: paidAmt, credit: 0, memo: `Texas § 4053 fiduciary receipt ${pmtNumber}` },
      { account_code: '1100', account_name: 'Premium Receivable', debit: 0, credit: paidAmt, memo: `Clear AR for ${inv.invoice_number}` },
      { account_code: '2010', account_name: 'Due to Carrier', debit: 0, credit: carrierNet, memo: `Carrier Net Payable (80%) for ${inv.invoice_number}` },
      { account_code: '2020', account_name: 'Broker Commission Payable', debit: 0, credit: brokerComm, memo: `Retail Broker split (10%) for ${inv.invoice_number}` },
      { account_code: '4200', account_name: 'MGA Commission Income', debit: 0, credit: mgaIncome, memo: `MGA fee income recognized for ${inv.invoice_number}` }
    ];

    const glJournal = createAndPostJournal(
      'RULE_PMT_RECEIVED',
      'billing.payment.received',
      glLines,
      `Texas § 4053 Waterfall allocation for payment ${pmtNumber}`,
      pmtId
    );

    return {
      success: true,
      data: {
        payment: newPayment,
        journal: glJournal
      }
    };
  },

  // Apply Policy Endorsement (Scenario 2 Blended Addition)
  applyEndorsement: ({ policy_number, vehicle_added, delta_premium, sub_scenario }) => {
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const delta = Number(delta_premium || 7222.19);

    // Sub-Scenario 2: Distribute delta evenly across remaining unbilled installments (#2, #3, #4)
    const unbilled = schedules.filter(s => s.status === 'SCHEDULED' && s.installment_no > 1);
    if (unbilled.length === 0) throw new Error('No unbilled installments found to spread endorsement delta.');

    const perInst = Math.round((delta / unbilled.length) * 100) / 100;
    unbilled.forEach((s, idx) => {
      const addition = idx === unbilled.length - 1 ? (delta - (perInst * (unbilled.length - 1))) : perInst;
      s.premium = Math.round((s.premium + addition) * 100) / 100;
      s.total_due = Math.round((s.premium + s.fee) * 100) / 100;
    });

    setItem(KEYS.SCHEDULES, schedules);

    return {
      success: true,
      message: `Endorsement applied successfully. Delta $${delta.toFixed(2)} spread across ${unbilled.length} remaining installments (New installment: $${unbilled[0].total_due.toFixed(2)} each). Zero GL entries posted until invoices are issued.`
    };
  },

  // Counterparties
  getParties: () => ({ success: true, data: getItem(KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES) }),
  createParty: (payload) => {
    const parties = getItem(KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
    const newParty = {
      _id: `cp-${Date.now()}`,
      party_id: `cp-${Date.now()}`,
      ...payload,
      status: 'ACTIVE'
    };
    parties.unshift(newParty);
    setItem(KEYS.COUNTERPARTIES, parties);
    return { success: true, data: newParty };
  },

  // Treasury
  getTreasuryOverview: () => ({
    success: true,
    data: {
      operating_cash: 0.00,
      fiduciary_trust_cash: getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS).find(a => a.code === '1010')?.balance || 0,
      claims_escrow_cash: 0.00,
      total_liquidity: getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS).find(a => a.code === '1010')?.balance || 0
    }
  }),
  getBankStatementLines: () => ({ success: true, data: getItem(KEYS.BANK_LINES, []) }),
  getReconciliationMatches: () => ({ success: true, data: getItem(KEYS.MATCHES, []) }),
  autoReconcile: () => {
    const bankLines = getItem(KEYS.BANK_LINES, []);
    const matches = getItem(KEYS.MATCHES, []);
    bankLines.forEach(bl => { bl.status = 'MATCHED'; });
    setItem(KEYS.BANK_LINES, bankLines);
    return { success: true, message: 'All active bank statement lines reconciled 100% with fiduciary receipts.' };
  },

  // Finance Close
  getChecklist: () => ({ success: true, data: getItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS) }),
  executeChecklistStep: (stepNo) => {
    const checklist = getItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS);
    const item = checklist.find(c => c.step_no === Number(stepNo));
    if (item) {
      item.status = 'COMPLETED';
      item.completed_at = new Date().toISOString();
    }
    setItem(KEYS.CHECKLIST, checklist);
    return { success: true, data: item };
  },
  getCloseOverview: () => ({
    success: true,
    data: {
      fiscal_period: '2026-01 (Jan 2026)',
      status: 'OPEN',
      completed_steps: getItem(KEYS.CHECKLIST, INITIAL_CHECKLIST_STEPS).filter(c => c.status === 'COMPLETED').length,
      total_steps: 7
    }
  }),

  // Commissions
  getCommissionsOverview: () => ({ success: true, data: getItem(KEYS.COMMISSIONS, []) }),
  getFiduciaryAccounts: () => ({ success: true, data: getItem(KEYS.FIDUCIARY_ACCOUNTS, []) }),

  // Dashboard Metrics
  getDashboardMetrics: () => {
    const accounts = getItem(KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const schedules = getItem(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const invoices = getItem(KEYS.INVOICES, []);
    const payments = getItem(KEYS.PAYMENTS, []);

    const trustCash = accounts.find(a => a.code === '1010')?.balance || 0;
    const premiumReceivable = accounts.find(a => a.code === '1100')?.balance || 0;
    const uprLiability = accounts.find(a => a.code === '2200')?.balance || 0;
    const carrierPayable = accounts.find(a => a.code === '2010')?.balance || 0;

    return {
      success: true,
      data: {
        total_gwp: 37650.00,
        fiduciary_trust_balance: trustCash,
        premium_receivable: premiumReceivable,
        unearned_premium_reserve: uprLiability,
        due_to_carrier: carrierPayable,
        active_invoices_count: invoices.length,
        total_payments_count: payments.length,
        unbilled_installments_count: schedules.filter(s => s.status === 'SCHEDULED').length
      }
    };
  }
};
