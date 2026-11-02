# Veridex One — Rules-Driven Architecture Audit
**Document ID:** `RULES_DRIVEN_ARCHITECTURE_AUDIT.md`  
**Phase:** R0 Reality Audit  
**Date:** October 13, 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

This architecture audit provides an exhaustive, code-level inspection of the current Veridex One Finance & Accounting SaaS repository (`veridex_accoouunting_finance`). The audit evaluates the readiness of the system for transition to a fully configuration-driven, multi-tenant, event-driven architecture where journal entries (JEs), dimensions, and accounting behaviors are dictated by dynamic posting rules rather than hardcoded service routines.

### Key Audit Findings
1. **Hardcoded Double-Entry Postings in Domain Services:** Across all 4 operational modules (Billing & AR, Treasury, Commissions & Fiduciary, Finance Close), accounting debits and credits are hardcoded directly in service functions.
2. **Posting Rule Engine Inactive in Core Workflows:** Models for `PostingRule` and `PostingRuleLine` exist in Module 14, but they are only exposed via basic CRUD endpoints in `glController.js`. They are completely bypassed by domain transactions.
3. **No Rule Resolution or Expression Evaluation Engine:** The system lacks a rule matcher (matching event attributes like Line of Business, State, Policy Type), precedence resolver (Tenant-specific vs. Tenant Type Template vs. Platform Default), versioning lifecycle (`DRAFT`, `VALIDATED`, `PUBLISHED`, `RETIRED`), and mathematical expression DSL for line calculations.
4. **Absence of Durable Event Pipeline:** Domain services directly invoke `journalPostingService.postJournalEntry(...)` synchronously. There is no durable Outbox, Inbox deduplication table, event dispatcher, or Dead-Letter Queue (DLQ).
5. **Tenancy and Counterparty Gaps:** `Tenant.js` lacks a `tenant_type` classification (`CARRIER`, `MGA`, `BROKER`, `OTHER`) and does not link to a unified external customer/party counterparty model.

---

## 2. Inventory of Existing Models

