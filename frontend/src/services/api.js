/**
 * LocalStorage API Adapter.
 * Replaces remote backend fetch calls with high-performance localStorage operations.
 * Zero database connection, 100% offline self-contained standalone execution.
 */

import { localStorageEngine, initLocalStorage } from './localStorageEngine';

// Simulated latency helper (0-10ms for instant real-time feel)
const delay = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));

export async function apiRequest(endpoint, { method = 'GET', body = null } = {}) {
  await delay(5);
  return { success: true, data: [] };
}

export const authApi = {
  login: async (email, password) => {
    await delay();
    return localStorageEngine.login(email, password);
  },
  registerTenant: async (payload) => {
    await delay();
    return { success: true, data: payload };
  },
  getMe: async () => {
    await delay();
    return localStorageEngine.getMe();
  },
  logout: async () => {
    await delay();
    localStorage.removeItem('veridex_token');
    return { success: true };
  },
  switchWorkspace: async (tenant_id) => {
    await delay();
    return localStorageEngine.switchWorkspace(tenant_id);
  },
  getTenantUsers: async () => {
    await delay();
    return {
      success: true,
      data: [
        { _id: 'u-1', name: 'Alex Mercer', email: 'alex.controller@harbor-mga.com', role: 'CONTROLLER', status: 'ACTIVE' },
        { _id: 'u-2', name: 'Sarah Jenkins', email: 'sarah.underwriter@harbor-mga.com', role: 'SENIOR_UNDERWRITER', status: 'ACTIVE' },
        { _id: 'u-3', name: 'Emily Watson', email: 'emily.assistant@harbor-mga.com', role: 'UNDERWRITING_ASSISTANT', status: 'ACTIVE' }
      ]
    };
  },
  inviteUser: async (payload) => ({ success: true, data: payload }),
  getModules: async () => ({
    success: true,
    data: [
      { module_code: 'GL', name: 'General Ledger', is_enabled: true },
      { module_code: 'BILLING', name: 'Billing & AR (Module 12)', is_enabled: true },
      { module_code: 'COMMISSIONS', name: 'Commissions & Settlements', is_enabled: true },
      { module_code: 'TREASURY', name: 'Treasury & Bank Reconciliation', is_enabled: true },
      { module_code: 'CLOSE', name: 'Finance Close & Financial Reports', is_enabled: true }
    ]
  }),
  updateModule: async (code, enabled) => ({ success: true }),
  getRoles: async () => ({
    success: true,
    data: [
      { role_code: 'TENANT_ADMIN', role_name: 'Tenant Administrator' },
      { role_code: 'CONTROLLER', role_name: 'Financial Controller' },
      { role_code: 'UNDERWRITER', role_name: 'Underwriter' }
    ]
  }),
  resetDevData: async () => {
    await delay();
    return localStorageEngine.resetDevData();
  },

  // GL Module Endpoints
  getAccounts: async () => {
    await delay();
    return localStorageEngine.getAccounts();
  },
  getAccountDetail: async (id) => {
    await delay();
    const accs = localStorageEngine.getAccounts().data;
    const acc = accs.find(a => a.id === id || a._id === id || a.code === id);
    return { success: true, data: acc || accs[0] };
  },
  createAccount: async (payload) => {
    await delay();
    const accs = localStorageEngine.getAccounts().data;
    const newAcc = { id: `acc-${Date.now()}`, ...payload, debit_activity: 0, credit_activity: 0, balance: 0 };
    accs.push(newAcc);
    localStorage.setItem('veridex_accounts', JSON.stringify(accs));
    return { success: true, data: newAcc };
  },
  updateAccount: async (id, payload) => ({ success: true }),
  getPeriods: async () => {
    await delay();
    return localStorageEngine.getPeriods();
  },
  createPeriod: async (payload) => ({ success: true, data: payload }),
  updatePeriodStatus: async (period_id, status, close_notes) => {
    await delay();
    const periods = localStorageEngine.getPeriods().data;
    const p = periods.find(x => x._id === period_id);
    if (p) {
      p.status = status;
      p.is_locked = status === 'HARD_LOCK';
      localStorage.setItem('veridex_fiscal_periods', JSON.stringify(periods));
    }
    return { success: true, data: p };
  },
  getJournals: async () => {
    await delay();
    return localStorageEngine.getJournals();
  },
  getJournalById: async (id) => {
    await delay();
    const js = localStorageEngine.getJournals().data;
    const j = js.find(x => x._id === id || x.journal_number === id);
    return { success: true, data: j || js[0] };
  },
  postJournal: async (payload) => ({ success: true, data: payload }),
  reverseJournal: async (id) => ({ success: true }),
  getTrialBalance: async () => {
    await delay();
    return localStorageEngine.getTrialBalance();
  },
  getPostingRules: async () => {
    await delay();
    return localStorageEngine.getPostingRules();
  },
  createPostingRule: async (payload) => ({ success: true, data: payload }),
  getExchangeRates: async () => {
    await delay();
    return localStorageEngine.getExchangeRates();
  },
  createExchangeRate: async (payload) => ({ success: true, data: payload }),

  // Billing & AR Endpoints
  getBillingOverview: async () => {
    await delay();
    return localStorageEngine.getDashboardMetrics();
  },
  getBillingAccounts: async () => {
    await delay();
    return localStorageEngine.getBillingAccounts();
  },
  createBillingAccount: async (payload) => ({ success: true, data: payload }),
  getBillingPlans: async () => {
    await delay();
    return localStorageEngine.getBillingPlans();
  },
  createBillingPlan: async (payload) => ({ success: true, data: payload }),
  getBillingPlanById: async (id) => ({ success: true, data: localStorageEngine.getBillingPlans().data[0] }),
  updateBillingPlan: async (id, payload) => ({ success: true }),
  toggleBillingPlanStatus: async (id) => ({ success: true }),
  deleteBillingPlan: async (id) => ({ success: true }),
  seedRules: async () => ({ success: true }),
  generateSchedule: async (payload) => ({ success: true, data: localStorageEngine.getInstallmentSchedules().data }),
  getInstallmentSchedules: async () => {
    await delay();
    return localStorageEngine.getInstallmentSchedules();
  },
  getInvoices: async () => {
    await delay();
    return localStorageEngine.getInvoices();
  },
  getInvoiceDetail: async (id) => {
    await delay();
    const invs = localStorageEngine.getInvoices().data;
    const inv = invs.find(i => i._id === id || i.invoice_id === id);
    return { success: true, data: inv || invs[0] };
  },
  repairGL: async () => ({ success: true }),
  issueInvoice: async (payload) => {
    await delay();
    return localStorageEngine.issueInvoice(payload);
  },
  getPayments: async () => {
    await delay();
    return localStorageEngine.getPayments();
  },
  postPaymentReceipt: async (payload) => {
    await delay();
    return localStorageEngine.postPaymentReceipt(payload);
  },
  getAdjustments: async () => {
    await delay();
    return localStorageEngine.getAdjustments();
  },
  createAdjustment: async (payload) => ({ success: true, data: payload }),
  getPolicySnapshots: async () => {
    await delay();
    return localStorageEngine.getPolicySnapshots();
  },
  getPolicySnapshotDetail: async (id) => ({ success: true, data: localStorageEngine.getPolicySnapshots().data[0] }),
  getTransactionSnapshots: async () => {
    await delay();
    return localStorageEngine.getTransactionSnapshots();
  },
  createPolicySnapshot: async (payload) => ({ success: true, data: payload }),
  createTransactionSnapshot: async (payload) => ({ success: true, data: payload }),
  getFinanceAgreements: async () => {
    await delay();
    return localStorageEngine.getFinanceAgreements();
  },
  createFinanceAgreement: async (payload) => {
    await delay();
    return localStorageEngine.createFinanceAgreement(payload);
  },
  applyEndorsement: async (payload) => {
    await delay();
    return localStorageEngine.applyEndorsement(payload);
  },
  resetEndorsement: async () => ({ success: true }),

  // Treasury Endpoints
  getTreasuryOverview: async () => {
    await delay();
    return localStorageEngine.getTreasuryOverview();
  },
  getMandates: async () => ({ success: true, data: [] }),
  createMandate: async (payload) => ({ success: true, data: payload }),
  updateMandateStatus: async () => ({ success: true }),
  getAttempts: async () => ({ success: true, data: [] }),
  postPaymentAttempt: async (payload) => ({ success: true, data: payload }),
  getProcessorTransactions: async () => ({
    success: true,
    data: [
      { _id: 'pt-001', processor_reference: 'PRC-STRIPE-9901', amount: 9562.50, fee_amount: 15.00, status: 'SETTLED', settled_at: '2026-01-08' }
    ]
  }),
  getBankStatementLines: async () => {
    await delay();
    return localStorageEngine.getBankStatementLines();
  },
  importBankStatement: async (payload) => ({ success: true, data: payload }),
  getReconciliationMatches: async () => {
    await delay();
    return localStorageEngine.getReconciliationMatches();
  },
  autoReconcile: async () => {
    await delay();
    return localStorageEngine.autoReconcile();
  },
  manualMatch: async (payload) => ({ success: true, data: payload }),
  getPaymentReturns: async () => ({ success: true, data: [] }),
  postPaymentReturn: async (payload) => ({ success: true, data: payload }),
  getRefunds: async () => ({ success: true, data: [] }),
  postRefund: async (payload) => ({ success: true, data: payload }),
  getDunningPlans: async () => ({
    success: true,
    data: [{ _id: 'dp-1', plan_code: 'COMMERCIAL_AUTO_STANDARD', grace_days: 10, status: 'ACTIVE' }]
  }),
  getDelinquencyCases: async () => ({ success: true, data: [] }),
  getDunningActions: async () => ({ success: true, data: [] }),
  getCollectionAssignments: async () => ({ success: true, data: [] })
};

