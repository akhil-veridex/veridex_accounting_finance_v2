# Veridex One v4.6 — Phase R3 Preflight Inspection & Baseline Record

**Date:** October 14, 2026  
**Module:** Durable Transactional Outbox/Inbox, Event Dispatcher, Retry & Delivery Observability  
**Status:** Preflight Verified — Ready for Implementation  

---

## 1. Inspection of Existing Models and Services

### 1.1 Existing Models (`backend/src/models`)
- `EventDefinition.js`: Tenant-scoped catalog of event types and JSON Schema Draft-07 contracts. Compound index: `{ tenant_id: 1, event_type: 1, version: 1 }`.
- `PostingRule.js`: Tenant-scoped configurable posting rules with match conditions, priority, specificity, and lifecycle (`DRAFT`, `VALIDATED`, `PUBLISHED`, `RETIRED`).
- `PostingRuleLine.js`: Debit/credit lines with AST-based safe formula expressions.
- `PostingRuleTestCase.js`: Test assertions without GL side effects.
- `Journal.js` & `JournalEntry.js`: Immutable double-entry ledger with source module classification, period lock checks, duplicate reference protection, and balance equilibrium.
- **Outbox/Inbox/Subscription Models**: Currently **none** exist. `OutboxEvent`, `InboxMessage`, and `EventSubscription` will be created as clean, tenant-scoped Mongoose models following existing repository patterns.

### 1.2 Existing Services
- `backend/src/services/eventSchemaValidator.js`: JSON Schema Draft-07 validator using `ajv` and `ajv-formats`.
- `backend/src/services/formulaEngine.js`: Custom AST recursive-descent parser and evaluator using `bignumber.js` (zero `eval`, forbidden identifier protection).
- `backend/src/services/postingRuleResolver.js`: Deterministic rule resolver evaluating specificity, priority, and ambiguity (`AMBIGUOUS_RULE_MATCH`).
- `backend/src/services/eventSimulatorService.js`: Zero-side-effect simulation and explicit GL posting via `postJournalEntry(..., { sourceModule: 'RULES_ENGINE' })`.
- `backend/src/services/glPostingService.js`: Core GL posting engine enforcing debits = credits, account status, and fiscal period locks.

### 1.3 Baseline Direct-GL Posting Call Sites
Inspected legacy domain services:
- `backend/src/services/billingService.js`: Direct calls to `postJournalEntry()` for Invoice Issued, Payment Applied, and Delinquency.
- `backend/src/services/treasuryService.js`: Direct calls to `postJournalEntry()` for NSF Return and Refund.
- `backend/src/services/commissionService.js`: Direct calls to `postJournalEntry()` for Commission Accrual, MGA Sweeps, and Carrier Settlements.
- `backend/src/services/uprService.js`: Direct calls to `postJournalEntry()` for UPR Earning amortization.

*Boundary Commitment:* These legacy direct-posting paths remain functional and untouched during Phase R3. Phase R3 will prove one real source operation (e.g., Billing Invoice Issued with an explicit flag/route) emits to the durable outbox and flows through the dispatcher, inbox, rule engine, and GL posting engine. Full domain migration is deferred to Phase R4.

---

## 2. Baseline Test Execution Results (Pre-R3)

All existing acceptance and regression suites were run sequentially against the active database:

| Suite Name | Module Tested | Tests | Result | Exit Code |
| :--- | :--- | :---: | :---: | :---: |
| `phase2_full_acceptance.js` | General Ledger & Multi-Tenancy | 16 / 16 | **PASS** | 0 |
| `phase_r1_acceptance.js` | Tenancy, Parties, Personas & Roles | 14 / 14 | **PASS** | 0 |
| `phase_r2_je_rule_engine_acceptance.js` | Dynamic JE Rules & Simulator | 29 / 29 | **PASS** | 0 |
| `phase3_billing_acceptance.js` | Billing, Invoicing & Receivables | 16 / 16 | **PASS** | 0 |
| `phase4_treasury_acceptance.js` | Treasury & Bank Reconciliation | 24 / 24 | **PASS** | 0 |
| `phase5_commissions_acceptance.js` | Commissions & Fiduciary Trust | 18 / 18 | **PASS** | 0 |
| `phase6_finance_close_acceptance.js` | Finance Close & Financial Reports | 21 / 21 | **PASS** | 0 |
| **Total Baseline Inventory** | **All Historical Suites Executed** | **138 / 138** | **PASS** | **0** |

---

## 3. Architecture & Plan for Phase R3

1. **Models**:
   - `OutboxEvent`: `tenant_id`, `event_id`, `event_type`, `event_version`, `source_module`, `source_entity_type`, `source_entity_id`, `correlation_id`, `causation_id`, `payload`, `status` (`PENDING`, `PROCESSING`, `PUBLISHED`, `RETRY`, `DEAD_LETTER`), `attempt_count`, `next_retry_at`, `lease_expires_at`, `last_error`.
   - `InboxMessage`: `tenant_id`, `event_id`, `consumer_name`, `event_type`, `event_version`, `status` (`RECEIVED`, `PROCESSING`, `PROCESSED`, `RETRY`, `DEAD_LETTER`), `attempt_count`, `next_retry_at`, `last_error`, `journal_id`, `rule_code`, `rule_version`. Unique index on `{ tenant_id: 1, consumer_name: 1, event_id: 1 }`.
   - `EventSubscription`: `tenant_id`, `consumer_name`, `event_type`, `is_active`, `description`.
2. **Services**:
   - `outboxService.js`: Outbox creation (with session/compensation if transactions not supported), leasing, polling dispatcher, retry backoff calculation.
   - `inboxService.js`: Consumer registration, deduplication check, execution of rules engine consumer, idempotent journal association.
   - `eventDispatcher.js`: Dispatch loop, bounded batching, concurrency lease renewal, worker recovery.
3. **Controller & APIs**:
   - Mounted at `/api/v1/event-pipeline`:
     - Outbox: list, stats, manual poll trigger.
     - Inbox: list, retry, dead-letter replay with authorization and audit reason.
     - Event Trace: full end-to-end trace from source ID / event ID / correlation ID -> outbox -> inbox -> rule -> journal.
     - Subscriptions: list, toggle pause/active.
4. **Integration Flow**:
   - Billing invoice emission (`createInvoice` or `emitInvoiceIssuedEvent`) optionally writes to outbox.
   - Dispatcher delivers to consumer `JE_RULES_CONSUMER`.
   - Consumer validates payload, resolves published rule, and calls `postJournalEntry` with `sourceModule: 'RULES_ENGINE'`.
5. **Frontend**:
   - **Event Operations** workspace under `Accounting Configuration` with tabs:
     - Event Definitions
     - Event Outbox
     - Inbox / Deliveries
     - Retry Queue
     - Dead Letters
     - Event Trace
     - Tenant Subscriptions
6. **Acceptance Test Suite**:
   - `tests/phase_r3_event_pipeline_acceptance.js` covering 30+ points including failure injection, duplicate delivery, worker crashes, and end-to-end trace.
