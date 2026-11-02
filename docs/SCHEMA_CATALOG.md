# Domain Schema Catalog — 47 Finance Models & SaaS Foundation

**Application:** Veridex One Insurance Finance & Accounting SaaS  
**Document Version:** 1.0  
**Effective Date:** October 12, 2026  

---

## 1. Platform Foundation & Multi-Tenant Identity Schemas

| Model Name | Collection Name | Business Purpose | Key Fields |
|---|---|---|---|
| `Tenant` | `tenant_masters` | Organization workspace isolation | `tenant_id`, `tenant_name`, `status`, `base_currency`, `subscription_tier` |
| `User` | `app_users` | Platform authentication principal | `user_id`, `email`, `password_hash`, `full_name`, `status` |
| `TenantMembership` | `tenant_memberships` | User workspace access mapping | `membership_id`, `user_id`, `tenant_id`, `status`, `is_default` |
| `Role` | `roles` | RBAC role definitions | `role_code`, `scope`, `description`, `permissions` |
| `TenantModuleEntitlement` | `tenant_module_entitlements` | Per-tenant module feature toggles | `tenant_id`, `module_key`, `is_enabled` |
| `OutboxEvent` | `outbox_events` | Reliable transactional event publishing | `event_id`, `event_type`, `aggregate_id`, `payload`, `status` |
| `InboxEvent` | `inbox_events` | Idempotent domain event consumer | `inbox_id`, `idempotency_key`, `event_type`, `payload`, `status` |

---

## 2. Module 14 — Core General Ledger (7 Models)

| Model Name | Collection Name | Purpose | Key Attributes |
|---|---|---|---|
| `LedgerAccount` | `ledger_accounts` | Master Chart of Accounts (COA) | `account_code`, `account_name`, `account_type`, `normal_balance`, `is_fiduciary`, `current_balance` |
| `FiscalPeriod` | `fiscal_periods` | Accounting period locking guards | `period_name`, `fiscal_year`, `period_number`, `start_date`, `end_date`, `status` (`OPEN`/`LOCKED`) |
| `PostingRule` | `posting_rules` | Event-driven journal generation templates | `event_type`, `rule_name`, `status` |
| `PostingRuleLine` | `posting_rule_lines` | Debit/credit line mapping for posting rules | `posting_rule_id`, `account_code`, `direction`, `amount_formula` |
| `Journal` | `journals` | Double-entry journal header | `journal_number`, `posting_date`, `total_debit`, `total_credit`, `status` (`POSTED`/`REVERSED`) |
| `JournalEntry` | `journal_entries` | Itemized journal debit/credit lines | `journal_id`, `ledger_account_id`, `account_code`, `debit`, `credit`, `memo` |
| `ExchangeRate` | `exchange_rates` | Multi-currency FX conversion rates | `from_currency`, `to_currency`, `effective_date`, `rate` |

---

## 3. Module 12 — Billing & Accounts Receivable (9 Models)

| Model Name | Collection Name | Purpose | Key Attributes |
|---|---|---|---|
| `BillingPlan` | `billing_plans` | Installment pattern templates (Full Pay, 4-Pay) | `plan_code`, `installment_count`, `down_payment_pct`, `installment_fee` |
| `BillingAccount` | `billing_accounts` | Customer AR account profile & balance | `account_number`, `customer_name`, `current_balance`, `past_due_balance`, `status` |
| `BillingAccountPolicy` | `billing_account_policies` | Links billing account to external policy snapshot | `billing_account_id`, `policy_id`, `policy_number`, `total_premium` |
| `InstallmentSchedule` | `installment_schedules` | Itemized premium & fee payment schedule | `installment_number`, `due_date`, `total_amount`, `paid_amount`, `balance_amount`, `status` |
| `Invoice` | `invoices` | Billed customer invoice header | `invoice_number`, `due_date`, `total_amount`, `amount_paid`, `balance_due`, `status` |
| `InvoiceLine` | `invoice_lines` | Itemized invoice components (premium, fee, tax) | `invoice_id`, `line_type`, `description`, `amount` |
| `Payment` | `payments` | Customer payment receipt record | `payment_number`, `payment_method`, `amount`, `allocated_amount`, `unapplied_amount`, `status` |
| `PaymentAllocation` | `payment_allocations` | Waterfall clearance against invoice balances | `payment_id`, `invoice_id`, `allocated_amount`, `allocation_type` |
| `BillingAdjustment` | `billing_adjustments` | Write-offs, fee waivers & credit memos | `adjustment_type`, `amount`, `reason_code`, `status` |

---

## 4. Module 40 — Treasury, Cash & Bank Reconciliation (12 Models)

