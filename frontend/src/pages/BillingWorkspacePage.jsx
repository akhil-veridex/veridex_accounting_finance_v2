import React, { useState, useEffect } from 'react';
import { authApi, counterpartiesApi, rulesApi } from '../services/api';
import {
  Receipt,
  CreditCard,
  Calendar,
  FileText,
  DollarSign,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  Sliders,
  Layers,
  Clock,
  ArrowRight,
  Database,
  ShieldCheck,
  FileSpreadsheet,
  Code,
  ExternalLink,
  Hash,
  Info,
  Edit2,
  Trash2,
  Power,
  Sparkles
} from 'lucide-react';
import ModalClose from '../components/ModalClose';

export default function BillingWorkspacePage({ section, onSectionChange }) {
  // `section` is driven by the sidebar; without it the page shows its own tab bar.
  const [subtab, setSubtab] = useState(section || 'overview'); // 'overview' | 'schedules' | 'invoices' | 'snapshots' | 'payments' | 'accounts' | 'plans' | 'adjustments'
  useEffect(() => { if (section) { setSubtab(section); setSuccess(null); setError(null); } }, [section]);
  // Keep the sidebar highlight in step when the page itself jumps to another section
  useEffect(() => { if (section && subtab !== section) onSectionChange?.(subtab); }, [subtab]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Data states
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [publishedRules, setPublishedRules] = useState([]);
  const [selectedInvoiceRuleId, setSelectedInvoiceRuleId] = useState('');
  const [selectedPaymentRuleId, setSelectedPaymentRuleId] = useState('');

  // Module 35 & 12 Standalone Snapshot & Premium Finance states
  const [snapshots, setSnapshots] = useState([]);
  const [transactionSnapshots, setTransactionSnapshots] = useState([]);
  const [financeAgreements, setFinanceAgreements] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [showNewSnapshotModal, setShowNewSnapshotModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [snapshotViewMode, setSnapshotViewMode] = useState('POLICIES'); // 'POLICIES' | 'TRANSACTIONS' | 'FINANCE'

  const invoiceRules = publishedRules.filter((r) => r.event_code === 'billing.invoice.issued');
  const paymentRules = publishedRules.filter((r) => r.event_code === 'billing.payment.received');
  const activeInvoiceRule = invoiceRules.find((r) => r._id === (selectedInvoiceRuleId || invoiceRules[0]?._id)) || invoiceRules[0];
  const activePaymentRule = paymentRules.find((r) => r._id === (selectedPaymentRuleId || paymentRules[0]?._id)) || paymentRules[0];

  // Modals & Detail
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showGenerateScheduleModal, setShowGenerateScheduleModal] = useState(false);
  const [showIssueInvoiceModal, setShowIssueInvoiceModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showEndorsementModal, setShowEndorsementModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [endorsementForm, setEndorsementForm] = useState({
    billing_account_id: '',
    policy_number: 'POL-TX-8821',
    endorsement_number: 'END-2026-00001',
    vehicle_id: 'TRUCK-T5',
    effective_date: '2026-09-01',
    annual_rate: '8700.00',
    active_days: 303,
    delta_premium: '7222.19',
    billing_option: 'SPREAD_INSTALLMENTS' // 'SPREAD_INSTALLMENTS' | 'STANDALONE_INVOICE'
  });

  // Form states
  const [newAccount, setNewAccount] = useState({
    account_number: '',
    customer_name: '',
    customer_email: '',
    billing_plan_id: '',
    payer_party_id: '',
    bill_type: 'DIRECT_BILL',
    currency_code: 'USD'
  });
  const [newPlan, setNewPlan] = useState({ plan_code: '', plan_name: '', installment_count: 4, down_payment_pct: 25, installment_fee: 0, interval_months: 3 });
  const [editPlan, setEditPlan] = useState({ _id: '', plan_code: '', plan_name: '', description: '', installment_count: 4, down_payment_pct: 25, installment_fee: 0, interval_months: 3, status: 'ACTIVE' });
  const [scheduleForm, setScheduleForm] = useState({
    billing_account_id: '',
    policy_id: 'POL-TX-8821',
    policy_number: 'POL-TX-8821',
    total_premium: '37650.00',
    policy_fee: '150.00',
    billing_plan_code: '4_PAY_25_DOWN',
    effective_date: '2026-07-01'
  });
  const [invoiceForm, setInvoiceForm] = useState({
    billing_account_id: '',
    policy_id: 'POL-TX-8821',
    installment_number: 1,
    invoice_date: '2026-07-01',
    premium_amount: '9412.50',
    fee_amount: '150.00'
  });
  const [paymentForm, setPaymentForm] = useState({
    billing_account_id: '',
    amount: '9562.50',
    payment_method: 'ACH',
    reference_number: 'WF-TX-ACH-9912',
    is_fiduciary: true,
    target_invoice_id: ''
  });

  const openInvoicesForAccount = invoices.filter(
    (i) =>
      (i.billing_account_id?._id === paymentForm.billing_account_id ||
        i.billing_account_id === paymentForm.billing_account_id) &&
      ['ISSUED', 'PARTIALLY_PAID'].includes(i.status) &&
      Number(i.balance_due) > 0
  );
  const [adjustmentForm, setAdjustmentForm] = useState({
    billing_account_id: '',
    adjustment_type: 'FEE_WAIVER',
    amount: '150.00',
    reason_code: 'BROKER_RELATIONSHIP',
    reason_description: 'Courtesy fee waiver for Lone Pine Trucking'
  });

  const [newSnapshotForm, setNewSnapshotForm] = useState({
    policy_number: 'POL-TX-9902',
    source_entity_id: 'POL-TX-9902',
    source_version: 'v1.0',
    effective_date: '2026-07-01',
    expiration_date: '2027-07-01',
    line_of_business: 'COMMERCIAL_AUTO',
    total_premium: '45000.00',
    total_fees: '250.00',
    total_taxes: '0.00',
    status: 'BOUND',
    payer_party_id: '',
    insured_party_id: '',
    carrier_party_id: ''
  });

  const [newFinanceForm, setNewFinanceForm] = useState({
    billing_account_id: '',
    finance_company_party_id: '',
    agreement_number: 'PFA-TX-2026-001',
    amount_financed: '28237.50',
    down_payment: '9412.50',
    interest_rate: '8.50',
    notes: 'Imperial PFS Texas Commercial Auto Financing'
  });

  const formatMoney = (val) => {
    if (val === null || val === undefined) return '0.00';
    if (typeof val === 'object' && val.$numberDecimal) return Number(val.$numberDecimal).toFixed(2);
    const n = Number(val);
    return isNaN(n) ? '0.00' : n.toFixed(2);
  };

  const handleOpenInvoiceForSchedule = (sched) => {
    const accId =
      sched.billing_account_id?._id ||
      sched.billing_account_id ||
      (accounts[0] ? accounts[0]._id : '');
    const prem = sched.premium_amount?.$numberDecimal || sched.premium_amount || '9412.50';
    const fee = sched.fee_amount?.$numberDecimal || sched.fee_amount || (sched.installment_number === 1 ? '150.00' : '0.00');
    setInvoiceForm({
      billing_account_id: accId,
      policy_id: sched.policy_id || 'POL-TX-8821',
      installment_number: sched.installment_number || 1,
      invoice_date: sched.due_date ? new Date(sched.due_date).toISOString().split('T')[0] : '2026-07-01',
      premium_amount: String(prem),
      fee_amount: String(fee)
    });
    setShowIssueInvoiceModal(true);
  };

  useEffect(() => {
    if (accounts.length > 0) {
      setScheduleForm((prev) => (prev.billing_account_id ? prev : { ...prev, billing_account_id: accounts[0]._id }));
      setInvoiceForm((prev) => (prev.billing_account_id ? prev : { ...prev, billing_account_id: accounts[0]._id }));
      setPaymentForm((prev) => (prev.billing_account_id ? prev : { ...prev, billing_account_id: accounts[0]._id }));
      setAdjustmentForm((prev) => (prev.billing_account_id ? prev : { ...prev, billing_account_id: accounts[0]._id }));
      setNewFinanceForm((prev) => (prev.billing_account_id ? prev : { ...prev, billing_account_id: accounts[0]._id }));
    }
  }, [accounts]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rulesRes = await rulesApi.getRules('?status=PUBLISHED').catch(() => ({ data: [] }));
      const activeRules = rulesRes.data || [];
      setPublishedRules(activeRules);

      if (subtab === 'overview') {
        const [res, accRes, cpRes, schRes, snapRes, finRes, plansRes] = await Promise.all([
          authApi.getBillingOverview(),
          authApi.getBillingAccounts(),
          counterpartiesApi.getParties().catch(() => ({ data: [] })),
          authApi.getInstallmentSchedules().catch(() => ({ data: [] })),
          authApi.getPolicySnapshots().catch(() => ({ data: [] })),
          authApi.getFinanceAgreements().catch(() => ({ data: [] })),
          authApi.getBillingPlans().catch(() => ({ data: [] }))
        ]);
        setOverview(res.data);
        setAccounts(accRes.data || []);
        setCounterparties(cpRes.data || []);
        setSchedules(schRes.data || []);
        setSnapshots(snapRes.data || []);
        setFinanceAgreements(finRes.data || []);
        setPlans(plansRes.data || []);
      } else if (subtab === 'schedules') {
        const [schRes, accRes, snapRes] = await Promise.all([
          authApi.getInstallmentSchedules().catch(() => ({ data: [] })),
          authApi.getBillingAccounts().catch(() => ({ data: [] })),
          authApi.getPolicySnapshots().catch(() => ({ data: [] }))
        ]);
        setSchedules(schRes.data || []);
        setAccounts(accRes.data || []);
        setSnapshots(snapRes.data || []);
      } else if (subtab === 'snapshots') {
        const [snapRes, txRes, finRes, accRes, cpRes] = await Promise.all([
          authApi.getPolicySnapshots().catch(() => ({ data: [] })),
          authApi.getTransactionSnapshots().catch(() => ({ data: [] })),
          authApi.getFinanceAgreements().catch(() => ({ data: [] })),
          authApi.getBillingAccounts().catch(() => ({ data: [] })),
          counterpartiesApi.getParties().catch(() => ({ data: [] }))
        ]);
        setSnapshots(snapRes.data || []);
        setTransactionSnapshots(txRes.data || []);
        setFinanceAgreements(finRes.data || []);
        setAccounts(accRes.data || []);
        setCounterparties(cpRes.data || []);
      } else if (subtab === 'accounts') {
        const [res, cpRes, plansRes] = await Promise.all([
          authApi.getBillingAccounts(),
          counterpartiesApi.getParties().catch(() => ({ data: [] })),
          authApi.getBillingPlans().catch(() => ({ data: [] }))
        ]);
        setAccounts(res.data);
        setCounterparties(cpRes.data || []);
        setPlans(plansRes.data || []);
      } else if (subtab === 'plans') {
        const res = await authApi.getBillingPlans();
        setPlans(res.data);
      } else if (subtab === 'invoices') {
        const [res, accRes, cpRes, schRes] = await Promise.all([
          authApi.getInvoices(),
          authApi.getBillingAccounts(),
          counterpartiesApi.getParties().catch(() => ({ data: [] })),
          authApi.getInstallmentSchedules().catch(() => ({ data: [] }))
        ]);
        setInvoices(res.data);
        setAccounts(accRes.data || []);
        setCounterparties(cpRes.data || []);
        setSchedules(schRes.data || []);
      } else if (subtab === 'payments') {
        const [res, accRes] = await Promise.all([
          authApi.getPayments(),
          authApi.getBillingAccounts()
        ]);
        setPayments(res.data);
        setAccounts(accRes.data || []);
      } else if (subtab === 'adjustments') {
        const res = await authApi.getAdjustments();
        setAdjustments(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subtab]);

  // Handle Account Create
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await authApi.createBillingAccount(newAccount);
      setSuccess('Billing account created successfully with linked billing plan and payer party');
      setShowNewAccountModal(false);
      setNewAccount({
        account_number: '',
        customer_name: '',
        customer_email: '',
        billing_plan_id: plans[0]?._id || '',
        payer_party_id: '',
        bill_type: 'DIRECT_BILL',
        currency_code: 'USD'
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Plan Create
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await authApi.createBillingPlan(newPlan);
      setSuccess(`Billing plan "${newPlan.plan_name}" created successfully`);
      setShowNewPlanModal(false);
      setNewPlan({ plan_code: '', plan_name: '', installment_count: 4, down_payment_pct: 25, installment_fee: 0, interval_months: 3 });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Plan Update
  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    try {
      await authApi.updateBillingPlan(editPlan._id, {
        plan_name: editPlan.plan_name,
        description: editPlan.description,
        installment_count: Number(editPlan.installment_count),
        down_payment_pct: Number(editPlan.down_payment_pct),
        installment_fee: Number(editPlan.installment_fee),
        interval_months: Number(editPlan.interval_months),
        status: editPlan.status
      });
      setSuccess(`Billing plan "${editPlan.plan_name}" updated successfully`);
      setShowEditPlanModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Plan Status Toggle (Active <-> Inactive)
  const handleTogglePlanStatus = async (planId) => {
    try {
      const res = await authApi.toggleBillingPlanStatus(planId);
      setSuccess(res.message || 'Billing plan status updated');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Plan Delete
  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete billing plan "${planName}"?`)) return;
    try {
      const res = await authApi.deleteBillingPlan(planId);
      setSuccess(res.message || 'Billing plan deleted successfully');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Seed Posting Rules (Auto-Seed 12 Master Insurance Rules)
  const handleSeedPostingRules = async () => {
    try {
      setLoading(true);
      const res = await rulesApi.seedRules();
      setSuccess(res.message || 'Master insurance posting rules seeded successfully');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Policy Snapshot Ingestion (Module 35)
  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    try {
      await authApi.createPolicySnapshot(newSnapshotForm);
      setSuccess(`Policy snapshot for ${newSnapshotForm.policy_number} ingested successfully into decoupled standalone billing`);
      setShowNewSnapshotModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Premium Finance Agreement Registration (Module 12)
  const handleCreateFinanceAgreement = async (e) => {
    e.preventDefault();
    try {
      await authApi.createFinanceAgreement(newFinanceForm);
      setSuccess(`Premium Finance Agreement ${newFinanceForm.agreement_number} registered successfully`);
      setShowFinanceModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Generate Schedule
  const handleGenerateSchedule = async (e) => {
    e.preventDefault();
    try {
      await authApi.generateSchedule(scheduleForm);
      setSuccess('Policy bound & 4-pay installment schedule generated successfully! Review scheduled installments below.');
      setShowGenerateScheduleModal(false);
      setSubtab('schedules');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Apply Endorsement (Scenario 2: Truck T5 Pro-Rata Delta $7,222.19)
  const handleApplyEndorsement = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authApi.applyEndorsement({
        ...endorsementForm,
        billing_account_id: endorsementForm.billing_account_id || (accounts[0] ? accounts[0]._id : undefined)
      });
      const optDesc = endorsementForm.billing_option === 'SPREAD_INSTALLMENTS'
        ? 'Sub-Scenario 2 (Option B: Spread +$2,407.40 across remaining installments -> $11,819.90 each)'
        : 'Sub-Scenario 1 (Option A: Separate Single Invoice for $7,222.19)';
      setSuccess(`Scenario 2 Endorsement applied successfully via ${optDesc}! GL Journal posted: Dr 1100 AR $7,222.19 / Cr 2200 UPR $7,222.19.`);
      setShowEndorsementModal(false);
      setSubtab('schedules');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Endorsement (Practice & Re-testing Helper)
  const handleResetEndorsement = async () => {
    if (!window.confirm('Reset policy POL-TX-8821 back to pre-endorsement 4-pay schedule ($9,412.50 each)? This allows you to practice the other sub-scenario.')) return;
    try {
      setLoading(true);
      const res = await authApi.resetEndorsement({ policy_number: endorsementForm.policy_number || 'POL-TX-8821' });
      setSuccess(res.message || 'Endorsement reset successfully. You can now test Option A or Option B again!');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Issue Invoice
  const handleIssueInvoice = async (e) => {
    e.preventDefault();
    try {
      const lines = [
        {
          line_type: 'PREMIUM',
          description: `Commercial Auto Premium Installment #${invoiceForm.installment_number}`,
          amount: invoiceForm.premium_amount,
          ledger_account_code: '2200'
        }
      ];
      if (Number(invoiceForm.fee_amount) > 0) {
        lines.push({
          line_type: 'FEE',
          description: 'Policy Issuance Fee',
          amount: invoiceForm.fee_amount,
          ledger_account_code: '4100'
        });
      }

      await authApi.issueInvoice({
        billing_account_id: invoiceForm.billing_account_id,
        policy_id: invoiceForm.policy_id,
        installment_number: invoiceForm.installment_number,
        invoice_date: invoiceForm.invoice_date,
        lines
      });
      setSuccess('Invoice issued & GL posted (Dr 1100 AR / Cr 2200 UPR & 4100 Fee)');
      setShowIssueInvoiceModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await authApi.postPaymentReceipt(paymentForm);
      setSuccess('Payment captured, waterfall allocated, and GL journal posted (Dr 1010 / Cr 1100)');
      setShowRecordPaymentModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Adjustment
  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    try {
      await authApi.createAdjustment(adjustmentForm);
      setSuccess('Billing adjustment applied and posted to GL');
      setShowAdjustmentModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // View Invoice Detail Modal
  const viewInvoiceDetail = async (id) => {
    try {
      const res = await authApi.getInvoiceDetail(id);
      setSelectedInvoice(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Billing & Accounts Receivable</h1>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-medium">
              Module 12 • Real AR Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Installment schedules, invoices, waterfall cash allocation, Texas § 4053 fiduciary receipts, and GL synchronization.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* Posting Rules Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-slate-200">GL Posting Rules Engine:</span>
          {publishedRules.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{publishedRules.length} Active Rules Linked</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>0 Rules Seeded (Required for GL Journal Entries)</span>
            </span>
          )}
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            (RULE_INV_ISSUE, RULE_PMT_RECEIVED, RULE_COMMISSION_ALLOCATED, RULE_ADJ_APPLIED, etc.)
          </span>
        </div>
        <button
          onClick={handleSeedPostingRules}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/40 rounded text-xs font-semibold transition"
          title="Seed master double-entry posting rules into tenant database"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>{publishedRules.length === 0 ? '⚡ Auto-Seed Master Posting Rules' : '⚡ Sync / Re-Seed Master Rules'}</span>
        </button>
      </div>

      {/* Navigation Subtabs */}
      <div className={`flex border-b border-slate-800 space-x-1 ${section ? 'hidden' : ''}`}>
        {[
          { id: 'overview', label: 'AR Overview', icon: Layers },
          { id: 'schedules', label: `Installment Schedules ${schedules.length > 0 ? `(${schedules.length})` : ''}`, icon: Calendar },
          { id: 'invoices', label: 'Invoices & Lines', icon: FileText },
          { id: 'snapshots', label: `Policy Snapshots & References ${snapshots.length > 0 ? `(${snapshots.length})` : ''}`, icon: Database },
          { id: 'payments', label: 'Payments & Waterfall', icon: DollarSign },
          { id: 'accounts', label: 'Billing Accounts', icon: CreditCard },
          { id: 'plans', label: 'Billing Plans (4-Pay)', icon: Sliders },
          { id: 'adjustments', label: 'Adjustments & Waivers', icon: Receipt }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subtab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSubtab(tab.id);
                setSuccess(null);
                setError(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                isActive
                  ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: AR OVERVIEW */}
      {subtab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
              <div className="text-[11px] text-slate-400 uppercase font-mono">Total Invoiced (Gross AR)</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                ${overview ? overview.totalBilled : '0.00'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Billed to customers</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
              <div className="text-[11px] text-amber-400 uppercase font-mono">Outstanding Receivable</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                ${overview ? overview.totalOutstanding : '0.00'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Unpaid customer balance</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
              <div className="text-[11px] text-emerald-400 uppercase font-mono">Total Cash Collected</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                ${overview ? overview.totalPaid : '0.00'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Allocated to open invoices</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
              <div className="text-[11px] text-purple-400 uppercase font-mono">Unapplied Cash (Suspense)</div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                ${overview ? overview.totalUnapplied : '0.00'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">GL Account 2190</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Policy Lifecycle Quick Actions</h3>
            <p className="text-xs text-slate-400">
              Execute standard commercial policy billing actions: generate installment schedules, issue deposit invoices, and record fiduciary premium cash receipts.
            </p>
            <div className="space-y-3 pt-2">
              {/* Billing workflow steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowGenerateScheduleModal(true)}
                  className="w-full px-3.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-transparent shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>1. Bind Policy & Generate 4-Pay Schedule</span>
                </button>
                <button
                  onClick={() => setShowIssueInvoiceModal(true)}
                  className="w-full px-3.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-transparent shadow-sm transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>2. Issue Deposit Invoice</span>
                </button>
                <button
                  onClick={() => setShowRecordPaymentModal(true)}
                  className="w-full px-3.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-transparent shadow-sm transition"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>3. Capture Cash & Waterfall Allocate</span>
                </button>
              </div>

              {/* Related views and scenarios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setSubtab('schedules')}
                  className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-700 transition"
                >
                  <Calendar className="w-3.5 h-3.5 text-brand-400" />
                  <span>View Installment Schedules {schedules.length > 0 ? `(${schedules.length})` : ''}</span>
                </button>
                <button
                  onClick={() => setShowEndorsementModal(true)}
                  className="w-full px-3.5 py-2.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-brand-500/30 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scenario 2: Policy Endorsement (Truck T5)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: INSTALLMENT SCHEDULES */}
      {subtab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Policy Installment Schedules (4-Pay Lifecycle)</h3>
              <p className="text-xs text-slate-400">
                Payment plans generated upon policy binding. Issue invoices against scheduled installments when due.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowGenerateScheduleModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bind Policy & Schedule</span>
              </button>
              <button
                onClick={() => setShowEndorsementModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold shadow transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Apply Policy Endorsement (Scenario 2)</span>
              </button>
              <button
                onClick={handleResetEndorsement}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-xs border border-slate-700 transition"
                title="Reset to Base Policy (Pre-Endorsement)"
              >
                Reset Endorsement
              </button>
              <button
                onClick={loadData}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                title="Refresh Schedules"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Stats Banner if schedules exist */}
          {schedules.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Total Scheduled Plan</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  ${schedules.reduce((acc, s) => acc + Number(formatMoney(s.total_amount)), 0).toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500">{schedules.length} Installments</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-[10px] text-amber-400 uppercase font-mono">Pending Invoicing</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {schedules.filter((s) => s.status === 'SCHEDULED').length} Installments
                </div>
                <div className="text-[10px] text-slate-500">Awaiting invoice issuance</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-[10px] text-emerald-400 uppercase font-mono">Invoiced / Billed</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {schedules.filter((s) => s.status === 'BILLED' || s.status === 'PAID').length} Installments
                </div>
                <div className="text-[10px] text-slate-500">Converted to AR invoice</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-[10px] text-blue-400 uppercase font-mono">Deposit (#1) Status</div>
                <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                  {schedules[0] ? schedules[0].status : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500">25% Down + $150 Fee</div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Installment</th>
                  <th className="p-3">Policy Number</th>
                  <th className="p-3">Customer / Account</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Premium</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Total Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Invoice Link</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-slate-500 font-sans space-y-2">
                      <div>No installment schedules generated yet.</div>
                      <div className="text-xs text-slate-600">
                        Click "1. Bind Policy & Generate 4-Pay Schedule" in AR Overview to create the payment plan.
                      </div>
                    </td>
                  </tr>
                ) : (
                  schedules.map((sched) => {
                    const isDeposit = sched.installment_number === 1;
                    const isBilled = sched.status === 'BILLED' || sched.invoice_id;
                    return (
                      <tr key={sched._id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white">#{sched.installment_number}</span>
                            {isDeposit && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-brand-500/20 text-brand-300 rounded font-sans border border-brand-500/30">
                                Down Payment
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">
                          <div>{sched.policy_number || sched.policy_id}</div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {sched.billing_policy_snapshot_id && (
                              <span
                                className="px-1.5 py-0.2 text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono"
                                title="Module 35 BillingPolicySnapshot Reference (Physical ERD v4.6 Page 14/37)"
                              >
                                Snap: {String(sched.billing_policy_snapshot_id).slice(-8)}
                              </span>
                            )}
                            {sched.billing_transaction_snapshot_id && (
                              <span
                                className="px-1.5 py-0.2 text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono"
                                title="Module 35 BillingTransactionSnapshot Reference"
                              >
                                Tx: {String(sched.billing_transaction_snapshot_id).slice(-8)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-sans text-slate-300">
                          {sched.billing_account_id ? sched.billing_account_id.customer_name : 'Lone Pine Trucking LLC'}
                        </td>
                        <td className="p-3 text-slate-400">
                          {new Date(sched.due_date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-200">
                          <div>${formatMoney(sched.premium_amount)}</div>
                          {sched.dimensions?.endorsement_delta && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-sans">
                              +T5 Delta: +${sched.dimensions.endorsement_delta}
                            </span>
                          )}
                          {sched.dimensions?.standalone_endorsement && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-sans">
                              Standalone T5 Endorsement
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">${formatMoney(sched.fee_amount)}</td>
                        <td className="p-3 text-white font-bold">${formatMoney(sched.total_amount)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              sched.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : sched.status === 'BILLED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {sched.status === 'SCHEDULED' ? 'SCHEDULED (UNBILLED)' : sched.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">
                          {sched.invoice_id ? (
                            <button
                              onClick={() => setSubtab('invoices')}
                              className="text-brand-400 hover:underline font-mono text-[11px]"
                            >
                              {sched.invoice_id.invoice_number || 'View Invoice'}
                            </button>
                          ) : (
                            <span className="text-slate-500 font-sans text-[11px]">Not yet issued</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!isBilled ? (
                            <button
                              onClick={() => handleOpenInvoiceForSchedule(sched)}
                              className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[11px] font-sans inline-flex items-center space-x-1 font-semibold transition"
                            >
                              <FileText className="w-3 h-3" />
                              <span>⚡ Issue Invoice</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSubtab('invoices')}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans inline-flex items-center space-x-1 transition"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View in Invoices</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES */}
      {subtab === 'invoices' && (
        <div className="space-y-4">
          {/* Informative helper banner when schedules exist but no invoices issued yet */}
          {invoices.length === 0 && schedules.length > 0 && (
            <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-brand-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-brand-300">
                    {schedules.length} Active Installment Schedules Ready for Billing
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Your 4-pay schedule was generated. Installment #1 (${formatMoney(schedules[0].total_amount)}) is pending invoice issuance.
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSubtab('schedules')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition"
                >
                  View All Schedules
                </button>
                <button
                  onClick={() => handleOpenInvoiceForSchedule(schedules[0])}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Issue Invoice for Installment #1 (${formatMoney(schedules[0].total_amount)})</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Itemized customer billing invoices with double-entry general ledger synchronization.
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowEndorsementModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold shadow transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Apply Policy Endorsement (Scenario 2)</span>
              </button>
              <button
                onClick={() => setShowIssueInvoiceModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Customer Invoice</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Balance Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">GL Journal</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 font-sans space-y-2">
                      <div className="text-sm font-medium text-slate-300">No invoices issued yet.</div>
                      {schedules.length > 0 ? (
                        <div className="text-xs text-brand-400">
                          {schedules.length} installment schedules are active. Click "Issue Invoice for Installment #1" above to generate the first bill.
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          Click "Issue New Invoice" to issue a direct invoice or generate an installment schedule first.
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3 font-semibold text-white">{inv.invoice_number}</td>
                      <td className="p-3 font-sans text-slate-300">
                        {inv.billing_account_id ? inv.billing_account_id.customer_name : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-400">{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td className="p-3 text-white font-semibold">${inv.total_amount}</td>
                      <td className="p-3 text-emerald-400">${inv.amount_paid}</td>
                      <td className="p-3 text-amber-400 font-semibold">${inv.balance_due}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {inv.journal_id ? inv.journal_id.journal_number : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => viewInvoiceDetail(inv._id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Lines</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: POLICY SNAPSHOTS & REFERENCES (MODULE 35 & MODULE 12) */}
      {subtab === 'snapshots' && (
        <div className="space-y-4">
          {/* Architectural Info Banner */}
          <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="text-sm font-bold text-white tracking-wide">
                  Standalone Operation: Snapshots & External References (Module 35 / Module 12)
                </span>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-mono rounded border border-purple-500/30">
                  Physical ERD v4.6 Page 14 & 37
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNewSnapshotModal(true)}
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ingest Policy Snapshot</span>
                </button>
                <button
                  onClick={() => setShowFinanceModal(true)}
                  className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Finance Agreement</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              In Veridex One v4.6 architecture, the <strong>Billing module operates standalone and fully decoupled</strong> from Policy Administration (PAS). 
              Rather than maintaining physical foreign keys directly to PAS tables, Billing ingests immutable <code>BillingPolicySnapshot</code> and <code>BillingTransactionSnapshot</code> events. 
              Accounts and installment schedules link via <code>billing_policy_snapshot_id</code> and <code>billing_transaction_snapshot_id</code>, supporting both internal PAS feeds and external core systems (Applied Epic, Guidewire).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] text-purple-400 uppercase font-mono">Bound Policy Snapshots</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {snapshots.length} Snapshots
              </div>
              <div className="text-[10px] text-slate-500">Module 35 Immutable Store</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] text-emerald-400 uppercase font-mono">Total Premium Under Snapshot</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                ${snapshots.reduce((acc, s) => acc + Number(formatMoney(s.total_premium)), 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">Gross Bound Commercial Premium</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] text-blue-400 uppercase font-mono">Underwriting Tx Deltas</div>
              <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">
                {transactionSnapshots.length} Transactions
              </div>
              <div className="text-[10px] text-slate-500">New Business, Endorsements & Audits</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] text-amber-400 uppercase font-mono">Premium Finance Agreements</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {financeAgreements.length} Active
              </div>
              <div className="text-[10px] text-slate-500">Module 12 Third-Party Financing</div>
            </div>
          </div>

          {/* Submode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setSnapshotViewMode('POLICIES')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  snapshotViewMode === 'POLICIES'
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Policy Snapshots ({snapshots.length})</span>
              </button>
              <button
                onClick={() => setSnapshotViewMode('TRANSACTIONS')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  snapshotViewMode === 'TRANSACTIONS'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Transaction Snapshots ({transactionSnapshots.length})</span>
              </button>
              <button
                onClick={() => setSnapshotViewMode('FINANCE')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  snapshotViewMode === 'FINANCE'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Premium Finance Agreements ({financeAgreements.length})</span>
              </button>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center space-x-1 transition"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* VIEW 1: POLICY SNAPSHOTS */}
          {snapshotViewMode === 'POLICIES' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Snapshot ID</th>
                    <th className="p-3">Policy Number</th>
                    <th className="p-3">Version & LOB</th>
                    <th className="p-3">Insured / Payer</th>
                    <th className="p-3">Carrier</th>
                    <th className="p-3">Policy Term</th>
                    <th className="p-3">Total Premium</th>
                    <th className="p-3">Fees & Taxes</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Payload JSON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {snapshots.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-500 font-sans space-y-2">
                        <div>No policy snapshots ingested yet.</div>
                        <div className="text-xs text-slate-600">
                          Binding a policy schedule automatically provisions a versioned Policy Snapshot and Transaction Snapshot.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    snapshots.map((snap) => (
                      <tr key={snap._id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3 font-mono font-semibold text-purple-400">
                          {snap.billing_policy_snapshot_id || snap._id}
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div>{snap.policy_number}</div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Src: {snap.source_entity_id || snap.policy_number}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] mr-1">
                            {snap.source_version || 'v1.0'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            {snap.line_of_business || 'COMMERCIAL_AUTO'}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-slate-300">
                          <div>{snap.insured_party_id?.party_name || snap.payer_party_id?.party_name || 'Lone Pine Trucking LLC'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {snap.insured_party_id?.party_type || 'INSURED'}
                          </div>
                        </td>
                        <td className="p-3 font-sans text-slate-300">
                          <div>{snap.carrier_party_id?.party_name || 'Texas Mutual Insurance Company'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">CARRIER</div>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          <div>{new Date(snap.effective_date).toLocaleDateString()}</div>
                          <div className="text-slate-500">to {new Date(snap.expiration_date).toLocaleDateString()}</div>
                        </td>
                        <td className="p-3 text-emerald-400 font-bold">
                          ${formatMoney(snap.total_premium)}
                        </td>
                        <td className="p-3 text-slate-400">
                          <div>Fee: ${formatMoney(snap.total_fees)}</div>
                          <div className="text-[10px] text-slate-500">Tax: ${formatMoney(snap.total_taxes)}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {snap.status || 'BOUND'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedSnapshot(snap)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[11px] font-sans inline-flex items-center space-x-1 border border-purple-500/30 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: TRANSACTION SNAPSHOTS */}
          {snapshotViewMode === 'TRANSACTIONS' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Tx Snapshot ID</th>
                    <th className="p-3">Policy Snapshot ID</th>
                    <th className="p-3">Transaction Type</th>
                    <th className="p-3">Effective Date</th>
                    <th className="p-3">Premium Change</th>
                    <th className="p-3">Charges / Fees</th>
                    <th className="p-3">Taxes</th>
                    <th className="p-3">Currency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {transactionSnapshots.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500 font-sans space-y-2">
                        <div>No underwriting transaction snapshots recorded yet.</div>
                        <div className="text-xs text-slate-600">
                          Transaction snapshots track policy additions, endorsements, renewals, and audits.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactionSnapshots.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3 font-semibold text-blue-400">
                          {tx.billing_transaction_snapshot_id || tx._id}
                        </td>
                        <td className="p-3 text-purple-400">
                          {tx.billing_policy_snapshot_id}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {tx.transaction_type || 'NEW_BUSINESS'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">
                          {new Date(tx.effective_date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-emerald-400 font-bold">
                          ${formatMoney(tx.premium_change)}
                        </td>
                        <td className="p-3 text-slate-300">
                          ${formatMoney(tx.charges)}
                        </td>
                        <td className="p-3 text-slate-400">
                          ${formatMoney(tx.taxes)}
                        </td>
                        <td className="p-3 text-slate-400">
                          {tx.currency_code || 'USD'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 3: PREMIUM FINANCE AGREEMENTS */}
          {snapshotViewMode === 'FINANCE' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Agreement #</th>
                    <th className="p-3">Billing Account</th>
                    <th className="p-3">Finance Company Party</th>
                    <th className="p-3">Amount Financed</th>
                    <th className="p-3">Down Payment</th>
                    <th className="p-3">Interest Rate</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {financeAgreements.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500 font-sans space-y-2">
                        <div>No premium finance agreements recorded yet.</div>
                        <div className="text-xs text-slate-600">
                          Click "+ New Finance Agreement" to record a commercial auto financing contract.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    financeAgreements.map((fa) => (
                      <tr key={fa._id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3 font-semibold text-amber-400 font-mono">
                          {fa.agreement_number}
                        </td>
                        <td className="p-3 font-sans text-slate-300">
                          <div>{fa.billing_account_id?.customer_name || 'Lone Pine Trucking LLC'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {fa.billing_account_id?.account_number || 'BA-2026-0001'}
                          </div>
                        </td>
                        <td className="p-3 font-sans text-slate-300">
                          <div>{fa.finance_company_party_id?.party_name || 'Imperial PFS Corporation'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">FINANCE_COMPANY</div>
                        </td>
                        <td className="p-3 text-emerald-400 font-bold font-mono">
                          ${formatMoney(fa.amount_financed)}
                        </td>
                        <td className="p-3 text-slate-300 font-mono">
                          ${formatMoney(fa.down_payment)}
                        </td>
                        <td className="p-3 text-slate-400 font-mono">
                          {formatMoney(fa.interest_rate)}%
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {fa.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-sans text-[11px]">
                          {fa.notes || 'Third-party commercial auto premium financing'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {subtab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Customer payments captured and allocated against open receivable balances.
            </div>
            <button
              onClick={() => setShowRecordPaymentModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Cash Receipt</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Payment Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Allocated Amount</th>
                  <th className="p-3">Unapplied (Suspense)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">GL Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-6 text-center text-slate-500 font-sans">
                      No customer cash receipts recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3 font-semibold text-white">{p.payment_number}</td>
                      <td className="p-3 font-sans text-slate-300">
                        {p.billing_account_id ? p.billing_account_id.customer_name : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-400">{p.payment_method}</td>
                      <td className="p-3 text-slate-400">{p.reference_number || '-'}</td>
                      <td className="p-3 text-white font-semibold">${p.amount}</td>
                      <td className="p-3 text-emerald-400 font-semibold">${p.allocated_amount}</td>
                      <td className="p-3 text-purple-400">${p.unapplied_amount}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {p.journal_id ? p.journal_id.journal_number : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BILLING ACCOUNTS */}
      {subtab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Insured customer billing profiles with current and past-due balance tracking.
            </div>
            <button
              onClick={() => setShowNewAccountModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Billing Account</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Account #</th>
                  <th className="p-3">Customer / Insured</th>
                  <th className="p-3">Payer Party</th>
                  <th className="p-3">Bill Type</th>
                  <th className="p-3">Default Billing Plan</th>
                  <th className="p-3">Currency</th>
                  <th className="p-3">AR Balance</th>
                  <th className="p-3">Unapplied Cash</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-6 text-center text-slate-500 font-sans">
                      No billing accounts found. Click "Create Billing Account" to add one.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => {
                    const planName = acc.billing_plan_id?.plan_name || acc.default_billing_plan_id?.plan_name || '4-Pay 25% Down';
                    const payerName = acc.payer_party_id?.legal_name || acc.payer_party_id?.trade_name || acc.customer_name;
                    const billType = acc.bill_type || 'DIRECT_BILL';
                    const curr = acc.currency_code || acc.currency || 'USD';
                    return (
                      <tr key={acc._id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3 font-semibold text-white">{acc.account_number}</td>
                        <td className="p-3 font-sans text-slate-300 font-medium">{acc.customer_name}</td>
                        <td className="p-3 font-sans text-slate-400">{payerName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            billType === 'AGENCY_BILL'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {billType}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-300 font-sans font-medium flex items-center space-x-1.5">
                            <Sliders className="w-3 h-3 text-brand-400 shrink-0" />
                            <span>{planName}</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{curr}</td>
                        <td className="p-3 text-white font-semibold">${acc.current_balance}</td>
                        <td className="p-3 text-purple-400">${acc.unapplied_cash}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {acc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BILLING PLANS */}
      {subtab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Installment rules (Full Pay, 4-Pay 25% Down, 10-Pay) driving automatic payment schedules. Complete CRUD with live activation status.
            </div>
            <button
              onClick={() => setShowNewPlanModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Billing Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p._id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-white flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-brand-400" />
                      <span>{p.plan_code}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      p.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">{p.plan_name}</h4>
                  <p className="text-xs text-slate-400 min-h-[32px]">{p.description || 'No description provided.'}</p>
                  <div className="pt-2 border-t border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-slate-400">
                    <div>Installments: <span className="text-white font-semibold">{p.installment_count} pay</span></div>
                    <div>Down Pay: <span className="text-white font-semibold">{p.down_payment_pct}%</span></div>
                    <div>Installment Fee: <span className="text-white font-semibold">${p.installment_fee || '0.00'}</span></div>
                    <div>Cadence: <span className="text-white font-semibold">{p.interval_months} mo</span></div>
                  </div>
                </div>

                {/* Plan Action Toolbar (CRUD: Edit, Toggle Status, Delete) */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditPlan({
                        _id: p._id,
                        plan_code: p.plan_code,
                        plan_name: p.plan_name,
                        description: p.description || '',
                        installment_count: p.installment_count || 4,
                        down_payment_pct: p.down_payment_pct !== undefined ? p.down_payment_pct : 25,
                        installment_fee: p.installment_fee !== undefined ? p.installment_fee : 0,
                        interval_months: p.interval_months || 3,
                        status: p.status || 'ACTIVE'
                      });
                      setShowEditPlanModal(true);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition border border-slate-700"
                    title="Edit Billing Plan"
                  >
                    <Edit2 className="w-3 h-3 text-brand-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleTogglePlanStatus(p._id)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition border ${
                      p.status === 'ACTIVE'
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                    title={p.status === 'ACTIVE' ? 'Deactivate this billing plan' : 'Activate this billing plan'}
                  >
                    <Power className="w-3 h-3" />
                    <span>{p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                  </button>

                  <button
                    onClick={() => handleDeletePlan(p._id, p.plan_name)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs transition"
                    title="Delete Billing Plan"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ADJUSTMENTS */}
      {subtab === 'adjustments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Fee waivers, credit memos, and write-offs with audit trails and GL contra-posting.
            </div>
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Adjustment</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Adjustment #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">GL Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-500 font-sans">
                      No adjustments applied yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj._id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3 font-semibold text-white">{adj.adjustment_number}</td>
                      <td className="p-3 font-sans text-slate-300">
                        {adj.billing_account_id ? adj.billing_account_id.customer_name : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-400">{adj.adjustment_type}</td>
                      <td className="p-3 text-white font-semibold">${adj.amount}</td>
                      <td className="p-3 text-slate-400 font-sans">{adj.reason_description || adj.reason_code}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {adj.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {adj.journal_id ? adj.journal_id.journal_number : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Create Billing Account */}
      {showNewAccountModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-brand-400" />
              <span>Create Billing Account (ERD Aligned)</span>
            </h3>
            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              {counterparties.length > 0 && (
                <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg space-y-1.5">
                  <label className="text-brand-300 font-semibold block text-[11px] flex items-center justify-between">
                    <span>🏢 Select Payer Party (Insured / Broker)</span>
                    <span className="text-[10px] text-brand-400 font-mono">Auto-links payer_party_id</span>
                  </label>
                  <select
                    value={newAccount.payer_party_id}
                    onChange={(e) => {
                      const partyId = e.target.value;
                      if (!partyId) {
                        setNewAccount({
                          ...newAccount,
                          payer_party_id: ''
                        });
                        return;
                      }
                      const p = counterparties.find((cp) => cp._id === partyId);
                      if (p) {
                        const cleanCode = (p.party_code || 'BA').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
                        const isBroker = (p.roles || []).some(
                          (r) => (r.role_type || r) === 'BROKER' || (r.role_type || r) === 'AGENCY'
                        );
                        setNewAccount({
                          ...newAccount,
                          payer_party_id: p._id,
                          account_number: newAccount.account_number || `BA-${cleanCode}`,
                          customer_name: p.legal_name || p.trade_name || '',
                          customer_email: p.email || newAccount.customer_email || '',
                          bill_type: isBroker ? 'AGENCY_BILL' : 'DIRECT_BILL'
                        });
                      }
                    }}
                    className="w-full bg-slate-800 border border-brand-500/40 rounded p-1.5 text-white text-xs focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">-- Choose Existing Broker or Insured --</option>
                    {counterparties.map((cp) => {
                      const rolesStr = (cp.roles || []).map((r) => r.role_type || r).join(', ') || 'Counterparty';
                      return (
                        <option key={cp._id} value={cp._id}>
                          {cp.legal_name} [{rolesStr}] ({cp.party_code})
                        </option>
                      );
                    })}
                  </select>
                  <div className="text-[10px] text-slate-400">
                    Links Payer Party ID in background and auto-fills Account details and Bill Type.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BA-001"
                    value={newAccount.account_number}
                    onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Default Billing Plan <span className="text-brand-400 font-mono">(billing_plan_id)</span>
                  </label>
                  <select
                    required
                    value={newAccount.billing_plan_id || (plans[0] ? plans[0]._id : '')}
                    onChange={(e) => setNewAccount({ ...newAccount, billing_plan_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  >
                    <option value="">-- Select Billing Plan --</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.plan_name} ({p.plan_code}) - {p.installment_count} Pay
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Customer / Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pine Cone Brokerage or Lone Pine Trucking LLC"
                  value={newAccount.customer_name}
                  onChange={(e) => setNewAccount({ ...newAccount, customer_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Bill Type <span className="text-brand-400 font-mono">(bill_type)</span>
                  </label>
                  <select
                    value={newAccount.bill_type}
                    onChange={(e) => setNewAccount({ ...newAccount, bill_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="DIRECT_BILL">Direct Bill (Insured)</option>
                    <option value="AGENCY_BILL">Agency Bill (Broker/Agency)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Currency <span className="text-brand-400 font-mono">(currency_code)</span>
                  </label>
                  <select
                    value={newAccount.currency_code}
                    onChange={(e) => setNewAccount({ ...newAccount, currency_code: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Customer Email (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. billing@lonepine.com"
                  value={newAccount.customer_email}
                  onChange={(e) => setNewAccount({ ...newAccount, customer_email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold"
                >
                  Create Account
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowNewAccountModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Create Billing Plan */}
      {showNewPlanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              <span>Create New Billing Plan</span>
            </h3>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Plan Code (Unique Code)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10_PAY_MONTHLY, FULL_PAY, 3_PAY_30_DOWN"
                  value={newPlan.plan_code}
                  onChange={(e) => setNewPlan({ ...newPlan, plan_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10-Pay Monthly Commercial Auto"
                  value={newPlan.plan_name}
                  onChange={(e) => setNewPlan({ ...newPlan, plan_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="e.g. 10 equal monthly installments with $5 fee"
                  value={newPlan.description || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Installments Count</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={newPlan.installment_count}
                    onChange={(e) => setNewPlan({ ...newPlan, installment_count: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Down Payment (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={newPlan.down_payment_pct}
                    onChange={(e) => setNewPlan({ ...newPlan, down_payment_pct: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Installment Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPlan.installment_fee}
                    onChange={(e) => setNewPlan({ ...newPlan, installment_fee: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cadence / Interval (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newPlan.interval_months}
                    onChange={(e) => setNewPlan({ ...newPlan, interval_months: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewPlanModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold"
                >
                  Create Plan
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowNewPlanModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Edit Billing Plan */}
      {showEditPlanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Edit2 className="w-4 h-4 text-brand-400" />
              <span>Edit Billing Plan ({editPlan.plan_code})</span>
            </h3>
            <form onSubmit={handleUpdatePlan} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Plan Code (Locked Identifier)</label>
                <input
                  type="text"
                  disabled
                  value={editPlan.plan_code}
                  className="w-full bg-slate-800/50 border border-slate-750 rounded p-2 text-slate-400 font-mono cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={editPlan.plan_name}
                  onChange={(e) => setEditPlan({ ...editPlan, plan_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  rows="2"
                  value={editPlan.description || ''}
                  onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Installments Count</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={editPlan.installment_count}
                    onChange={(e) => setEditPlan({ ...editPlan, installment_count: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Down Payment (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={editPlan.down_payment_pct}
                    onChange={(e) => setEditPlan({ ...editPlan, down_payment_pct: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPlan.installment_fee}
                    onChange={(e) => setEditPlan({ ...editPlan, installment_fee: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cadence (mo)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={editPlan.interval_months}
                    onChange={(e) => setEditPlan({ ...editPlan, interval_months: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select
                    value={editPlan.status}
                    onChange={(e) => setEditPlan({ ...editPlan, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditPlanModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowEditPlanModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Generate Schedule */}
      {showGenerateScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Bind Policy & Generate 4-Pay Schedule</h3>
            <form onSubmit={handleGenerateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Billing Account</label>
                <select
                  required
                  value={scheduleForm.billing_account_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, billing_account_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">Select Account...</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.customer_name} ({a.account_number})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={scheduleForm.policy_number}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, policy_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Billing Plan</label>
                  <select
                    value={scheduleForm.billing_plan_code}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, billing_plan_code: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="4_PAY_25_DOWN">4-Pay 25% Down</option>
                    <option value="FULL_PAY">Full Pay</option>
                    <option value="10_PAY">10-Pay</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Annual Gross Premium</label>
                  <input
                    type="text"
                    value={scheduleForm.total_premium}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, total_premium: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Policy Fee</label>
                  <input
                    type="text"
                    value={scheduleForm.policy_fee}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, policy_fee: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateScheduleModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold"
                >
                  Generate Schedule
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowGenerateScheduleModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Apply Policy Endorsement (Scenario 2) */}
      {showEndorsementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Apply Policy Endorsement (Scenario 2)</h3>
                  <p className="text-xs text-slate-400">Mid-term fleet vehicle addition (Truck T5 pro-rata delta)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEndorsementModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleApplyEndorsement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Policy Number</label>
                  <input
                    type="text"
                    required
                    value={endorsementForm.policy_number}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, policy_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Endorsement Number</label>
                  <input
                    type="text"
                    required
                    value={endorsementForm.endorsement_number}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, endorsement_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Vehicle Added</label>
                  <input
                    type="text"
                    required
                    value={endorsementForm.vehicle_id}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, vehicle_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={endorsementForm.effective_date}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, effective_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Active Days (303/365)</label>
                  <input
                    type="number"
                    value={endorsementForm.active_days}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, active_days: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Pro-Rata Math Summary Banner */}
              <div className="bg-slate-850 border border-slate-750 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">T5 Annual Full Rate</div>
                  <div className="text-sm font-bold font-mono text-slate-200">${endorsementForm.annual_rate}</div>
                </div>
                <div className="text-slate-500 font-mono text-sm">&times; (303 / 365) &equals;</div>
                <div className="text-right">
                  <div className="text-[10px] text-purple-400 uppercase font-mono">Endorsement Delta Premium</div>
                  <div className="text-base font-bold font-mono text-purple-300">${endorsementForm.delta_premium}</div>
                </div>
              </div>

              {/* Sub-Scenario Billing Method Selector */}
              <div>
                <label className="text-slate-300 font-semibold block mb-2">
                  Select Billing &amp; Invoicing Method (Sub-Scenario):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* OPTION B CARD */}
                  <div
                    onClick={() => setEndorsementForm({ ...endorsementForm, billing_option: 'SPREAD_INSTALLMENTS' })}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      endorsementForm.billing_option === 'SPREAD_INSTALLMENTS'
                        ? 'bg-brand-500/10 border-brand-500 text-white shadow-lg'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center space-x-1.5 text-brand-400">
                        <span>🅱️ Sub-Scenario 2</span>
                        <span className="px-1.5 py-0.2 text-[9px] bg-brand-500/20 text-brand-300 rounded">Recommended</span>
                      </span>
                      <input
                        type="radio"
                        name="billingOptionRadio"
                        checked={endorsementForm.billing_option === 'SPREAD_INSTALLMENTS'}
                        onChange={() => setEndorsementForm({ ...endorsementForm, billing_option: 'SPREAD_INSTALLMENTS' })}
                        className="text-brand-500"
                      />
                    </div>
                    <div className="font-semibold text-[11px] mb-1">Spread Across Remaining Installments</div>
                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      <div>&bull; +$2,407.40 added to #2, #3, and #4</div>
                      <div>&bull; Revised: <strong className="text-brand-300">$11,819.90 / installment</strong></div>
                      <div>&bull; Commercial Auto Blended Billing</div>
                    </div>
                  </div>

                  {/* OPTION A CARD */}
                  <div
                    onClick={() => setEndorsementForm({ ...endorsementForm, billing_option: 'STANDALONE_INVOICE' })}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      endorsementForm.billing_option === 'STANDALONE_INVOICE'
                        ? 'bg-blue-950/40 border-blue-500 text-white shadow-lg'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center space-x-1.5 text-blue-400">
                        <span>🅰️ Sub-Scenario 1</span>
                        <span className="px-1.5 py-0.2 text-[9px] bg-blue-500/20 text-blue-300 rounded">Immediate Bill</span>
                      </span>
                      <input
                        type="radio"
                        name="billingOptionRadio"
                        checked={endorsementForm.billing_option === 'STANDALONE_INVOICE'}
                        onChange={() => setEndorsementForm({ ...endorsementForm, billing_option: 'STANDALONE_INVOICE' })}
                        className="text-blue-500"
                      />
                    </div>
                    <div className="font-semibold text-[11px] mb-1">Standalone Single Invoice</div>
                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      <div>&bull; Issues separate invoice for <strong className="text-blue-300">$7,222.19</strong></div>
                      <div>&bull; Installments #2, #3, #4 stay at <strong>$9,412.50</strong></div>
                      <div>&bull; Immediate full payment model</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GL Journal Preview Box */}
              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded text-[11px] font-mono space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Double-Entry GL Impact (Guide Scenario 2):</div>
                <div className="text-emerald-400">Debit 1100 Premium Receivable: ${endorsementForm.delta_premium}</div>
                <div className="text-purple-400">Credit 2200 Unearned Premium Reserve (UPR): ${endorsementForm.delta_premium}</div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEndorsementModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold flex items-center space-x-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{loading ? 'Applying...' : 'Apply Policy Endorsement'}</span>
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowEndorsementModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Issue Invoice */}
      {showIssueInvoiceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Issue Customer Invoice</h3>
            <form onSubmit={handleIssueInvoice} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Billing Account</label>
                <select
                  required
                  value={invoiceForm.billing_account_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, billing_account_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">Select Account...</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.customer_name} ({a.account_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Policy ID / Insured Risk Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POL-TX-8821 (Insured: Summit / Pine Cone)"
                  value={invoiceForm.policy_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, policy_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Installment #</label>
                  <input
                    type="number"
                    value={invoiceForm.installment_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, installment_number: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Premium Amount ($)</label>
                  <input
                    type="text"
                    value={invoiceForm.premium_amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, premium_amount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Policy Fee ($)</label>
                  <input
                    type="text"
                    value={invoiceForm.fee_amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, fee_amount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
              {/* Posting Rule Selection & Validation */}
              <div className="p-3 bg-slate-850 rounded border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand-400" />
                    <span>Applied Posting Rule (Rules Engine)</span>
                  </span>
                  {invoiceRules.length > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {invoiceRules.length} Rule(s) Active
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      No Rule Published
                    </span>
                  )}
                </div>

                {invoiceRules.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedInvoiceRuleId || invoiceRules[0]?._id}
                      onChange={(e) => setSelectedInvoiceRuleId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                    >
                      {invoiceRules.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.rule_code} — {r.rule_name} (Priority {r.priority})
                        </option>
                      ))}
                    </select>
                    <div className="font-mono text-[11px] text-slate-300 space-y-0.5 pt-1">
                      <div>Dr 1100 Premium Receivable: ${(Number(invoiceForm.premium_amount || 0) + Number(invoiceForm.fee_amount || 0)).toFixed(2)}</div>
                      <div>Cr 2200 Unearned Premium Reserve: ${Number(invoiceForm.premium_amount || 0).toFixed(2)}</div>
                      {Number(invoiceForm.fee_amount || 0) > 0 && (
                        <div>Cr 4100 Policy Fee Income: ${Number(invoiceForm.fee_amount || 0).toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-400 space-y-2">
                    <div className="font-semibold flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Posting Rule Required for GL Auto-Posting</span>
                    </div>
                    <div>
                      No active rule found for <code>billing.invoice.issued</code>. Click below to auto-seed master insurance rules (Dr 1100 AR / Cr 2200 UPR / Cr 4100 Fees) and enable posting.
                    </div>
                    <button
                      type="button"
                      onClick={handleSeedPostingRules}
                      disabled={loading}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Auto-Seed Master Posting Rules Now</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueInvoiceModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceRules.length === 0}
                  className={`px-4 py-1.5 rounded font-semibold text-white transition ${
                    invoiceRules.length === 0
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-500'
                  }`}
                >
                  Issue Invoice
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowIssueInvoiceModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Record Payment */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Record Cash Receipt & Waterfall Allocate</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Billing Account</label>
                <select
                  required
                  value={paymentForm.billing_account_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, billing_account_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">Select Account...</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.customer_name} ({a.account_number})</option>
                  ))}
                </select>
              </div>

              {paymentForm.billing_account_id && (
                <div className="space-y-1.5 p-2.5 bg-slate-850 rounded border border-slate-750">
                  <div className="text-slate-300 font-semibold block text-[11px] flex items-center justify-between">
                    <span>🧾 Target Invoice (Waterfall Allocation)</span>
                    <span className="text-[10px] text-brand-400 font-mono">
                      {openInvoicesForAccount.length} Open Invoice(s)
                    </span>
                  </div>
                  {openInvoicesForAccount.length > 0 ? (
                    <div>
                      <select
                        onChange={(e) => {
                          const invId = e.target.value;
                          const targetInv = openInvoicesForAccount.find((i) => i._id === invId);
                          if (targetInv) {
                            setPaymentForm({
                              ...paymentForm,
                              amount: Number(targetInv.balance_due).toFixed(2),
                              target_invoice_id: targetInv._id
                            });
                          }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                      >
                        <option value="">-- Apply to Oldest Due (Standard Waterfall) --</option>
                        {openInvoicesForAccount.map((inv) => (
                          <option key={inv._id} value={inv._id}>
                            {inv.invoice_number} (Policy: {inv.policy_id}) — Balance Due: ${Number(inv.balance_due).toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Select an invoice to auto-fill its exact balance due.
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                      ℹ️ Is account par koi bhi unpaid/open invoice nahi hai. Agar aap payment record karenge to ye poora amount Unapplied Cash (Account 2190) me reserve ho jayega.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Amount ($)</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="ACH">ACH (Texas Trust)</option>
                    <option value="CHECK">Lockbox Check</option>
                    <option value="WIRE">Wire Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Processor / Bank Reference</label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>
              {/* Payment Posting Rule Display & Validation */}
              <div className="p-3 bg-slate-850 rounded border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand-400" />
                    <span>Applied Payment Rule (Texas Trust)</span>
                  </span>
                  {paymentRules.length > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {paymentRules.length} Rule(s) Active
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      No Rule Published
                    </span>
                  )}
                </div>

                {paymentRules.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPaymentRuleId || paymentRules[0]?._id}
                      onChange={(e) => setSelectedPaymentRuleId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                    >
                      {paymentRules.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.rule_code} — {r.rule_name} (Priority {r.priority})
                        </option>
                      ))}
                    </select>
                    <div className="font-mono text-[11px] text-slate-300 space-y-0.5 pt-1">
                      <div>Dr 1010 Texas Premium Trust: ${paymentForm.amount || '0.00'}</div>
                      <div>Cr 1100 AR (Waterfall Cleared): ${paymentForm.amount || '0.00'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-400 space-y-2">
                    <div className="font-semibold flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Payment Rule Required for GL Auto-Posting</span>
                    </div>
                    <div>
                      No active rule found for <code>billing.payment.received</code>. Click below to auto-seed master insurance rules (Dr 1010 Trust / Cr 1100 AR / Cr 2190 Suspense) and enable posting.
                    </div>
                    <button
                      type="button"
                      onClick={handleSeedPostingRules}
                      disabled={loading}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Auto-Seed Master Posting Rules Now</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentRules.length === 0}
                  className={`px-4 py-1.5 rounded font-semibold text-white transition ${
                    paymentRules.length === 0
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-500'
                  }`}
                >
                  Capture Cash
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowRecordPaymentModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Invoice Line Details */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Invoice {selectedInvoice.invoice.invoice_number}</h3>
                <p className="text-xs text-slate-400 font-mono">Status: {selectedInvoice.invoice.status}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-850 text-slate-400">
                  <tr>
                    <th className="p-2">Line</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Account</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedInvoice.lines.map((l) => (
                    <tr key={l._id}>
                      <td className="p-2">{l.line_number}</td>
                      <td className="p-2 text-brand-400">{l.line_type}</td>
                      <td className="p-2 font-sans text-slate-300">{l.description}</td>
                      <td className="p-2">{l.ledger_account_code}</td>
                      <td className="p-2 text-right text-white font-semibold">${l.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded text-xs"
              >
                Close
              </button>
            </div>
            <ModalClose onClick={() => setSelectedInvoice(null)} />
          </div>
        </div>
      )}

      {/* MODAL: Snapshot JSON Payload Inspector */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-purple-500/30 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Policy Snapshot: {selectedSnapshot.billing_policy_snapshot_id}
                  </h3>
                  <p className="text-xs text-purple-300 font-mono">
                    Policy {selectedSnapshot.policy_number} • Version {selectedSnapshot.source_version || 'v1.0'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950 p-3 rounded border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Source Entity ID</span>
                <span className="text-slate-200 font-mono">{selectedSnapshot.source_entity_id || selectedSnapshot.policy_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Event Position</span>
                <span className="text-slate-200 font-mono">#{selectedSnapshot.source_event_position || 1}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Status</span>
                <span className="text-emerald-400 font-mono font-semibold">{selectedSnapshot.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Total Premium</span>
                <span className="text-white font-mono font-bold">${formatMoney(selectedSnapshot.total_premium)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Fees / Taxes</span>
                <span className="text-slate-300 font-mono">${formatMoney(selectedSnapshot.total_fees)} / ${formatMoney(selectedSnapshot.total_taxes)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Source Timestamp</span>
                <span className="text-slate-400 font-mono text-[11px]">{new Date(selectedSnapshot.source_updated_at || selectedSnapshot.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
                <span>Immutable Payload JSON (snapshot_json):</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedSnapshot.snapshot_json || selectedSnapshot, null, 2));
                    setSuccess('Snapshot payload copied to clipboard');
                  }}
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline font-sans"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-purple-200 overflow-auto max-h-72 leading-relaxed">
                {JSON.stringify(selectedSnapshot.snapshot_json && Object.keys(selectedSnapshot.snapshot_json).length > 0 ? selectedSnapshot.snapshot_json : selectedSnapshot, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition"
              >
                Close Inspector
              </button>
            </div>
            <ModalClose onClick={() => setSelectedSnapshot(null)} />
          </div>
        </div>
      )}

      {/* MODAL: Ingest External Policy Snapshot (Module 35) */}
      {showNewSnapshotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span>Ingest Policy Snapshot (Module 35)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Decoupled standalone policy ingestion without direct PAS physical coupling.
                </p>
              </div>
              <button onClick={() => setShowNewSnapshotModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Policy Number</label>
                  <input
                    type="text"
                    required
                    value={newSnapshotForm.policy_number}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, policy_number: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                    placeholder="POL-TX-9902"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Source Version</label>
                  <input
                    type="text"
                    required
                    value={newSnapshotForm.source_version}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, source_version: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                    placeholder="v1.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Line of Business</label>
                  <select
                    value={newSnapshotForm.line_of_business}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, line_of_business: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="COMMERCIAL_AUTO">Commercial Auto (Trucking)</option>
                    <option value="GENERAL_LIABILITY">General Liability</option>
                    <option value="CARGO">Motor Truck Cargo</option>
                    <option value="WORKERS_COMP">Workers Compensation</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Status</label>
                  <select
                    value={newSnapshotForm.status}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="BOUND">BOUND</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_ISSUANCE">PENDING_ISSUANCE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Total Premium ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSnapshotForm.total_premium}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, total_premium: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Fees ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSnapshotForm.total_fees}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, total_fees: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Taxes ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSnapshotForm.total_taxes}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, total_taxes: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={newSnapshotForm.effective_date}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, effective_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={newSnapshotForm.expiration_date}
                    onChange={(e) => setNewSnapshotForm({ ...newSnapshotForm, expiration_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewSnapshotModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 font-semibold text-white rounded transition"
                >
                  Ingest Snapshot
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowNewSnapshotModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL: Register Premium Finance Agreement (Module 12) */}
      {showFinanceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>Register Premium Finance Agreement (Module 12)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Links commercial policies to third-party premium finance companies (IPFS, AFCO).
                </p>
              </div>
              <button onClick={() => setShowFinanceModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateFinanceAgreement} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Agreement Number</label>
                <input
                  type="text"
                  required
                  value={newFinanceForm.agreement_number}
                  onChange={(e) => setNewFinanceForm({ ...newFinanceForm, agreement_number: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  placeholder="PFA-TX-2026-001"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Billing Account</label>
                <select
                  required
                  value={newFinanceForm.billing_account_id}
                  onChange={(e) => setNewFinanceForm({ ...newFinanceForm, billing_account_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.customer_name} ({acc.account_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Amount Financed ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newFinanceForm.amount_financed}
                    onChange={(e) => setNewFinanceForm({ ...newFinanceForm, amount_financed: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Down Payment ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newFinanceForm.down_payment}
                    onChange={(e) => setNewFinanceForm({ ...newFinanceForm, down_payment: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newFinanceForm.interest_rate}
                    onChange={(e) => setNewFinanceForm({ ...newFinanceForm, interest_rate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Notes / Financing Terms</label>
                <textarea
                  rows="2"
                  value={newFinanceForm.notes}
                  onChange={(e) => setNewFinanceForm({ ...newFinanceForm, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  placeholder="e.g. Imperial PFS Texas 10-Pay Installment Financing"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFinanceModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 font-semibold text-white rounded transition"
                >
                  Register Agreement
                </button>
              </div>
            </form>
            <ModalClose onClick={() => setShowFinanceModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
