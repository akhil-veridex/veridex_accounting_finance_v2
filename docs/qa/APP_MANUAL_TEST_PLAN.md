# Veridex One — Application Manual QA Test Plan & System Inventory

**Document:** `docs/qa/APP_MANUAL_TEST_PLAN.md`  
**Application:** Veridex One Multi-Tenant Insurance Finance & Accounting SaaS  
**Version:** 4.6.0  
**Target Environment:** Isolated Development / Test Environment  
**Frontend URL:** `http://localhost:3000` (Vite 5.4.21 / React 18)  
**Backend URL:** `http://localhost:5050` (Express 4.21 / Node.js v24.18.0)  
**Database Target:** MongoDB Atlas Replica Set (`ReplicaSetWithPrimary`), DB: `veridex_finance_Accounting_Akhilesh`  
**Test Marker Prefix:** `QA_MANUAL_20261015_<short-id>`  
**Date:** October 15, 2026  
**Auditor / QA Lead:** Senior QA Engineer & Systems Platform Maintainer  

---

## 1. Environment Safety & Identification

### 1.1 Safe Environment Confirmation
- **Target Category:** Dedicated development / test database (`veridex_finance_Accounting_Akhilesh`).
- **Cluster Topology:** `ReplicaSetWithPrimary` (3-node MongoDB Atlas replica set, multi-document transactions enabled).
- **Credentials Policy:** Zero secrets, passwords, or raw connection strings are exposed in this test plan or generated logs.
- **Data Safety Mandate:**
  - Historical journals, seeded production records, closed accounting periods, and audit trails are strictly immutable.
  - Hard deletions on financial transactions are prohibited; only soft-delete/deactivation is evaluated.
  - Ephemeral test records are tagged with the unique run marker `QA_MANUAL_20261015_*`.

---

## 2. Navigable Screen & Menu Inventory

The Veridex One single-page application exposes 16 primary modules and workspaces accessible via the persistent sidebar:

### 2.1 Financial Operations
| Tab ID | Nav Label | Component | Primary Entities & Capabilities |
| :--- | :--- | :--- | :--- |
| `dashboard` | **Dashboard** | `TenantDashboardPage.jsx` | Real-time GL health, AR totals, cash balances, fiduciary status, recent journal entries. |
| `gl` | **General Ledger** | `GLWorkspacePage.jsx` | Chart of Accounts (COA), Journal Entries, General Ledger Inquiry, Fiscal Periods, Trial Balance. |
| `billing_ar` | **Billing & Accounts Receivable** | `BillingWorkspacePage.jsx` | Direct/Agency Invoices, Installment Schedules, Customer Payments, Credit Adjustments, Allocations. |
| `commissions_fiduciary`| **Commissions & Settlements** | `CommissionsWorkspacePage.jsx`| Fiduciary Accounts, Commission Schedules, Fiduciary Trust Sweeps (§ 4053), Carrier/Broker Settlements. |
| `treasury_bank_rec` | **Treasury & Bank Rec** | `TreasuryWorkspacePage.jsx` | Bank Accounts, Statement Feed, Transaction Matching, NSF Payment Returns, Refund Disbursements. |
| `finance_close` | **Finance Close & Reports** | `FinanceCloseWorkspacePage.jsx`| Period Close Checklist, Straight-Line UPR Amortization Runs (ASC 944), Trial Balance Certification. |
| `counterparties` | **Counterparties** | `CounterpartiesPage.jsx` | Business Entities (Carriers, MGAs, Brokers, Reinsurers, Vendors), Bank Mandates, Subledgers. |

### 2.2 Accounting Configuration & Rules Engine
| Tab ID | Nav Label | Component | Primary Entities & Capabilities |
| :--- | :--- | :--- | :--- |
| `event_definitions` | **Event Definitions** | `EventDefinitionsPage.jsx` | Business Event Catalog, JSON Schema Validation, Required Fields, Event Code Uniqueness. |
| `posting_rules` | **Journal Entry Rules** | `PostingRulesPage.jsx` | Dynamic Rule Builder, Condition Matching, Multi-Line Formula Evaluation, DRAFT $\to$ PUBLISHED lifecycle. |
| `event_simulator` | **Event Simulator** | `EventSimulatorPage.jsx` | Dry-run Event Payload against Published Rules, Balanced Line Preview, Dry-Run vs Real Post. |
| `event_operations` | **Event Operations** | `EventOperationsPage.jsx` | Transactional Outbox/Inbox Pipeline, Delivery Stats, Dead-Letter Queue (DLQ), Event Replay with Audit Reason. |
| `rule_tests` | **Rule Test Cases** | `RuleTestCasesPage.jsx` | Automated Rule Regression Test Cases, Expected Journal Line Assertions, Test Runner. |
| `config_bundle` | **Configuration Bundle** | `ConfigBundlePage.jsx` | Tenant Rule & Event Export/Import, JSON Schema Migration Bundles. |