| Model Name | Collection Name | Purpose | Key Attributes |
|---|---|---|---|
| `PaymentMandate` | `payment_mandates` | Tokenized ACH / recurring mandate | `billing_account_id`, `mandate_type`, `account_last4`, `status` |
| `PaymentAttempt` | `payment_attempts` | Gateway processing request attempt | `billing_account_id`, `amount`, `status` (`INITIATED`/`SETTLED`/`FAILED`) |
| `ProcessorTransaction` | `processor_transactions` | Merchant gateway settlement record | `attempt_id`, `processor_name`, `processor_auth_code`, `amount`, `status` |
| `PaymentReturn` | `payment_returns` | ACH return / NSF dishonor tracking | `payment_id`, `return_code`, `return_amount`, `fee_amount`, `status` |
| `UnappliedCash` | `unapplied_cash` | Suspense account for excess/unmatched funds | `billing_account_id`, `payment_id`, `original_amount`, `remaining_amount`, `status` |
| `DunningPlan` | `dunning_plans` | Overdue notice timeline configuration | `plan_name`, `grace_period_days`, `cancellation_notice_days` |
| `DelinquencyCase` | `delinquency_cases` | Active collection/cancellation workflow | `billing_account_id`, `delinquent_amount`, `current_stage`, `status` |
| `DunningAction` | `dunning_actions` | Executed notices and communications | `delinquency_case_id`, `action_type`, `action_date` |
| `CollectionAssignment` | `collection_assignments` | Bad debt third-party agency handoff | `delinquency_case_id`, `agency_name`, `assigned_amount`, `status` |
| `BankStatementLine` | `bank_statement_lines` | Electronic bank feed line (MT940/Lockbox) | `bank_account_number`, `booking_date`, `amount`, `reference_text`, `reconciliation_status` |
| `CashReconciliationMatch` | `cash_reconciliation_matches` | 4-way automated/manual reconciliation link | `bank_statement_line_id`, `processor_transaction_id`, `matched_amount`, `match_type` |
| `Refund` | `refunds` | Premium refund disbursement record | `billing_account_id`, `refund_amount`, `refund_method`, `reason`, `status` |

---

## 5. Module 13 — Commissions, Fiduciary Trust & Settlements (11 Models)

| Model Name | Collection Name | Purpose | Key Attributes |
|---|---|---|---|
| `CommissionAgreement` | `commission_agreements` | Master producer distribution agreement | `party_id`, `party_name`, `party_role`, `effective_date`, `default_commission_rate` |
| `CommissionSchedule` | `commission_schedules` | Tiered line-of-business rate schedules | `agreement_id`, `line_of_business`, `jurisdiction`, `rate_type`, `rate_value` |
| `ProfitCommissionSchedule` | `profit_commission_schedules` | Annual loss-ratio contingent bonus rules | `agreement_id`, `loss_ratio_threshold`, `bonus_pct` |
| `CommissionSplit` | `commission_splits` | Multi-tier participant split definition | `schedule_id`, `party_id`, `party_role`, `split_percentage`, `priority_order` |
| `CommissionTransaction` | `commission_transactions` | Earned/accrued commission ledger record | `policy_id`, `party_id`, `premium_basis`, `rate_applied`, `commission_amount`, `status` |
| `FiduciaryAccount` | `fiduciary_accounts` | Texas § 4053 segregated trust bank profile | `account_name`, `bank_name`, `account_number`, `escrow_hold_days`, `balance` |
| `BordereauDefinition` | `bordereau_definitions` | Monthly carrier report format specification | `carrier_id`, `bordereau_type`, `frequency` |
| `BordereauRun` | `bordereau_runs` | Executed monthly carrier remittance run | `period_name`, `total_gross_premium`, `total_net_carrier_premium`, `total_commissions`, `status` |
| `BordereauLine` | `bordereau_lines` | Policy-level itemized bordereau entry | `run_id`, `policy_id`, `gross_premium`, `mga_commission`, `net_due_carrier` |
| `SettlementStatement` | `settlement_statements` | Netting statement for carrier/broker payout | `statement_number`, `recipient_name`, `total_payable`, `status` |
| `SettlementLine` | `settlement_lines` | Itemized line on settlement statement | `statement_id`, `policy_id`, `amount` |

---

## 6. Module 41 — Finance Close, Reconciliation & ERP Export (8 Models)

| Model Name | Collection Name | Purpose | Key Attributes |
|---|---|---|---|
| `SubledgerBalance` | `subledger_balances` | AR/AP/Fiduciary subledger reconciliation | `ledger_account_id`, `subledger_type`, `subledger_calculated_balance`, `gl_account_balance`, `variance` |
| `ReconciliationCase` | `reconciliation_cases` | Investigation item for balance discrepancies | `fiscal_period_id`, `ledger_account_id`, `discrepancy_amount`, `status` |
| `TrialBalanceSnapshot` | `trial_balance_snapshots` | Certified immutable period trial balance | `period_name`, `total_debits`, `total_credits`, `is_balanced`, `snapshot_status` |
| `TrialBalanceLine` | `trial_balance_lines` | Account balances inside trial balance snapshot | `snapshot_id`, `account_code`, `debit_balance`, `credit_balance` |
| `PeriodCloseTask` | `period_close_tasks` | Nina's 7-step close execution checklist | `fiscal_period_id`, `task_step` (1..7), `task_name`, `status`, `completed_at` |
| `GLExportBatch` | `gl_export_batches` | SAP S/4HANA & NetSuite formatted export | `fiscal_period_id`, `target_erp`, `total_debit`, `total_credit`, `payload`, `status` |
| `CommissionAdjustment` | `commission_adjustments` | Post-close manual commission adjustment | `commission_transaction_id`, `adjustment_type`, `amount`, `reason` |
| `CommissionDispute` | `commission_disputes` | Broker commission calculation challenge | `commission_transaction_id`, `disputed_amount`, `status` |