The codebase currently contains **55 Mongoose Models** (47 Domain Models + 8 Identity Models) registered in [`backend/src/models/index.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/models/index.js#L1-L135):

| Domain / Module | Model Count | Registered Models |
| :--- | :---: | :--- |
| **SaaS Identity & Tenancy** | 8 | `Tenant`, `User`, `TenantMembership`, `Role`, `Permission`, `RolePermission`, `UserRole`, `TenantModuleEntitlement` |
| **Module 14: Core GL** | 7 | `LedgerAccount`, `FiscalPeriod`, `PostingRule`, `PostingRuleLine`, `Journal`, `JournalEntry`, `ExchangeRate` |
| **Module 12: Billing & AR** | 9 | `BillingPlan`, `BillingAccount`, `BillingAccountPolicy`, `InstallmentSchedule`, `Invoice`, `InvoiceLine`, `Payment`, `PaymentAllocation`, `BillingAdjustment` |
| **Module 40: Treasury & Bank Rec** | 12 | `PaymentMandate`, `PaymentAttempt`, `ProcessorTransaction`, `BankStatementLine`, `CashReconciliationMatch`, `UnappliedCash`, `PaymentReturn`, `Refund`, `DunningPlan`, `DelinquencyCase`, `DunningAction`, `CollectionAssignment` |
| **Module 13: Commissions & Fiduciary** | 11 | `CommissionAgreement`, `CommissionSchedule`, `ProfitCommissionSchedule`, `CommissionSplit`, `CommissionTransaction`, `FiduciaryAccount`, `BordereauDefinition`, `BordereauRun`, `BordereauLine`, `SettlementStatement`, `SettlementLine` |
| **Module 41: Finance Close & UPR** | 8 | `SubledgerBalance`, `ReconciliationCase`, `TrialBalanceSnapshot`, `TrialBalanceLine`, `PeriodCloseTask`, `GLExportBatch`, `CommissionAdjustment`, `CommissionDispute` |
| **Total** | **55** | *All 55 models are active and backed by MongoDB collections.* |

---

## 3. Detailed Code-Path Audit: How Journals Are Posted Today

The low-level double-entry posting engine is located in [`backend/src/services/journalPostingService.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/services/journalPostingService.js#L16-L165). It enforces critical financial invariants:
- Fiscal period open status check (rejects `LOCKED` or `HARD_CLOSED` periods).
- Exact debit-credit balance equilibrium ($\sum \text{Debits} = \sum \text{Credits}$) via `bignumber.js`.
- Account validation: verifies active status and `is_posting_allowed === true`.
- Idempotency guard: prevents duplicate postings for identical `referenceId` and `sourceModule`.
- Atomically creates `Journal` and `JournalEntry` documents and updates `LedgerAccount.current_balance`.

However, an inspection of the domain services reveals that all line configurations and account codes are **hardcoded in JavaScript**:

### 3.1 Module 12: Billing & AR ([`backend/src/services/billingService.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/services/billingService.js))
- **Invoice Issuance (`issueInvoice`, lines 218–244):**
  ```javascript
  // Hardcoded Dr 1100 AR, Cr 2200 UPR or 4100 Fee
  const journalLines = [
    { account_code: '1100', debit: totalAmountBN.toFixed(2), credit: '0.00', memo: `Dr AR for Invoice ${invoiceNumber}` }
  ];
  for (const l of lines) {
    journalLines.push({
      account_code: l.ledger_account_code || (l.line_type === 'FEE' ? '4100' : '2200'),
      debit: '0.00',
      credit: new BigNumber(l.amount.toString()).toFixed(2),
      memo: `Cr ${l.description}`
    });
  }
  await postJournalEntry({ ..., sourceModule: 'BILLING_INVOICE', lines: journalLines });
  ```
- **Payment Receipt (`recordCustomerPayment`, lines 383–419):**
  ```javascript
  // Hardcoded Dr Cash (1010 if fiduciary, else 1000), Cr 1100 AR, Cr 2190 Unapplied Cash
  const cashAccountCode = isFiduciary ? '1010' : '1000';
  const journalLines = [{ account_code: cashAccountCode, debit: paymentAmountBN.toFixed(2), credit: '0.00', memo: ... }];
  if (totalAllocatedBN.gt(0)) journalLines.push({ account_code: '1100', debit: '0.00', credit: totalAllocatedBN.toFixed(2), ... });
  if (unallocatedBN.gt(0)) journalLines.push({ account_code: '2190', debit: '0.00', credit: unallocatedBN.toFixed(2), ... });
  await postJournalEntry({ ..., sourceModule: 'BILLING_PAYMENT', lines: journalLines });
  ```

### 3.2 Module 13: Commissions & Fiduciary ([`backend/src/services/commissionsService.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/services/commissionsService.js))
- **Fiduciary Sweep (`executeTrustSweep`, lines 408–430):**
  ```javascript
  // Hardcoded Dr 1000 (Operating Cash), Cr 1010 (Premium Trust Cash)
  await postJournalEntry({
    sourceModule: 'COMMISSIONS_FIDUCIARY',
    lines: [
      { account_code: '1000', debit: sweepAmount.toFixed(2), credit: '0.00', memo: 'MGA operating cash transfer' },
      { account_code: '1010', debit: '0.00', credit: sweepAmount.toFixed(2), memo: 'Release from statutory premium trust' }
    ]
  });
  ```
- **Carrier Settlement Disbursement (`disburseCarrierSettlement`, lines 657–679):**
  ```javascript
  // Hardcoded Dr 2010 (Due to Carrier), Cr 1010 (Premium Trust Cash)
  await postJournalEntry({
    sourceModule: 'COMMISSIONS_FIDUCIARY',
    lines: [
      { account_code: '2010', debit: netDue.toFixed(2), credit: '0.00', memo: `Discharge Due to Carrier for ${...}` },
      { account_code: '1010', debit: '0.00', credit: netDue.toFixed(2), memo: 'Disbursement from Texas § 4053 Premium Trust' }
    ]
  });
  ```

### 3.3 Module 40: Treasury & Bank Rec ([`backend/src/services/treasuryService.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/services/treasuryService.js))
- **Payment Return / NSF (`processPaymentReturn`, lines 294–329):**
  ```javascript
  // Hardcoded Dr 1100 (AR), Cr 1010 (Trust Cash), Dr 1100 (Fee AR), Cr 4100 (Fee Revenue)
  const journalLines = [
    { account_code: '1100', debit: pAmtBN.toFixed(2), credit: '0.00', memo: ... },
    { account_code: '1010', debit: '0.00', credit: pAmtBN.toFixed(2), memo: ... },
    { account_code: '1100', debit: feeBN.toFixed(2), credit: '0.00', memo: ... },
    { account_code: '4100', debit: '0.00', credit: feeBN.toFixed(2), memo: ... }
  ];
  await postJournalEntry({ ..., sourceModule: 'TREASURY_RETURN', lines: journalLines });
  ```
- **Refund Disbursement (`processRefundDisbursement`, lines 374–385):**
  ```javascript
  // Hardcoded Dr 2100 (Return Premium Payable), Cr 1010 (Premium Trust Cash)
  ```

### 3.4 Module 41: Finance Close & UPR ([`backend/src/services/financeCloseService.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/services/financeCloseService.js))
- **UPR Amortization (`amortizeUPRForPeriod`, lines 122–145):**
  ```javascript
  // Hardcoded Dr 2200 (UPR Liability reduction), Cr 4000 (Earned Premium Revenue)
  await postJournalEntry({
    sourceModule: 'FINANCE_CLOSE',
    lines: [
      { account_code: '2200', debit: calc.earned_premium, credit: '0.00', memo: `Amortize UPR for ${...}` },
      { account_code: '4000', debit: '0.00', credit: calc.earned_premium, memo: `Recognize Earned Premium Revenue (${...})` }
    ]
  });
  ```

---

## 4. Audit of Current Posting Rule Implementation

### 4.1 Schema Limitations: `PostingRule` & `PostingRuleLine`
Inspecting [`backend/src/models/PostingRule.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/models/PostingRule.js) and [`backend/src/models/PostingRuleLine.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/models/PostingRuleLine.js):
- **No Rule Precedence / Matching Criteria:** `PostingRule` has `tenant_id`, `rule_code`, `event_type`, `applicable_module`, `accounting_basis`, `effective_from`, `effective_to`, `status`. There are no condition fields (e.g., `criteria: { lob: 'COMMERCIAL_AUTO', state: 'TX' }`).
- **No Governance Lifecycle:** Status is only `ACTIVE` / `INACTIVE`. Lacks immutable version states: `DRAFT`, `VALIDATED`, `PUBLISHED`, `RETIRED`.
- **No Formula Expression DSL in Lines:** In `PostingRuleLine`, `amount_field` is a simple string (e.g. `'gross_premium'`). It cannot evaluate compound arithmetic (e.g., `event.written_premium - event.commission_amount`), percentage calculations, or conditional amounts.
- **No Rule Isolation by Tenant Type:** Rules cannot be specified for `CARRIER` vs `MGA` vs `BROKER` templates.

### 4.2 Endpoint Utilization
- In [`backend/src/controllers/glController.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/controllers/glController.js#L332-L395), endpoints `GET /api/v1/gl/posting-rules` and `POST /api/v1/gl/posting-rules` provide basic storage.
- **Zero integration:** No service in the application calls `getPostingRules` or queries `PostingRule` to construct a journal entry.

---

## 5. Event Pipeline and Tenancy Audit

### 5.1 Event Pipeline Status
- **Zero Event Bus Infrastructure:** No Outbox pattern table exists in MongoDB (`OutboxEvent` is absent).
- **No Deduplication Inbox:** `InboxEvent` is absent.
- **Synchronous Postings Only:** All business mutations synchronously trigger journal postings within the same request lifecycle. A failure in posting aborts the HTTP call with no asynchronous retry or dead-letter processing.

### 5.2 Tenancy Model Status
- In [`backend/src/models/Tenant.js`](file:///c:/Users/AkhileshSoni/Desktop/veridexoneDoc/veridex_accoouunting_finance/backend/src/models/Tenant.js#L5-L24), the tenant schema contains:
  - `tenant_code`, `name`, `status` (`ACTIVE`, `SUSPENDED`, `ONBOARDING`), `base_currency`, `fiscal_year_start_month`, `timezone`, `metadata`.
- **Missing Elements:**
  - No `tenant_type` enum (`CARRIER`, `MGA`, `BROKER`, `OTHER`).
  - No counterparty party model (`Party`, `PartyRole`, `Contact`) to distinguish external carriers, agencies, insureds, and reinsurance partners.

---

## 6. Audit Conclusion & Next Steps

The current codebase is solid in its domain model definitions, decimal arithmetic, and financial double-entry validation invariants (`postJournalEntry`). However, **the financial logic is 100% hardcoded**.

To achieve a true **rules-driven, multi-tenant insurance finance SaaS**, the architecture must be refactored into:
1. **R1:** Extended Tenant models with `tenant_type`, seed fixtures for Carrier, MGA, Broker, and canonical role templates.
2. **R2:** Outbox/Inbox event ingestion pipeline with idempotency and trace logging.
3. **R3:** Enhanced Posting Rule DSL, rule matcher with multi-tier precedence, version lifecycle (`DRAFT` $\rightarrow$ `PUBLISHED`), and safe expression evaluator.
4. **R4:** Decoupled event dispatcher integrating domain services (`billing`, `commissions`, `treasury`, `close`) to resolve rules dynamically.
5. **R5:** Rule Simulation Studio and dry-run JE preview engine.
6. **R6:** Multi-tenant frontend configuration UI for Rules, Events, Counterparties, and Accounting Simulator.
7. **R7:** End-to-end multi-tenant demo datasets verifying divergent accounting behavior between Carrier, MGA, and Broker.
8. **R8:** Automated regression and audit verification gate.
