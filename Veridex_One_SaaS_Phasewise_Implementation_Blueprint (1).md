# Veridex One — Real SaaS Finance & Accounting Application
## Phase-by-Phase IDE Implementation Master Prompt

**Purpose:** Build a real, modular, database-backed Finance & Accounting SaaS application with fully defined schemas, functioning backend services and APIs, an interactive frontend, module/tab/subtab navigation, tenant-aware configuration, accounting workflows, seeded data, and verifiable end-to-end behavior.

**Quality target for this stage:** Developer-ready functional SaaS foundation, not a static mockup or disposable prototype. Production hardening, advanced security reviews, deployment operations, high-scale optimization, and formal regulatory certification may be deferred, but architecture must not rely on fake data or shortcuts that make later hardening require a rewrite.

---

# CONTROLLER PROMPT — READ THIS FIRST

Act as the technical lead and full-stack engineer responsible for implementing Veridex One v4.6 Finance & Accounting in the existing repository. You own the coherent end-to-end implementation—not just planning, generating attractive screens, or creating disconnected CRUD forms.

## 1. Core outcome

Deliver an application in which:

- Every in-scope finance model has a documented, implemented schema and a clear purpose.
- Each schema is connected to its owning domain service, validated API operations, frontend view/forms, permissions/configuration hooks, audit trail, and tests.
- Every visible button performs its advertised action against the backend.
- Records and financial calculations persist in the database and remain correct after a browser refresh or app restart.
- Business events connect modules in a traceable way without duplicate financial effects.
- A seeded Lone Pine Trucking scenario can be processed from invoice through payment, commission allocation, ledger, bank reconciliation, UPR, close and trial balance.
- All five finance submodules are usable independently where their declared dependencies/configuration permit, and also work together as one ecosystem.
- A working SaaS platform login and tenant onboarding flow exists before protected finance pages are used: platform operator login, tenant registration/onboarding, tenant admin login, membership-aware workspace selection, logout, and user/role/module administration.
- Finance data and configuration are scoped to the authenticated tenant; platform-wide administration is clearly separated from tenant workspaces.
- No feature is called complete without evidence from code and tests or a documented manual walkthrough.

Do not build a UI-only prototype. Do not use hardcoded dashboard totals, fake CRUD, frontend-only calculations, placeholder buttons, or successful responses that do not represent persisted work.

## 2. Scope boundary — prevent scope confusion

The supplied L3 Physical ERD describes the larger Veridex One insurance platform (457 tables / 52 chapters). This assignment is the **Finance & Accounting ecosystem**, not a rewrite of every non-finance system in that larger platform.

Implement the complete in-scope finance models specified in the documents:

| Submodule | Module | Required models | Count |
|---|---:|---|---:|
| Core General Ledger | 14 | LedgerAccount, FiscalPeriod, PostingRule, PostingRuleLine, Journal, JournalEntry, ExchangeRate | 7 |
| Billing & Accounts Receivable | 12 | BillingPlan, BillingAccount, BillingAccountPolicy, InstallmentSchedule, Invoice, InvoiceLine, Payment, PaymentAllocation, BillingAdjustment | 9 |
| Treasury, Cash & Bank Reconciliation | 40 | PaymentMandate, PaymentAttempt, ProcessorTransaction, BankStatementLine, CashReconciliationMatch, UnappliedCash, PaymentReturn, Refund, DunningPlan, DelinquencyCase, DunningAction, CollectionAssignment | 12 |
| Commissions, Fiduciary Trust & Settlements | 13 | CommissionAgreement, CommissionSchedule, ProfitCommissionSchedule, CommissionSplit, CommissionTransaction, FiduciaryAccount, BordereauDefinition, BordereauRun, BordereauLine, SettlementStatement, SettlementLine | 11 |
| Finance Close, Reconciliation & ERP Export | 41 | SubledgerBalance, ReconciliationCase, TrialBalanceSnapshot, TrialBalanceLine, PeriodCloseTask, GLExportBatch, CommissionAdjustment, CommissionDispute | 8 |
| **Total finance-domain models** | | | **47** |

Note: the dataflow HTML describes a 26-table finance subset (Modules 14 + 13 + 41). That does not replace the 47-model scope above; Modules 12 and 40 add another 21 models. Track all 47 in the catalog and implementation matrix.

Policy Administration, underwriting, rating, vehicle schedule management, claims adjudication/reserving decisions, payment processors, banks, and external ERP products are **external systems or event producers** for this scope unless already implemented in the repository. Do not fabricate those products. Implement stable input contracts, references/snapshots, simulation adapters for development, and clear event-processing flows. Claims-related accounting and claim-payment events may be processed here, but do not represent a claims adjudication system as built.

If the business later explicitly expands scope to the entire 457-table ERD, create a separate scope plan and estimate. Do not silently claim these 47 finance models represent the whole platform.

## 3. SaaS platform login, tenant onboarding and user management — REQUIRED SCOPE

**Yes: the application must include a real SaaS platform login experience. This is core product workflow, not deferred production hardening.** Build it with the backend and database; do not create login-only mock screens or store a fake `isLoggedIn` flag in the frontend.

### Public / unauthenticated routes

- `/login`: email + password login with real backend authentication, field validation, loading/error states and clear invalid-credential feedback.
- `/register` or `/signup`: tenant/company registration if self-service registration is enabled. Create the organization/tenant, the initial user, their tenant membership, and Tenant Admin assignment as one controlled operation. Avoid orphan tenants or users if creation fails.
- `/forgot-password` and reset flow only if a feasible delivery channel already exists or a clearly labelled development reset workflow is implemented. Do not claim email delivery without an email provider.
- `/logout`: invalidate the active session/refresh token or clear the server-backed session as appropriate for the chosen stack.