export const billingApi = {
  ...authApi
};

export const commissionsApi = {
  getOverview: async () => {
    await delay();
    return localStorageEngine.getCommissionsOverview();
  },
  seedCommissions: async () => ({ success: true }),
  getAgreements: async () => ({
    success: true,
    data: [
      { _id: 'agr-1', agreement_name: 'Summit Mutual Master Distribution', payee_name: 'Brightline Risk Services LLC', status: 'ACTIVE' }
    ]
  }),
  createAgreement: async (payload) => ({ success: true, data: payload }),
  getSchedules: async () => ({
    success: true,
    data: [
      { _id: 'cs-1', lob_code: 'COMMERCIAL_AUTO', rate_pct: 10.0, jurisdiction_code: 'TX', status: 'ACTIVE' }
    ]
  }),
  createSchedule: async (payload) => ({ success: true, data: payload }),
  previewChain: async () => ({
    success: true,
    data: { gross_premium: 37650, carrier_net: 30120, mga_override: 3765, retail_broker: 3765 }
  }),
  getProfitSchedules: async () => ({ success: true, data: [] }),
  createProfitSchedule: async (payload) => ({ success: true, data: payload }),
  getSplits: async () => ({ success: true, data: [] }),
  createSplit: async (payload) => ({ success: true, data: payload }),
  getTransactions: async () => ({ success: true, data: [] }),
  processTransaction: async (payload) => ({ success: true, data: payload }),
  disburseBrokerCommission: async () => ({ success: true }),
  allocateShares: async () => ({ success: true }),
  getFiduciaryAccounts: async () => {
    await delay();
    return localStorageEngine.getFiduciaryAccounts();
  },
  seedFiduciaryAccounts: async () => ({ success: true }),
  createFiduciaryAccount: async (payload) => ({ success: true, data: payload }),
  executeSweep: async () => ({ success: true, message: 'Fiduciary sweep executed. Net carrier payable swept to zero.' }),
  getBordereauDefinitions: async () => ({ success: true, data: [] }),
  getBordereauRuns: async () => ({ success: true, data: [] }),
  generateBordereauRun: async () => ({ success: true, data: {} }),
  transmitBordereauRun: async () => ({ success: true }),
  getBordereauRunLines: async () => ({ success: true, data: [] }),
  getSettlements: async () => ({ success: true, data: [] }),
  previewSettlement: async () => ({ success: true, data: {} }),
  generateSettlement: async () => ({ success: true, data: {} }),
  disburseSettlement: async () => ({ success: true })
};