### 2.3 Administration (Role-Guarded)
| Tab ID | Nav Label | Component | Primary Entities & Capabilities |
| :--- | :--- | :--- | :--- |
| `users` | **Users & Roles** | `UserManagementPage.jsx` | User Invitations, Role Assignments, System Roles vs Custom Roles, Status Deactivation. |
| `settings` | **Organization Settings** | `OrganizationSettingsPage.jsx` | Tenant Profile, Base Currency, Timezone, Fiscal Year Configuration, Feature Toggles. |
| `modules` | **Module Configuration** | `ModuleConfigPage.jsx` | Enable/Disable 5 Core Modules (`GL`, `BILLING_AR`, `COMMISSIONS_FIDUCIARY`, `TREASURY_BANK_REC`, `FINANCE_CLOSE`). |

---

## 3. User Roles & Permission Matrix

| Role Code | Role Name | Scope & Authority |
| :--- | :--- | :--- |
| `PLATFORM_ADMIN` | Platform Administrator | Global cross-tenant oversight, tenant provisioning, system health, platform audit logs. |
| `TENANT_ADMIN` | Tenant Administrator | Full administrative and accounting control over all tenant modules, users, rules, and close. |
| `CONTROLLER` | Financial Controller | Approval of journal entries, closing fiscal periods, certifying Trial Balance, managing COA. |
| `STAFF_ACCOUNTANT`| Staff Accountant | Creating invoices, entering payments, recording manual journals, executing UPR runs. |
| `TREASURY_ANALYST`| Treasury Analyst | Managing bank statements, matching statement lines, issuing refund disbursements, NSF returns. |
| `AUDITOR` (Read) | Compliance / Auditor | Read-only inspection of GL journals, subledgers, trial balance, and audit trails. Cannot post. |

---

## 4. Known Unsupported & Blocked Workflows (v4.6.0 Boundaries)

1. **Inter-Tenant Automated Live Messaging Bridge:**
   - **Status:** **UNSUPPORTED BY DESIGN IN v4.6.**
   - Carrier, MGA, and Broker operate in independent tenant books. When an MGA disburses settlement to a Carrier, no automatic inter-tenant webhook/event is dispatched. Settlement transfers occur over external domestic banking rails (ACH/Wire) and are entered independently.
2. **Hard Deletion of Financial Journals:**
   - **Status:** **PROHIBITED BY DESIGN.**
   - In accordance with standard accounting standards (GAAP/IFRS), posted journals cannot be deleted or mutated. Corrections must be booked as reversal or adjustment entries.
3. **Account 1020 Plug Entry:**
   - **Status:** **ELIMINATED.**
   - No workflow or rule may reference or create entries in Account 1020.

---

## 5. Ordered Test Execution Plan

1. **Session & Authentication Verification:**
   - Verify Login form, validation of missing/invalid credentials, successful authentication, JWT issuance, profile hydration, and session persistence.
   - Verify Logout and protected route redirection.
2. **Sidebar & Screen Navigation Verification:**
   - Visit all 16 tabs sequentially via Chrome browser automation.
   - Verify DOM rendering, absence of console errors, and correct page headers.
3. **Module CRUD Operations:**
   - Exercise Create, Read, Update, and Deactivate/Soft-delete across:
     - Counterparties (`CounterpartiesPage`)
     - Chart of Accounts (`GLWorkspacePage`)
     - Event Definitions (`EventDefinitionsPage`)
     - Posting Rules (`PostingRulesPage`)
     - Invoices (`BillingWorkspacePage`)
     - Payments (`BillingWorkspacePage`)
     - Bank Accounts (`TreasuryWorkspacePage`)
     - Fiduciary Sweeps (`CommissionsWorkspacePage`)
     - Users (`UserManagementPage`)
4. **End-to-End Happy Flows:**
   - Flow A: Carrier Direct Billing & UPR Earning
   - Flow B: MGA Agency Billing, Fiduciary Sweep (§ 4053) & Settlement
   - Flow C: Broker Retail Client Billing & Producer Split
5. **Accounting Reconciliation Verification:**
   - Subledger balance == GL balance
   - Trial Balance mathematical balance ($Dr = Cr, \text{Variance} = \$0.00$)
6. **Negative & Resilience Checks:**
   - Missing rule handling, ambiguous rule rejection, over-sweep rejection, closed-period rejection, tenant isolation.
