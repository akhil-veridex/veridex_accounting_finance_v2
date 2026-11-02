# Phase 0: Repository and Source Specification Audit

**Application:** Veridex One Insurance Finance & Accounting SaaS  
**Target Directory:** `C:\Users\AkhileshSoni\Desktop\veridexoneDoc\veridex_accoouunting_finance`  
**Audit Date:** October 12, 2026  
**Status:** COMPLETE (Exit Gate Passed)  

---

## 1. Executive Summary & Stack Confirmation

This audit establishes the baseline for building the developer-ready, modular, multi-tenant **Veridex One Insurance Finance & Accounting SaaS platform**.

### Selected Technology Stack:
- **Backend:** Node.js (v24.18.0) + Express.js
- **Database Engine:** MongoDB 6.0+ via Mongoose 8.x
- **Precision Math:** Mongoose `Decimal128` + `bignumber.js` (eliminates binary IEEE 754 floating-point drift)
- **Frontend:** React 18 + Vite + Tailwind CSS (Responsive Multi-Tenant Workstation)
- **Architecture Pattern:** Modular Monolith with Transactional Outbox/Inbox Event Integration, Strict Server-Side Tenant Scoping, and RBAC Enforcement.

---

## 2. In-Scope Domain Scope & Inventory

### A. 47 Finance Domain Models (5 Core Submodules)

| Submodule | Module # | Required Physical Models | Count | Status |
|---|---|---|:---:|:---:|
| **Core General Ledger** | Module 14 | `LedgerAccount`, `FiscalPeriod`, `PostingRule`, `PostingRuleLine`, `Journal`, `JournalEntry`, `ExchangeRate` | 7 | Defined in Catalog |
| **Billing & Accounts Receivable** | Module 12 | `BillingPlan`, `BillingAccount`, `BillingAccountPolicy`, `InstallmentSchedule`, `Invoice`, `InvoiceLine`, `Payment`, `PaymentAllocation`, `BillingAdjustment` | 9 | Defined in Catalog |
| **Treasury, Cash & Bank Recon** | Module 40 | `PaymentMandate`, `PaymentAttempt`, `ProcessorTransaction`, `BankStatementLine`, `CashReconciliationMatch`, `UnappliedCash`, `PaymentReturn`, `Refund`, `DunningPlan`, `DelinquencyCase`, `DunningAction`, `CollectionAssignment` | 12 | Defined in Catalog |
| **Commissions, Fiduciary & Settlements** | Module 13 | `CommissionAgreement`, `CommissionSchedule`, `ProfitCommissionSchedule`, `CommissionSplit`, `CommissionTransaction`, `FiduciaryAccount`, `BordereauDefinition`, `BordereauRun`, `BordereauLine`, `SettlementStatement`, `SettlementLine` | 11 | Defined in Catalog |
| **Finance Close, Reconciliation & ERP** | Module 41 | `SubledgerBalance`, `ReconciliationCase`, `TrialBalanceSnapshot`, `TrialBalanceLine`, `PeriodCloseTask`, `GLExportBatch`, `CommissionAdjustment`, `CommissionDispute` | 8 | Defined in Catalog |
| **Total Finance-Domain Models** | | | **47** | Verified |

*Note on Model Ownership:* `CommissionAdjustment` and `CommissionDispute` are canonically owned by Module 41, linked seamlessly into the Module 13 UI.

### B. Platform Foundation & Multi-Tenant Identity Models (Separate from 47 Finance Models)
1. `Tenant` (`Organization`): Multi-tenant root, slug, status, timezone, base currency.
2. `User` (`AppUser`): Normalized email, password hash (SHA-256 / bcrypt), name, status.
3. `TenantMembership`: User-to-tenant relationship, status, default workspace flag.
4. `Role`: Role codes (`PLATFORM_SUPER_ADMIN`, `TENANT_ADMIN`, `FINANCE_ADMIN`, `ACCOUNTANT`, `BILLING_OPERATOR`, `TREASURY_OPERATOR`, `FINANCE_CONTROLLER`, `AUDITOR_READ_ONLY`).
5. `Permission`: Action keys (e.g., `gl:post_journal`, `billing:allocate_payment`, `close:certify`).
6. `RolePermission`: Role-to-permission mappings.
7. `UserRole`: User membership role assignment.
8. `TenantModuleEntitlement`: Feature toggles per tenant (`core_gl`, `billing_ar`, `treasury_recon`, `commissions_fiduciary`, `finance_close_erp`).
9. `Session`: Token tracking & revocation metadata.
10. `OutboxEvent` & `InboxEvent`: Decoupled asynchronous event persistence with idempotency hashing.

---

## 3. Discrepancy & Conflict Analysis

1. **PostgreSQL Relational ERD vs. MongoDB Persistence:**
   - *Issue:* ERD specifies SQL tables, relational foreign keys, and PostgreSQL schema namespaces.
   - *Resolution:* Map all 47 models to distinct Mongoose schemas with explicit `snake_case` collection names. Relational integrity is enforced at the service layer using multi-document ACID transactions (`session.withTransaction()`).
2. **26-Table Matrix HTML vs. 47-Model ERD Scope:**
   - *Issue:* Dataflow matrix HTML covers 26 tables (GL, Commissions, Close).
   - *Resolution:* Full 47-model scope is implemented by incorporating Module 12 (9 Billing models) and Module 40 (12 Treasury models).
3. **Commission Split Structure:**
   - *Issue:* Conflict between flat 15% broker commission mentions vs canonical Lone Pine structure.
   - *Resolution:* Adopt Lone Pine canonical structure: Gross Premium $37,650; Carrier Summit Mutual 80% ($30,120); MGA Harbor Pool 20% ($7,530) split 50% retained ($3,765) and 50% payable to Broker Brightline ($3,765).
4. **Texas Fiduciary Escrow Regulation (§ 4053):**
   - *Issue:* Escrow holding policy timing.
   - *Resolution:* Modeled as configurable `fiduciaryHoldDays = 30` parameter within `FiduciaryAccount`.
5. **Seven-Step Month-End Close Sequence:**
   - *Issue:* Checklist discrepancy.
   - *Resolution:* Nina's 7-step checklist is explicitly implemented as sequential tasks:
     1. Subledger Reconciliation (AR, AP, Fiduciary vs GL)
     2. UPR Amortization Recognition (Actual/365 pro-rata)
     3. Texas § 4053 Fiduciary Escrow Audit
     4. Carrier & Broker Bordereau Settlement Finalization
     5. Trial Balance Invariant Check ($\sum Dr == \sum Cr$)
     6. Fiscal Period Hard Lock (`LOCKED`)
     7. ERP Export Batch Generation (SAP S/4HANA format)

---

## 4. Exit Gate Affirmation

- [x] Repository audit is complete and evidence-based.
- [x] Scope boundary strictly demarcates 47 finance models from SaaS identity schemas.
- [x] Conflicts logged and resolved with configurable parameters.
- [x] No destructive operations executed on shared database.
