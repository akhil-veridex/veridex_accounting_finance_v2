const Tenant = require('./Tenant');
const User = require('./User');
const TenantMembership = require('./TenantMembership');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const UserRole = require('./UserRole');
const TenantModuleEntitlement = require('./TenantModuleEntitlement');
const Party = require('./Party');
const PartyRole = require('./PartyRole');

// Module 14: Core General Ledger (7 Models)
const LedgerAccount = require('./LedgerAccount');
const FiscalPeriod = require('./FiscalPeriod');
const PostingRule = require('./PostingRule');
const PostingRuleLine = require('./PostingRuleLine');
const EventDefinition = require('./EventDefinition');
const PostingRuleTestCase = require('./PostingRuleTestCase');
const OutboxEvent = require('./OutboxEvent');
const InboxMessage = require('./InboxMessage');
const EventSubscription = require('./EventSubscription');
const Journal = require('./Journal');
const JournalEntry = require('./JournalEntry');
const ExchangeRate = require('./ExchangeRate');
const DimensionDefinition = require('./DimensionDefinition');

// Module 12: Billing & Accounts Receivable (ERD v4.6)
const BillingPlan = require('./BillingPlan');
const BillingAccount = require('./BillingAccount');
const BillingAccountPolicy = require('./BillingAccountPolicy');
const InstallmentSchedule = require('./InstallmentSchedule');
const Invoice = require('./Invoice');
const InvoiceLine = require('./InvoiceLine');
const Payment = require('./Payment');
const PaymentAllocation = require('./PaymentAllocation');
const BillingAdjustment = require('./BillingAdjustment');
const PremiumFinanceAgreement = require('./PremiumFinanceAgreement');

// Module 35: Standalone Operation, Policy & Transaction Snapshots, External Systems
const BillingPolicySnapshot = require('./BillingPolicySnapshot');
const BillingTransactionSnapshot = require('./BillingTransactionSnapshot');
const ExternalSystem = require('./ExternalSystem');
const ExternalIdMap = require('./ExternalIdMap');

// Module 40: Treasury, Cash & Bank Reconciliation (12 Models)
const PaymentMandate = require('./PaymentMandate');
const PaymentAttempt = require('./PaymentAttempt');
const ProcessorTransaction = require('./ProcessorTransaction');
const BankStatementLine = require('./BankStatementLine');
const CashReconciliationMatch = require('./CashReconciliationMatch');
const UnappliedCash = require('./UnappliedCash');
const PaymentReturn = require('./PaymentReturn');
const Refund = require('./Refund');
const DunningPlan = require('./DunningPlan');
const DelinquencyCase = require('./DelinquencyCase');
const DunningAction = require('./DunningAction');
const CollectionAssignment = require('./CollectionAssignment');

// Module 13: Commissions, Fiduciary Trust, Bordereaux & Carrier Settlements (11 Models)
const CommissionAgreement = require('./CommissionAgreement');
const CommissionSchedule = require('./CommissionSchedule');
const ProfitCommissionSchedule = require('./ProfitCommissionSchedule');
const CommissionSplit = require('./CommissionSplit');
const CommissionTransaction = require('./CommissionTransaction');
const FiduciaryAccount = require('./FiduciaryAccount');
const BordereauDefinition = require('./BordereauDefinition');
const BordereauRun = require('./BordereauRun');
const BordereauLine = require('./BordereauLine');
const SettlementStatement = require('./SettlementStatement');
const SettlementLine = require('./SettlementLine');

// Module 41: Finance Close, Reconciliation & ERP Export (8 Models)
const SubledgerBalance = require('./SubledgerBalance');
const ReconciliationCase = require('./ReconciliationCase');
const TrialBalanceSnapshot = require('./TrialBalanceSnapshot');
const TrialBalanceLine = require('./TrialBalanceLine');
const PeriodCloseTask = require('./PeriodCloseTask');
const GLExportBatch = require('./GLExportBatch');
const CommissionAdjustment = require('./CommissionAdjustment');
const CommissionDispute = require('./CommissionDispute');

module.exports = {
  // Identity & Tenancy
  Tenant,
  User,
  TenantMembership,
  Role,
  Permission,
  RolePermission,
  UserRole,
  TenantModuleEntitlement,
  Party,
  PartyRole,

  // Core General Ledger
  LedgerAccount,
  FiscalPeriod,
  PostingRule,
  PostingRuleLine,
  EventDefinition,
  PostingRuleTestCase,
  OutboxEvent,
  InboxMessage,
  EventSubscription,
  Journal,
  JournalEntry,
  ExchangeRate,
  DimensionDefinition,

  // Billing & Accounts Receivable (ERD v4.6)
  BillingPlan,
  BillingAccount,
  BillingAccountPolicy,
  InstallmentSchedule,
  Invoice,
  InvoiceLine,
  Payment,
  PaymentAllocation,
  BillingAdjustment,
  PremiumFinanceAgreement,

  // Module 35: Standalone Operation, Policy & Transaction Snapshots
  BillingPolicySnapshot,
  BillingTransactionSnapshot,
  ExternalSystem,
  ExternalIdMap,

  // Treasury, Cash & Bank Reconciliation
  PaymentMandate,
  PaymentAttempt,
  ProcessorTransaction,
  BankStatementLine,
  CashReconciliationMatch,
  UnappliedCash,
  PaymentReturn,
  Refund,
  DunningPlan,
  DelinquencyCase,
  DunningAction,
  CollectionAssignment,

  // Commissions, Fiduciary Trust, Bordereaux & Settlements
  CommissionAgreement,
  CommissionSchedule,
  ProfitCommissionSchedule,
  CommissionSplit,
  CommissionTransaction,
  FiduciaryAccount,
  BordereauDefinition,
  BordereauRun,
  BordereauLine,
  SettlementStatement,
  SettlementLine,

  // Module 41: Finance Close, Reconciliation & ERP Export (8 Models)
  SubledgerBalance,
  ReconciliationCase,
  TrialBalanceSnapshot,
  TrialBalanceLine,
  PeriodCloseTask,
  GLExportBatch,
  CommissionAdjustment,
  CommissionDispute
};