export const financeCloseApi = {
  getOverview: async () => {
    await delay();
    return localStorageEngine.getCloseOverview();
  },
  previewUPR: async () => ({
    success: true,
    data: { unearned_premium: 28237.50, earned_premium: 9412.50, calculation_method: 'PRO_RATA_DAILY_365' }
  }),
  runUPR: async () => ({ success: true, message: 'UPR amortization successfully recognized in GL.' }),
  getSubledgerBalances: async () => ({
    success: true,
    data: [
      { subledger_type: 'AR_PREMIUM_RECEIVABLE', subledger_balance: 7222.19, gl_balance: 7222.19, difference: 0.00, status: 'RECONCILED' },
      { subledger_type: 'AP_DUE_TO_CARRIER', subledger_balance: 0.00, gl_balance: 0.00, difference: 0.00, status: 'RECONCILED' }
    ]
  }),
  getReconciliationCases: async () => ({ success: true, data: [] }),
  resolveCase: async () => ({ success: true }),
  getChecklist: async () => {
    await delay();
    return localStorageEngine.getChecklist();
  },
  executeChecklistStep: async (step) => {
    await delay();
    return localStorageEngine.executeChecklistStep(step);
  },
  getTrialBalance: async () => {
    await delay();
    return localStorageEngine.getTrialBalance();
  },
  certifyTrialBalance: async () => ({ success: true, message: 'Trial Balance certified balanced and immutable.' }),
  getFinancialStatements: async () => ({
    success: true,
    data: {
      balance_sheet: {
        assets: 9562.50,
        liabilities: 9562.50,
        equity: 0.00,
        is_balanced: true
      },
      income_statement: {
        earned_premium: 0.00,
        policy_fee_income: 150.00,
        mga_commission: 941.25,
        net_operating_income: 1091.25
      }
    }
  }),
  getExportBatches: async () => ({ success: true, data: [] }),
  createExportBatch: async () => ({ success: true, data: {} }),
  getAdjustments: async () => ({ success: true, data: [] }),
  getDisputes: async () => ({ success: true, data: [] })
};