### Minimum API contract (adapt naming to existing conventions; keep equivalent behavior)

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/auth/register-tenant` when self-registration is enabled; otherwise tenant creation is through a platform-admin endpoint
- `GET /api/tenants/mine`, `POST /api/tenants/:tenantId/activate` or equivalent workspace-selection endpoint
- `GET /api/platform/tenants`, `POST /api/platform/tenants`, `PATCH /api/platform/tenants/:tenantId` for platform-role tenant administration
- `GET /api/tenant/users`, `POST /api/tenant/users`, membership status/role assignment endpoints scoped to the active tenant
- `GET /api/tenant/modules`, `PATCH /api/tenant/modules/:moduleKey` for allowed module settings and entitlement checks
- Use the repository's standard route naming if one exists; avoid creating duplicate endpoints with overlapping behavior. Return validated DTOs, clear status codes and actionable errors.

### Authenticated platform and tenant routes

- Platform Operator / Super Admin workspace: platform overview, tenant directory, tenant create/suspend/reactivate, subscription/plan assignment if implemented, and finance-module entitlements per tenant.
- Tenant workspace: tenant dashboard, organization profile, workspace/tenant selector for users with multiple memberships, user directory, invite/create-user flow, membership status, role assignment and permitted module settings.
- Finance workspace: the modules listed in this specification, visible only when enabled for the active tenant and allowed by the user's role.
- Account menu: active user, active tenant, switch workspace (where membership exists), profile basics and logout.

### Foundation identity/tenancy schemas — ADDITIONAL to the 47 finance models

The 47 listed models remain the finance-domain count. Separately, implement the platform foundation schemas required for SaaS identity and tenant management, adapting to the repository's existing model names if equivalent schemas already exist:

1. `Tenant` / `Organization`: id, name, slug/tenant code, legal/display name fields where needed, tenant type, status, timezone, default currency, created/updated audit fields.
2. `User` / `AppUser`: id, normalized unique email or login identifier, password hash or existing identity-provider subject, display name, status, last-login metadata and audit fields. Never store a plaintext password.
3. `TenantMembership`: user reference, tenant reference, membership type/status, default workspace flag if needed, joined/invited dates and audit fields. Unique membership constraint per user/tenant.
4. `Role`: role code/name, scope (`platform` or `tenant`), description, active status.
5. `Permission`: stable action key and module/resource description.
6. `RolePermission`: role-to-permission mapping with uniqueness and clear ownership.
7. `UserRole` (or equivalent membership-scoped role assignment): which role the user has in a tenant membership; platform roles must be kept separate from tenant roles.
8. `TenantModuleEntitlement` / `TenantModuleConfig`: module key, enabled/disabled state, entitlement source/status, dependency validation and effective dates where needed.
9. `TenantSubscription` / plan assignment if tenant plans are in scope or present in the repository. For this stage, plan assignment can be admin-managed; do not invent SaaS payment collection or billing-provider integration unless already included in the approved scope.
10. Session/token persistence only if required by the chosen authentication/session mechanism; do not duplicate a mature existing auth solution.

Document every foundation schema in `docs/SAAS_IDENTITY_TENANCY.md`, including fields, validations, indexes, references, lifecycle, APIs, screen mapping and tests. These schemas must not be falsely counted among the 47 finance-domain models.

### Initial roles and user journeys

Provide at least:

- `PLATFORM_SUPER_ADMIN`: manages platform tenants and tenant module entitlements; must not accidentally operate inside a tenant ledger without an explicit active tenant context.
- `TENANT_ADMIN`: manages the tenant's profile, members, role assignments and permitted module configuration.
- `FINANCE_ADMIN`: manages finance configuration and all permitted finance workflows.
- `ACCOUNTANT`: COA/journals/reports and accounting actions allowed by policy.
- `BILLING_OPERATOR`: billing accounts, invoices, installments and payment allocation actions allowed by policy.
- `TREASURY_OPERATOR`: receipts, imports, reconciliation, returns and refunds allowed by policy.
- `FINANCE_CONTROLLER`: UPR, reconciliation, close, trial balance and export certification actions allowed by policy.
- `AUDITOR_READ_ONLY`: read-only access to explicitly permitted records and audit/report views.

Role labels can be adapted if the repository already has a coherent RBAC catalog, but the user journeys and least-privilege action distinctions must remain testable.

### Minimum functional login requirements now

- Login state survives page refresh according to the chosen session mechanism; logout ends the session.
- Unauthenticated users are redirected away from protected application routes to `/login`.
- A successful login loads the user's valid memberships and allows entry only to a tenant they belong to.
- If there is one valid membership, select it according to documented behavior; if several exist, require workspace selection or a remembered valid default.
- Every finance API derives/validates active tenant context server-side; never trust an arbitrary frontend `tenantId` as authorization.
- Module navigation and API access both enforce tenant entitlement and relevant role/action permissions. Hiding a menu item alone is not access control.
- Platform administration endpoints must not be callable by ordinary tenant users.
- Tenant creation, initial admin membership/role, and default module config must be created consistently; failures must not leave partial onboarding records.
- Seed a development platform-admin account only via an explicit local-development bootstrap command/environment variables. Never hardcode reusable credentials or print secrets. Provide a documented way to create the first admin if one does not exist.
- If there is no email/SMS provider, label invitation delivery as simulated or provide admin-created users; do not claim a message was sent.

**Security scope distinction:** Full security hardening, external SSO, MFA, password reset email delivery, rate-limit tuning, penetration testing and deployment secrets operations can be deferred. However, basic real login, password hashing if password auth is used, server-side route/API checks, tenant scoping and role enforcement are necessary to make a functioning multi-tenant SaaS workflow. Do not use plaintext passwords or a frontend-only login flag as a shortcut.

### SaaS identity acceptance tests

1. Register a tenant and verify tenant, first user, membership, Tenant Admin role and default entitlement/config records persist consistently.
2. Log in using valid credentials and verify the correct workspace loads; invalid credentials fail without creating a session.
3. Refresh a protected page and verify the supported session behavior; logout and verify the route becomes protected again.
4. A user belonging to two tenants can switch only between their own memberships; tenant A data never appears in tenant B.
5. Tenant A users cannot read or mutate tenant B finance records by changing request parameters or URL IDs.
6. A tenant without Module 40 entitlement cannot open its screens or call Module 40 APIs; an entitled user without the required role is also denied.
7. Tenant Admin can manage tenant users and permitted entitlements but cannot access platform-wide tenant administration unless separately granted a platform role.
8. Bootstrap/seed is rerunnable and does not create duplicate users, tenants, roles or entitlements.

## 4. Repository-first rule

Begin by inspecting the actual repository and supplied source documents. Preserve existing working code. Before changing technology or database engine, inspect package manifests, current models, configuration, migrations/indexes, API routes, frontend routes, tests, and Git status.

There is a documented technology mismatch: `context.txt` and `requirement.txt` name MongoDB + Mongoose, while the L3 physical ERD describes PostgreSQL schemas and relational constraints. Do not silently switch engines. In Phase 0, report the real repository state and choose a canonical implementation path with evidence. If a functioning MongoDB/Mongoose codebase exists, preserve it and explicitly map the relational ERD requirements to collections, references, compound indexes, validators, and transactions. If the repository is genuinely greenfield and has no established database implementation, present the trade-off and obtain approval before choosing. Keep money precision, atomic posting, reference integrity, and auditability non-negotiable whichever engine is selected.

Never print secrets, copy credentials into docs, reset or seed a database until its target is confirmed, overwrite user changes, or run destructive operations on an ambiguous/shared database.

## 5. Build vertical slices, not disconnected layers

For every phase/module, deliver backend and frontend together:

1. Schema and validation
2. Repository/data access and indexes
3. Domain service and business rules
4. API route/controller/DTO and error responses
5. Event/outbox/inbox integration if the flow crosses modules
6. Frontend module page, tab/subtab, list, detail, forms, filters and action states
7. Module configuration and appropriate role/action gating hooks
8. Seed/demo data where appropriate
9. Unit, integration and frontend workflow tests
10. Update docs and the implementation matrix

A schema is not “done” merely because a Mongoose model or TypeScript interface exists. It must have a documented lifecycle and be used correctly by its service/API/UI or be explicitly marked internal-only with a reason.

## 6. Domain schema definition standard — required for EACH of 47 finance models

Create `docs/SCHEMA_CATALOG.md` and a machine-readable model registry (or equivalent maintained source) containing, for each model:

- Canonical model/collection/table name and module owner
- Business purpose and authoritative owning module
- Full field list; types; required/optional; nullable behavior; defaults
- Validation rules, enums/code sets, min/max and cross-field invariants
- Primary identifier strategy and human-readable reference/sequence rules where applicable
- References to other models: local relationship, cross-module REF, or external EXT_REF
- Tenant/business-unit ownership and query scoping behavior
- Money representation and currency rules; no unsafe floating-point arithmetic
- Dates, effective dates, accounting date vs occurred-at date and time-zone policy
- Compound/sparse/unique indexes, query indexes, idempotency keys and concurrency strategy
- Status lifecycle/state transitions and allowed operations by state
- Create/update/deactivate/soft-delete rules; immutable fields; posted-record restrictions
- Audit fields: createdAt/By, updatedAt/By, row version or equivalent, source/event references
- API endpoints and payload DTOs, permissions/actions, frontend screen(s), downstream effects
- Seed examples and positive/negative automated tests
- Source citation within project docs: source file and section/page/chapter when available

Do not store transactional facts only in an unvalidated generic JSON blob. JSON may be used for defined extensibility/metadata only when the contract is versioned and validated. Reference ids that point to another domain must include enough metadata to identify source tenant, source system, entity type/id, version/event position and a needed value snapshot where the source contract calls for it.

## 7. Financial record lifecycle rules

Distinguish editable configuration/master data from financial facts:

- Configuration entities (COA setup, posting rules, billing plans, commission agreements, sweep settings, close checklists) can have controlled CRUD/deactivation/versioning.
- Draft financial records can be edited subject to validation and workflow state.
- Posted journals and certified trial-balance snapshots must not be edited/deleted. Correct mistakes using linked reversal/correction entries in an open period.
- Do not use unrestricted generic CRUD to mutate posted payments, settled cash, posted journal lines or hard-closed period results. Provide business actions (reverse, refund, dispute, reopen with authorized explicit workflow if approved) that preserve auditability.
- Use soft-delete/deactivation where appropriate; never hard-delete posted financial history.
- Financial actions that affect multiple records must be atomic or use a documented, recoverable process. Avoid partial state such as a payment saved while its journal failed silently.
- Enforce idempotency for user-submitted actions and event deliveries.

## 8. Accounting controls that cannot be deferred

Production hardening is deferred; basic financial correctness is not.

- Posted journals must have one or more lines, valid active postable accounts, matching currency/basis/tenant/period context as required, and total debits equal total credits within a documented currency precision policy.
- A journal must not post into a closed/hard-closed period. Draft creation and posting are distinct states.
- Use decimal-safe money math; define rounding at line, invoice, installment, tax and UPR boundaries. Do not depend on binary floating-point equality.
- Separate operating cash and premium trust cash. Cash changes only on an actual/simulated receipt, disbursement or transfer action.
- A payment receipt reduces outstanding receivable only to the extent of its allocation; excess/unidentified funds must be unapplied cash/suspense according to approved rules.
- One event/payment should not create duplicate receipts or journal effects when retried.
- Commission percentages and tiers must come from persisted effective-dated agreements/configuration, not hardcoded UI constants. Validate totals and recipient roles.
- UPR must be reproducible for term, covered premium, effective dates, transaction/endorsement history, leap/day-count policy, accounting basis and rounding convention. Do not double-earn on repeated runs.
- Subledger-to-GL reconciliation must show differences and not silently “force balance.”
- Hard-close must enforce server-side period controls and create an immutable snapshot with balanced debit/credit totals; a balanced grand total by itself does not prove every subledger is reconciled.
- US GAAP and NAIC Statutory SAP should use explicit accounting-basis configuration/posting rule mapping. Do not claim regulator approval. Record any unresolved accounting treatment in `docs/DOMAIN_DECISIONS.md`.

---

# REQUIRED FRONTEND NAVIGATION AND CONFIGURATION

Build a consistent SaaS application shell with tenant/workspace context, persistent sidebar navigation, active tenant/module context, breadcrumb, page title, search/filter patterns, responsive behavior, empty/loading/error states, pagination, toasts, validation summaries, confirmation dialogs and accessible forms. Use a clean professional finance UI. Theme preference (light/dark) should work consistently if implemented in the established UI stack.

All listed navigation entries must lead to a real route and functional page. If a page is not implemented yet, show it as unavailable/phase pending in development navigation rather than a misleading clickable mock.

## A. Public routes and SaaS entry flow

- Login / Logout
- Tenant registration/onboarding (configurable on/off; disabled if platform-admin provisioning is the selected model)
- Workspace/tenant selection for users with multiple memberships
- First platform-admin bootstrap/setup instructions for local development
- Clear inactive/suspended tenant and disabled-module states

## B. Authenticated SaaS shell

- Platform Administration (platform role only): tenant directory, tenant status, tenant module entitlements and plan assignment where in scope
- Tenant Settings: organization profile, users, memberships, roles, permitted module settings
- Account menu: user profile basics, active tenant, workspace switching and logout
- Home / Finance Overview
- Work Queue / Exceptions
- Event Inbox & Processing Status (development operator view)
- Reconciliation & Controls summary
- Configuration
- Help / Build information

Dashboard cards must be computed from database/API results and link to the underlying filtered records. No hardcoded counts or balances.

## C. Module 14 — Core General Ledger

Tabs/subtabs:

1. Overview: posting activity, period state, unbalanced/draft queue, recent journals
2. Chart of Accounts: account list/tree, account detail, create/edit/deactivate, account type/category/normal balance, postable/control-account flags, currency/basis configuration where applicable
3. Journals: draft journals, ready-to-post, posted journal register, journal detail with balanced lines, source event links, reversal/correction action, filters by policy, account, date and period
4. Fiscal Periods: period list, open/soft-close/hard-close state, posting guards, close status
5. Posting Rules: rule list, rule lines, event-to-rule mapping, effective dates, validation/simulation preview, activate/deactivate/version
6. Exchange Rates: rate records, effective date, base/quote currencies, source, controlled CRUD
7. UPR Runs: run history, preview calculation, per-policy/coverage breakdown, posting status, duplicate-run guard and reconciliation
8. Reports: General Ledger, Account Activity, Trial Balance preview

## D. Module 12 — Billing & Accounts Receivable

Tabs/subtabs:

1. Overview: billed, collected, overdue and unapplied amount from live APIs
2. Billing Accounts: account register, detail, linked parties and policy references
3. Billing Plans: Full Pay, 4-Pay 25% down, 10-Pay; cadence, installment/fee handling, effective dates, validation
4. Account–Policy Links: billing account to external policy reference snapshots
5. Installments: schedule, due dates, billed/paid/overdue state, adjustments and payment allocation history
6. Invoices: invoice register, create from supported source/action, invoice detail, editable draft, issued/void/reversal lifecycle as defined; itemized invoice lines
7. Invoice Lines: premium, fee and tax line types driven by configured rules; source calculation and rounding visible
8. Payments: receipt register, simulated receipt action, payment detail, unapplied/partially allocated/allocated/returned states
9. Payment Allocations: allocate/unallocate only under allowed lifecycle; apply amount to specific invoice/line with over-allocation prevention
10. Billing Adjustments: fees, waivers, credit memos/discounts with reason, approval/status and accounting effect
11. Reports: aging, invoice register, installment due list and AR control totals

## E. Module 40 — Treasury, Cash & Bank Reconciliation

Tabs/subtabs:

1. Overview: trust/operating account balances from ledger, unmatched bank lines, pending returns/refunds
2. Payment Mandates: token/reference only for simulated or external provider; do not store raw bank/card credentials
3. Payment Attempts: simulated/provider status, retries/declines and linkage to a payment
4. Processor Transactions: external transaction reference, fees, gross/net amounts and payment mapping
5. Bank Statement Import: CSV first; MT940 only if a real parser and tested format are implemented. Include preview, validation errors, duplicate detection and import summary
6. Bank Statement Lines: list/detail, unmatched/matched/excluded states
7. Bank Reconciliation: two-pane statement lines vs internal processor/payments, exact reference+amount auto-match, manual match, unmatch where allowed, difference reason, audit history
8. Unapplied Cash: suspense register, match to payer/invoice, partial allocation and remaining amount
9. Payment Returns / NSF: return reason, reversal effect and surcharge rule when configured
10. Refunds: request, approve, execute/simulate payout, link cancellation/source transaction, prevent over-refund
11. Dunning Plans: configurable timelines and notice actions; no unverified claim of legal compliance
12. Delinquency Cases: balance, due dates, state and resolution history
13. Dunning Actions: generated/simulated actions, delivery status and idempotency
14. Collection Assignments: owner, queue, assignment/reassignment and work status
15. Reports: cash movement, trust/operating separation, unapplied cash and bank reconciliation exceptions

## F. Module 13 — Commissions, Fiduciary Trust & Settlements

Tabs/subtabs:

1. Overview: pending commissions, eligible sweep amounts, carrier settlements, bordereau runs
2. Commission Agreements: parties, payer/payee, base, rate model, effective dates, business type, calculation basis and approval/status
3. Commission Schedules: versioned tiers/rates and calculation inputs; no hardcoded universal rates
4. Profit Commission Schedules: profit/eligibility formula with documented assumptions and test cases
5. Commission Splits: MGA/broker/producer share hierarchy, split validation, effective dates and rounding rules
6. Commission Transactions: source policy/invoice/payment references, calculation trace, accrued/earned/payable/paid/reversed status
7. Fiduciary Accounts: account type, tenant/owner, bank reference, currency, jurisdiction/configuration and restrictions separating trust from operating cash
8. Sweep Eligibility: age/effective date, collected funds, earned commission eligibility, exceptions and preview; configurable days must not be presented as legal advice
9. Sweep Runs/Transfers: preview, approval/configuration gates, balanced transfer journals, history and retry-safe actions
10. Bordereau Definitions: versioned carrier reporting layout/filter/configuration
11. Bordereau Runs: date range, source data, validation, preview/export and generation status
12. Bordereau Lines: drill-through to policy/commission/claim accounting references
13. Settlement Statements: carrier, period, gross premium, retained commission, claim offsets where supported, net payable and status
14. Settlement Lines: itemized traceable statement components
15. Commission Adjustments: clawback/reversal/other approved adjustment with source reference and approval trail
16. Commission Disputes: disputed amount, reason, evidence/reference, status and resolution workflow
17. Reports: commission calculation register, fiduciary activity, sweep eligibility and carrier settlement reconciliation

Note: CommissionAdjustment and CommissionDispute are owned by Module 41 in the provided 47-model count even if linked from the commissions UI. Keep schema ownership at Module 41 and expose a suitable cross-module link/view without creating duplicate models.

## G. Module 41 — Finance Close, Reconciliation & ERP Export

Tabs/subtabs:

1. Overview: close readiness, unresolved exceptions, trial balance status and export queue
2. Subledger Balances: billing AR/AP-related balances and GL control accounts; as-of date and source totals
3. Reconciliation Cases: type, account, expected/actual/difference, owner, notes, resolution and audit history
4. Close Calendar / Fiscal Period: period selection and dependencies
5. Close Checklist: implement the required seven-step Nina close checklist as explicit configured tasks, statuses, ordering, blockers, evidence and completion history. Do not silently reduce it to a smaller checklist. Map tasks to the source documents and document any discrepancy
6. Trial Balance: live preview, account balances, debit/credit columns, filters and drill-through
7. Trial Balance Snapshots: create/certify, immutable snapshot details, totals, included journals, created-by/time and period state
8. GL Export Batches: export preview, JSON; XML only with validated schema; downloadable file, batch totals, status and simulated external acknowledgment. Never fake a real SAP/NetSuite response
9. Commission Adjustments: linked adjustment register and review
10. Commission Disputes: linked dispute workflow
11. Reports: period-close report, reconciliation differences, journal export history

## H. Configuration Center — must be real and data-backed

Provide configuration pages/services for:

- Tenant profile, tenant status, owner/admin membership and tenant-specific feature/module enablement
- Module dependency rules and module availability state
- User management, membership lifecycle, role assignments and action permissions
- Platform vs tenant administration boundaries, and workspace-selection rules
- Session/login/logout configuration hooks appropriate for the existing app (advanced hardening may be deferred, but real server-side authentication and tenant scoping may not)
- Fiscal year, periods and close checklist definitions
- Chart of Accounts and control-account mappings
- Posting rules, event type mappings and accounting basis mappings
- Currency precision, rounding policy and exchange-rate source/configuration
- Billing plans, installment patterns, fees, tax calculation rules and effective dates
- Commission agreements, rates, split hierarchy and effective dates
- Fiduciary account types and sweep eligibility settings
- UPR day-count, coverage allocation, transaction-effective-date and rerun/idempotency settings
- Bank import format mappings and reconciliation match tolerances
- Bordereau/settlement layout and filter definitions
- ERP export mappings and schema versions
- Event subscriptions, retries, dead-letter/error resolution and idempotency status
- Seed/demo-data settings (development only, clearly labelled; no silent destructive reset)

Configuration changes must persist, validate, take effect according to effective dates/versioning, and be traceable. Do not scatter magic numbers across UI components/services.

---

# PHASED IMPLEMENTATION PLAN — FRONTEND + BACKEND TOGETHER

Every phase ends with tests, evidence and a go/no-go report. Work phase-by-phase, but avoid artificial stops between backend and frontend within the same vertical slice.

## Phase 0 — Repository and source audit

- Inspect actual repository, Git status, stack, database, routes, components, scripts, tests, existing authentication/login, tenant model, users/roles and supplied documents.
- Create `docs/PHASE_0_REPOSITORY_AUDIT.md`, `docs/DOMAIN_DECISIONS.md`, `docs/SCHEMA_CATALOG.md` skeleton, `docs/HAPPY_FLOW_PLAN.md` and `docs/SAAS_IDENTITY_TENANCY.md` skeleton.
- Produce a 47-finance-model inventory plus a separate platform-identity/tenant model inventory; mark each as existing/partial/missing/unverified.
- Verify whether real login, registration/onboarding, session handling, tenant selection, user management, role mapping, and tenant-module entitlement behavior already exist.
- Resolve/raise the database engine conflict before schema implementation.
- Extract source contradictions: 26-model matrix subset vs 47 overall models; commission agreement interpretations; invoice tax/fee breakdown; UPR assumptions; legal sweep claim; conflicting July earned premium breakdown; and the exact seven close tasks.
- Do not implement features, install packages, seed data, migrate or modify existing config in this phase.

**Exit gate:** audit is evidence-based; source conflicts and decisions are logged; no destructive actions performed.

## Phase 1 — SaaS login, tenant onboarding, foundation and navigable shell (API + UI)

- Establish the existing chosen stack's application boot, environment validation, database health check, consistent API response/error handling, schema validation approach, logger without secrets, common audit metadata and test setup.
- Implement the working SaaS login and identity journey described in Section 3: login, logout, tenant registration/onboarding or platform-admin provisioning, tenant memberships, workspace selection, user directory, role assignment and platform-vs-tenant administration. Reuse an existing functioning auth implementation if present; do not create duplicate auth systems.
- Add field-validated backend APIs and persistent schemas for missing platform foundation entities. Use password hashing for password auth; use the repository's established session/JWT approach if one exists. Do not rely on a frontend-only login flag.
- Add platform-admin local bootstrap using environment-provided credentials or an interactive/local command; never hardcode default credentials. Document if user invitation/email delivery is simulated because no provider exists.
- Implement server-side tenant context and minimal route/API permission checks. Advanced security hardening remains deferred, but tenant boundary and basic role enforcement are prerequisites for SaaS workflows.
- Build the responsive frontend shell and full navigation tree from the module/tab/subtab requirements above. Unauthenticated public routes and authenticated tenant routes must be distinct.
- Add configuration-driven module/navigation registration and explicit module statuses. Avoid fake metrics/actions.
- Set up shared API client, route structure, loading/error/empty states, reusable data table/form/modal/detail patterns, feedback/toast and theme if consistent with existing UI.
- Implement a build/module registry and per-tenant module configuration model/service if not already present.

**Exit gate:** app starts; database connection is genuinely checked; valid/invalid login, logout, protected-route behavior and tenant onboarding/provisioning are tested; active workspace loads from a real membership; basic user/role/module configuration persists; server APIs enforce active tenant and platform-vs-tenant boundaries; navigation and configuration registry load from backend; every not-yet-built finance page is labelled pending/unavailable rather than pretending to work.

## Phase 2 — Complete field-level model catalog and persistence layer

- Finalize all 47 finance model schemas using the schema definition standard above.
- Separately finalize and implement any missing SaaS foundation schemas listed in Section 3 (Tenant, User/AppUser, TenantMembership, Role, Permission, RolePermission, UserRole, tenant module entitlement/config, and plan/subscription assignment if in scope). Do not add these to the 47 finance-model count.
- Implement models, validators, indexes, reference policies, state enums, audit fields, uniqueness/idempotency constraints and seed builders.
- Create explicit ownership/dependency map and API-to-model map.
- Ensure indexes are safe and idempotently created for the chosen database.
- Design references so external entities can be stored as validated snapshots/EXT_REF values without creating fake local PAS/Claims tables.
- Add schema validation tests, index/uniqueness tests, lifecycle tests, reference validation tests and deterministic seed tests.
- Never create a model with only `_id`, `name`, `status` just to satisfy a model count.

**Exit gate:** all 47 finance models plus required SaaS foundation models are implemented or have a documented blocker; finance-model count stays separately identifiable; catalog exactly matches code; validators/indexes pass; safe deterministic demo seeding can run in an approved development database.

## Phase 3 — Module 14 GL vertical slice (API + UI)

- Implement COA management, accounts tree/list/detail, controlled create/edit/deactivate, fiscal periods, journal draft/line editing, validation, posting rules/lines, exchange rates and journal register/details.
- Implement one posting service as the ONLY path to post financial journals; direct routes may not bypass its invariants.
- Add journal source metadata (source module/entity/event), account and period validation, currency/basis handling, balanced debit/credit checking, reversal links and immutable posted state.
- UI must support searching/filtering by date, period, account, policy/source reference and state; drill from account activity to journal and source record.

**Exit gate:** positive and negative journal tests pass; unbalanced/closed-period/inactive-account postings are rejected; journal balances persist and can be found by query after restart.

## Phase 4 — Module 12 Billing & AR vertical slice (API + UI)

- Implement billing accounts, policy references, configurable billing plans, schedules, invoices/lines, payments/allocations and adjustments.
- Generate the supported 4-Pay scenario from configured rules. Keep the $9,412.50 premium installment and $150 fee separate. Do not add taxes/stamping fees to that sample unless the selected demo scenario/config says to do so.
- Invoice issue must post through a posting rule/event handshake once. Payment allocation must not exceed the eligible invoice balance; partial payments and unapplied cash need explicit handling.
- Show the live AR aging/outstanding balance and invoice/payment drill-through in the frontend.

**Exit gate:** invoice and schedule persist; source/config math is reproducible; issuing twice does not duplicate the same source invoice; payment/allocations update outstanding AR and journal once; UI totals match API/database calculations.

## Phase 5 — Module 40 Treasury vertical slice (API + UI)

- Implement payment attempts/provider transaction references, bank statement imports, statement lines, reconciliation matches, unapplied cash, payment returns, refunds, dunning and collection assignments.
- Build the two-pane reconciliation UI, CSV import preview/validation, exact-reference + amount auto-match, manual match, match reversal where allowed, and exception queues.
- Keep external payment gateway/bank activity simulated until real connectors exist, and label all simulations.
- A returned payment/refund must use the defined reversal/refund lifecycle; no direct deletion of old cash records.

**Exit gate:** import rejects/flags duplicate lines; auto/manual matching persists; unmatched money remains visible; bank and payment mismatches create exceptions; retrying actions cannot double process cash.

## Phase 6 — Module 13 Commissions, Trust and Settlements (API + UI)

- Implement agreements, commission schedules, profit commission schedules, splits, commission transactions, fiduciary accounts, sweep eligibility/runs, bordereau definitions/runs/lines and settlement statements/lines.
- Create the demo commission agreement as persisted, effective-dated configuration. Make the chosen model explicit: (A) final carrier/broker/MGA split 80/10/10, or (B) MGA gross commission 20% then Broker receives a 10% payable/expense depending on contract semantics. Do not confuse these interpretations or calculate rates as independent shares without a contract hierarchy.
- Commission allocation is not itself a bank movement. Post a balanced clearing/payable/revenue entry from a valid configured accounting flow. The trust bank only changes on receipt or actual/simulated transfer.
- Fiduciary sweep days/settings must be configurable and marked as demo policy pending legal/accounting confirmation; no legal-compliance claim without an approved source/rule.
- Generate browsable/exportable bordereaux and settlement lines with source drill-through.

**Exit gate:** commission totals reconcile to the selected contract, payer/payee split, source premium and rounding policy; allocation does not duplicate or invent cash; fiduciary cash remains segregated; settlement math is traceable.

## Phase 7 — UPR and accounting basis behavior (API + UI)

- Implement UPR run preview/history and posting with policy term, covered premium components, endorsements/changes, effective dates, earned days, basis and rounding details.
- Make run idempotency explicit: rerun should detect identical work and not duplicate earnings; a corrected run must use documented adjustments/reversal behavior.
- Support separate posting-rule/account mappings for US GAAP and NAIC SAP when the policy has been decided and tested. Do not claim identical treatments where requirements differ.
- Show earned/unearned roll-forward and link each amount to its source premium/rule/run.

**Exit gate:** independently verifiable calculations; July seeded scenario reconciles to the selected documented breakdown; UPR + earned premium roll-forward agrees with the defined premium basis within rounding rules; repeated run does not double-post.

## Phase 8 — Module 41 Reconciliation, close, snapshots and export (API + UI)

- Implement subledger balances, reconciliation cases, seven explicit close tasks, immutable TB snapshots/lines, export batches and Module-41 commission adjustments/disputes.
- Define close dependencies and blockers. Show task status and evidence per task. No UI-only close toggle.
- Before certification, validate period postings, debit/credit equality, AR/subledger control-account reconciliation, bank reconciliation, UPR completion and required bordereau/settlement tasks as configured.
- On certification, persist a snapshot, its lines, included journal range/hash or reproducible source list, totals and status; then enforce the specified hard-close posting restriction.
- Generate a downloadable JSON export using a documented versioned output schema. XML must not be offered as real ERP interchange until a schema is documented and tested. External acceptance is simulated unless an actual connector is configured.

**Exit gate:** unresolved mandatory blockers prevent close; certified snapshot is immutable; hard-closed period rejects new posting; export totals match certified journal selection.

## Phase 9 — Event contracts and complete Happy Flow integration

- Implement versioned inbound/outbound event contracts for required events, including at least invoice-issued/payment-received, commission-allocated, policy endorsed/cancelled/reinstated (external event), claim reserve/payment accounting events (external event), earned-premium run and close/export status.
- If the codebase supports a real transactional outbox/inbox, use it. Otherwise provide the closest honest reliable pattern for the selected database, document delivery guarantees, persist processing outcomes, retries/errors and idempotency keys. Never claim exactly-once transport; enforce one-time financial effects at consumer level.
- Event consumer validates tenant/source entity/reference/version/payload and creates a durable inbox record before or atomically with its processing lifecycle as supported by the architecture.
- Add event replay/resume controls with duplicate guards, failure visibility and audit trace.
- Complete the end-to-end seeded workflow: invoice -> payment receipt/allocation -> commission -> ledger -> bank match -> UPR -> reconciliation -> seven-step close -> trial balance -> export.
- Add a workflow detail/trace screen that shows IDs and linked records across modules.

**Exit gate:** the complete journey passes integration tests and manual UI walkthrough. Re-delivered events and double-click/retry do not double-post; every amount can be traced from source to journal and report.

## Phase 10 — Finish all screens and schema-action mapping

- Verify every tab/subtab listed in this document has a real route and is backed by implemented APIs/data.
- For every model in the schema catalog, add a row to `docs/SCHEMA_UI_API_MATRIX.md` mapping model -> CRUD/state actions -> service/API -> screen/tab -> configuration -> tests.
- Any model intentionally not shown as its own standalone screen must have its functionality available through its owner workflow or be explicitly documented as internal-only with rationale.
- Remove unused mock arrays, hardcoded numbers, fake success responses and inert controls. Use seeded fixtures only as database records.
- Verify responsive behavior, validation messages, empty/loading/error states, filters, pagination, sorting and data refresh.

**Exit gate:** no advertised control is inert; all 47 model entries are mapped; all completed screens use the real backend; no unlabelled mock data appears in the business UI.

## Phase 11 — Acceptance suite and handoff

- Run unit tests for money math, posting rules, commission rules, UPR, invoice schedules, allocations, matching, period close and event idempotency.
- Run API/integration tests for all five modules.
- Run frontend end-to-end tests for public login/register routes, valid/invalid login, logout, protected routes, tenant onboarding, workspace switching, user/role management, module entitlements, primary finance navigation, create/edit/action flows, persisted data after refresh, invalid operations and full Happy Flow.
- Report actual commands/results; do not mark skipped tests passed.
- Provide setup and run instructions, environment variable template with placeholders only, seed/rollback instructions safe for local development, API/module docs, schema catalog, event contracts, domain-decision log and known gaps.
- Create a deferred production-hardening checklist rather than claiming production readiness. Include full auth/RBAC hardening, tenant isolation review, secrets management, threat modeling, rate limits, observability, backups/restore, deployment/CI/CD, performance/load tests, accessibility, disaster recovery and formal accounting/regulatory validation as future work.

**Exit gate:** all stated Happy Flow acceptance tests pass or each failure is documented with reproduction steps, evidence and severity. The project is described accurately as a functioning developer-ready SaaS application, not production certified.

---

# HAPPY FLOW — ACCEPTANCE TEST SCENARIO

Use the source scenario below as seed/demo input, not as permission to invent unresolved accounting rules:

- Policy reference: `POL-TX-8821`
- Insured reference: Lone Pine Trucking
- Policy term: 2026-07-01 through 2027-07-01 (document describes a 365-day term)
- Annual premium: USD 37,650.00
- 4-pay down installment: USD 9,412.50
- Policy fee in this particular sample: USD 150.00
- Initial amount due: USD 9,562.50
- Endorsement reference: adding truck T5 effective 2026-09-01, documented delta premium USD 7,222.19 (confirm calculation/calendar convention before treating as authoritative)
- Cancellation sample: return premium USD 10,000.00; broker clawback USD 1,000.00 (illustrative input; refund and clawback must use their configured, separately traceable lifecycles)
- Claims accounting sample: reserve/payment events reference total reserve USD 39,000.00 and a USD 7,400.00 payment; do not build claims adjudication or invent a reserve-change journal without the event/accounting mapping.
- July earned-premium sample: total USD 3,197.67 and remaining UPR USD 34,452.33. The dataflow file contains other per-coverage figures which may not match the total; reconcile them and record the selected source-of-truth breakdown before sign-off.

A test should prove:

0. SaaS identity journey: register/provision a tenant; create or bootstrap its first admin; log in; load the correct workspace; refresh; switch only to a valid membership; log out; verify protected routes/API calls no longer work without a session. Verify tenant and role access checks at the API, not only in the UI.
1. Invoice created in UI -> invoice and lines persisted -> invoice-issued event/posting applied once.
2. Invoice page displays the API-derived total and outstanding amount.
3. Simulated successful payment -> payment persisted -> allocation persisted -> AR reduced appropriately -> balanced journal posted once.
4. A partial payment leaves correct residual AR; over-allocation is rejected; unidentified excess becomes unapplied cash only under the configured flow.
5. Commission agreement is loaded from database and calculation trace shows base, rates, parties, effective date, rounding and total.
6. Commission allocation produces correct liabilities/revenue/clearing movements without duplicating bank cash.
7. Bank statement CSV import -> parsed rows persist -> exact match and manual match work -> duplicates and mismatches are reported.
8. UPR preview shows dates, day count, premium basis, earned amount, cumulative earned, remaining UPR, basis and rounding; posting is idempotent.
9. Cancellation/endorsement/reinstatement external events are validated and recorded; resulting finance effects follow approved configured posting rules with source references.
10. Reconciliation page shows differences rather than hiding/forcing them.
11. All seven close tasks show explicit states, blockers and evidence; required failures prevent certification.
12. Trial balance snapshot is balanced, immutable and tied to its period and selected journal set.
13. Hard-closed periods reject backdated posting; correction uses permitted reversal/correction workflow.
14. JSON export is downloadable and totals reconcile with the snapshot; simulated external acknowledgment is clearly labelled.
15. Refresh browser and restart application: the same records and balances remain and are read from the database.
16. Deliver the seed/workflow test report with journal IDs, source IDs, expected vs actual totals and pass/fail evidence.

---

# REQUIRED PROJECT DOCUMENTS

Maintain these as implementation artifacts, not aspirational documents:

- `docs/PHASE_0_REPOSITORY_AUDIT.md` — actual source/code audit
- `docs/SAAS_IDENTITY_TENANCY.md` — login flow, user/tenant schemas, memberships, roles, module entitlements, route/API behavior and tests
- `docs/DOMAIN_DECISIONS.md` — unresolved decisions, selected demo assumptions, owner and reason
- `docs/SCHEMA_CATALOG.md` — field-level documentation for all 47 finance models
- `docs/SCHEMA_UI_API_MATRIX.md` — each model mapped to API, UI, configuration, tests and lifecycle
- `docs/HAPPY_FLOW_PLAN.md` — end-to-end sequence and dependencies
- `docs/EVENT_CONTRACTS.md` — event versions, producers/consumers, idempotency and failure behavior
- `docs/API_REFERENCE.md` or equivalent generated OpenAPI specification
- `docs/ACCOUNTING_RULES.md` — posting templates, UPR policies, rounding, close gates and known distinctions by basis
- `docs/RUNBOOK_LOCAL_DEV.md` — safe setup, startup, first-platform-admin bootstrap, login/onboarding, seed and testing instructions
- `docs/DEFERRED_PRODUCTION_HARDENING.md` — honest future hardening checklist

## FINAL BEHAVIORAL INSTRUCTIONS

Do not implement all phases in one giant response or one unreviewed code dump. Work directly in the existing IDE/repository. Finish one phase, run the relevant checks, inspect diffs and report evidence before continuing.

When blocked by conflicting source requirements, do not hallucinate a business rule. State the exact conflict, show the source examples, propose a safe configurable demo assumption and request approval only when the ambiguity affects correctness or architecture.

Start with Phase 0. Do not claim the app is complete until the Happy Flow and the 47-model mapping are verified. Advanced security hardening can be deferred, but the basic SaaS login/onboarding workflow, server-side tenant context, minimal role enforcement, financial correctness, persistence, recoverability and clear workflow behavior cannot.