export const counterpartiesApi = {
  getParties: async () => {
    await delay();
    return localStorageEngine.getParties();
  },
  createParty: async (payload) => {
    await delay();
    return localStorageEngine.createParty(payload);
  },
  getPartyDetail: async (id) => {
    await delay();
    const parties = localStorageEngine.getParties().data;
    const p = parties.find(x => x._id === id || x.party_id === id);
    return { success: true, data: p || parties[0] };
  },
  updateParty: async (id, payload) => ({ success: true }),
  addPartyRole: async () => ({ success: true }),
  seedParties: async () => ({ success: true })
};

export const dashboardApi = {
  getMetrics: async () => {
    await delay();
    return localStorageEngine.getDashboardMetrics();
  }
};

export const settingsApi = {
  getSettings: async () => ({
    success: true,
    data: {
      organization_name: 'Harbor MGA Pvt. Ltd.',
      state_jurisdiction: 'Texas (TDI Compliance)',
      fiduciary_statute: 'Texas Insurance Code § 4053',
      default_currency: 'USD',
      auto_posting_enabled: true
    }
  }),
  updateSettings: async (payload) => ({ success: true, data: payload })
};

export const eventsApi = {
  getEvents: async () => ({
    success: true,
    data: [
      { _id: 'ev-1', event_code: 'billing.invoice.issued', name: 'Customer Invoice Issued', status: 'ACTIVE' },
      { _id: 'ev-2', event_code: 'billing.payment.received', name: 'Customer Cash Received', status: 'ACTIVE' },
      { _id: 'ev-3', event_code: 'commission.split.allocated', name: 'Commission Allocated', status: 'ACTIVE' },
      { _id: 'ev-4', event_code: 'billing.adjustment.applied', name: 'Billing Adjustment Applied', status: 'ACTIVE' }
    ]
  }),
  getEventById: async () => ({ success: true, data: {} }),
  createEvent: async (payload) => ({ success: true, data: payload }),
  addVersion: async () => ({ success: true }),
  validatePayload: async () => ({ success: true, valid: true }),
  updateStatus: async () => ({ success: true })
};

export const rulesApi = {
  getRules: async () => {
    await delay();
    return localStorageEngine.getPostingRules();
  },
  getRuleById: async () => ({ success: true, data: {} }),
  createRule: async (payload) => ({ success: true, data: payload }),
  updateRule: async () => ({ success: true }),
  forkRule: async () => ({ success: true }),
  validateRule: async () => ({ success: true }),
  publishRule: async () => ({ success: true }),
  retireRule: async () => ({ success: true }),
  reactivateRule: async () => ({ success: true }),
  deleteRule: async () => ({ success: true }),
  simulate: async () => ({ success: true, balanced: true }),
  postSimulated: async () => ({ success: true }),
  seedRules: async () => ({ success: true })
};

export const ruleTestsApi = {
  getTestCases: async () => ({ success: true, data: [] }),
  createTestCase: async (payload) => ({ success: true, data: payload }),
  runTestCase: async () => ({ success: true, passed: true })
};

export const configBundleApi = {
  exportBundle: async () => ({ success: true, bundle_json: '{}' }),
  previewBundle: async () => ({ success: true }),
  importBundle: async () => ({ success: true })
};

export const eventPipelineApi = {
  getStats: async () => ({ success: true, data: { processed: 142, failed: 0, pending: 0 } }),
  getOutbox: async () => ({ success: true, data: [] }),
  retryOutbox: async () => ({ success: true }),
  replayOutbox: async () => ({ success: true }),
  getInbox: async () => ({ success: true, data: [] }),
  retryInbox: async () => ({ success: true }),
  replayInbox: async () => ({ success: true }),
  triggerDispatch: async () => ({ success: true }),
  getTrace: async () => ({ success: true, data: {} }),
  getSubscriptions: async () => ({ success: true, data: [] }),
  upsertSubscription: async () => ({ success: true }),
  toggleSubscription: async () => ({ success: true })
};

export const dimensionsApi = {
  getDimensions: async () => ({
    success: true,
    data: [
      { _id: 'dim-1', code: 'carrier_name', name: 'Insurance Carrier', is_required: true },
      { _id: 'dim-2', code: 'line_of_business', name: 'Line of Business', is_required: true },
      { _id: 'dim-3', code: 'jurisdiction', name: 'State / Jurisdiction', is_required: true },
      { _id: 'dim-4', code: 'policy_number', name: 'Policy Reference', is_required: false }
    ]
  }),
  getDimensionContext: async () => ({ success: true, data: {} }),
  createDimension: async (payload) => ({ success: true, data: payload }),
  updateDimension: async () => ({ success: true }),
  deleteDimension: async () => ({ success: true })
};
