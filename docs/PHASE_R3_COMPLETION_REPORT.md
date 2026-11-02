# Veridex One — Phase R3 Completion Report
## Durable Transactional Outbox/Inbox, Event Dispatcher, Retry & Delivery Observability

**Report Date:** October 14, 2026  
**Phase:** R3 — Event Pipeline & Delivery Reliability  
**Environment:** Node.js v20+, Express 4.x, MongoDB Atlas, React 18 / Vite 5.x  
**Repository Working Directory:** `c:\Users\AkhileshSoni\Desktop\veridexoneDoc\veridex_accoouunting_finance`

---

## 1. Executive Summary

Phase R3 transitions Veridex One from synchronous, point-to-point GL invocations toward a resilient, event-driven architecture with guaranteed at-least-once transactional delivery and idempotent consumer deduplication. 

In this phase, we implemented:
1. **Durable Transactional Outbox (`OutboxEvent`)**: Captures business intent at the point of origin, ensuring transactional consistency between domain operations and event publishing.
2. **Durable Consumer Inbox (`InboxMessage`)**: Enforces idempotency via unique tenant-consumer-event keys, prevents duplicate financial transactions, and enables safe lost-acknowledgment recovery.
3. **Lease-Based Worker & Polling Dispatcher (`eventDispatcher`)**: Provides concurrent dispatching, exponential backoff for transient failures, atomic lease acquisition, and automatic crash recovery for expired leases.
4. **Direct Handshake with Phase R2 JE Rule Engine**: Directly evaluates events against published tenant posting rules and posts double-entry balanced journals through the existing GL posting engine (`sourceModule: 'RULES_ENGINE'`).
5. **Real Source Operation Verification**: Verified end-to-end flow with Billing Invoice Issuance (`issueInvoice` with `useEventPipeline: true`), emitting an outbox event that flows through the dispatcher, inbox, rule engine, and posts to GL with zero duplicate side effects.
6. **Full-Featured Event Operations Workspace UI (`EventOperationsPage`)**: Provides enterprise-grade observability with 7 operational tabs: Overview, Outbox Events, Inbox Deliveries, Retry Queue, Dead Letters, Event Trace, and Subscriptions.
7. **Comprehensive Verification**: 100% pass rate across all 66 Phase R3 acceptance assertions and all 138 sequential regression assertions from Phases 2, R1, R2, 3, 4, 5, and 6 (204 total passing tests).

---

## 2. Models & Database Schema

All event pipeline collections enforce strict multi-tenant scoping (`tenant_id`), compound indexes, and auditable timestamps.

### 2.1 OutboxEvent (`backend/src/models/OutboxEvent.js`)
Tracks events produced by domain modules before delivery to consumers.

```javascript
{
  tenant_id: { type: ObjectId, ref: 'Tenant', required: true, index: true },
  event_id: { type: String, required: true, unique: true, trim: true },
  event_type: { type: String, required: true, lowercase: true, index: true },
  event_version: { type: String, required: true, default: '1.0.0' },
  source_module: { type: String, required: true, index: true },
  source_entity_type: { type: String, required: true },
  source_entity_id: { type: String, required: true, index: true },
  source_transaction_id: { type: String, default: null },
  correlation_id: { type: String, default: null, index: true },
  causation_id: { type: String, default: null },
  occurred_at: { type: Date, required: true, index: true },
  recorded_at: { type: Date, default: Date.now },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  trace_metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'RETRY', 'DEAD_LETTER'], 
    default: 'PENDING', 
    index: true 
  },
  attempt_count: { type: Number, default: 0 },
  max_attempts: { type: Number, default: 5 },
  next_retry_at: { type: Date, default: null, index: true },
  lease_owner: { type: String, default: null },
  lease_expires_at: { type: Date, default: null, index: true },
  last_error_code: { type: String, default: null },
  last_error_category: { type: String, default: null },
  last_error_message: { type: String, default: null },
  published_at: { type: Date, default: null }
}
```

### 2.2 InboxMessage (`backend/src/models/InboxMessage.js`)
Guarantees consumer-level idempotency and records rule evaluation results or dead-letter reasons.

```javascript
{
  tenant_id: { type: ObjectId, ref: 'Tenant', required: true, index: true },
  event_id: { type: String, required: true, trim: true, index: true },
  consumer_name: { type: String, required: true, trim: true, index: true },
  event_type: { type: String, required: true, lowercase: true },
  event_version: { type: String, required: true, default: '1.0.0' },
  status: { 
    type: String, 
    enum: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'RETRY', 'DEAD_LETTER'], 
    default: 'RECEIVED', 
    index: true 
  },
  attempt_count: { type: Number, default: 0 },
  max_attempts: { type: Number, default: 5 },
  next_retry_at: { type: Date, default: null, index: true },
  lease_owner: { type: String, default: null },
  lease_expires_at: { type: Date, default: null },
  last_error_code: { type: String, default: null },
  last_error_category: { type: String, default: null },
  last_error_message: { type: String, default: null },
  result: { type: mongoose.Schema.Types.Mixed, default: {} },
  replayed_at: { type: Date, default: null },
  replayed_by_user_id: { type: ObjectId, ref: 'User', default: null },
  replay_reason: { type: String, default: null }
}
// Unique compound index preventing duplicate consumer delivery:
InboxMessageSchema.index({ tenant_id: 1, consumer_name: 1, event_id: 1 }, { unique: true });
```

### 2.3 EventSubscription (`backend/src/models/EventSubscription.js`)
Configurable consumer subscriptions per tenant, allowing selective pausing and resuming of event streams.

```javascript
{
  tenant_id: { type: ObjectId, ref: 'Tenant', required: true, index: true },
  subscription_code: { type: String, required: true, uppercase: true, trim: true },
  consumer_name: { type: String, required: true, trim: true },
  event_type: { type: String, required: true, lowercase: true, trim: true },
  is_active: { type: Boolean, default: true },
  description: { type: String, default: '' }
}
EventSubscriptionSchema.index({ tenant_id: 1, subscription_code: 1 }, { unique: true });
```

---

## 3. Reliability & Delivery Mechanics

### 3.1 Idempotency & Deduplication
1. **Database-Enforced Uniqueness**: The compound unique index `{ tenant_id, consumer_name, event_id }` prevents race conditions from creating duplicate inbox executions.
2. **Atomic Status Claiming**: `InboxMessage.findOneAndUpdate` atomically updates eligible `RECEIVED` or `RETRY` messages to `PROCESSING`, assigning a lease owner and 30-second TTL. If a concurrent call detects an active lease, it awaits processing completion rather than executing a duplicate run.
3. **Lost Acknowledgment Recovery**: Before invoking the rule engine, `inboxService` inspects the General Ledger for any journal matching `{ tenant_id, source_module: 'RULES_ENGINE', reference_id: eventId }`. If an unacknowledged journal already exists, the inbox message marks itself `PROCESSED` with `{ recovered: true }`, preventing double-posting.

### 3.2 Transient Failure & Exponential Backoff
- When a retryable error occurs (e.g. database blip, transient timeout), the status transitions to `RETRY`.
- The `next_retry_at` timestamp is calculated using bounded exponential backoff:  
  $$\text{delay} = \min(2000 \times 2^{\text{attempt} - 1}, 60000)\text{ ms}$$
- Administrators can trigger an immediate retry via `POST /api/v1/event-pipeline/outbox/:id/retry` or `POST /api/v1/event-pipeline/inbox/:id/retry`, resetting `next_retry_at` to the current time.

### 3.3 Worker Crash Recovery
- If a dispatcher worker crashes mid-delivery, the leased outbox or inbox document retains `status = 'PROCESSING'` but its `lease_expires_at` falls into the past.
- `leasePendingOutboxEvents` queries expired leases:
  ```javascript
  {
    $or: [
      { status: { $in: ['PENDING', 'RETRY'] }, ... },
      { status: 'PROCESSING', lease_expires_at: { $lte: now } } // Crash recovery
    ]
  }
  ```
- Healthy workers reclaim the expired lease atomically and continue processing without operational stall.

### 3.4 Dead-Letter Management & Audit Replay
Permanent errors immediately transition to `DEAD_LETTER` without entering infinite retry loops:
- `INVALID_PAYLOAD_SCHEMA`: Payload fails JSON schema validation against `EventDefinition`.
- `NO_RULE_MATCH`: No active, published posting rule matched the event and occurrence date.
- `AMBIGUOUS_RULE_MATCH`: Multiple published rules match with identical priority and specificity.
- `CLOSED_PERIOD`: Posting date falls into a locked or hard-closed fiscal period.
- `JOURNAL_IMBALANCE`: Rule line formulas generate unbalanced debit/credit totals.

**Replay Controls**:
- Replaying a dead-letter event requires an explicit, audited business reason (`body.reason`).
- Status resets to `RECEIVED`, preserving the `replay_reason`, `replayed_at`, and `replayed_by_user_id` in immutable audit fields.
- Re-processing executes under the existing idempotency guard, ensuring no double-posting occurs.

---

## 4. End-to-End Real Source Operation Integration

In Phase R3, we established the exact-once bridge between real domain operations, the event pipeline, the JE Rule Engine, and the General Ledger.

### 4.1 Billing Service Integration
In `backend/src/services/billingService.js`, `issueInvoice` accepts `useEventPipeline: true`:

```
Domain Service: issueInvoice({ useEventPipeline: true })
  │
  ├── 1. Inserts Invoice Subledger Record
  │
  ├── 2. Creates OutboxEvent ('billing.invoice.issued') [STATUS: PENDING]
  │      (Bypasses direct GL journal creation)
  │
  └── 3. Returns { invoice, eventDriven: true, outboxEvent, journal: null }
```

### 4.2 Pipeline to General Ledger Handshake
```
OutboxEvent ('billing.invoice.issued')
  │
  ▼
eventDispatcher.dispatchPendingEvents()
  │ Leases event with workerId & 30s TTL
  ▼
inboxService.processEventForConsumer('JE_RULES_CONSUMER')
  │ Checks idempotency & subscription status
  │ Simulates with Phase R2 JE Rule Engine (simulateJournalFromEvent)
  │ Evaluates formula expressions:
  │   - Line 1 (DEBIT 1100 AR): payload.total_amount ($9,562.50)
  │   - Line 2 (CREDIT 2200 UPR): payload.premium_amount ($9,412.50)
  │   - Line 3 (CREDIT 4100 Fee): payload.fee_amount ($150.00)
  │ Verifies Debit == Credit ($9,562.50 == $9,562.50)
  ▼
journalPostingService.postJournalEntry()
  │ sourceModule: 'RULES_ENGINE'
  │ referenceId: eventId
  │ Updates account current_balance atomically
  ▼
InboxMessage: Marked PROCESSED (journal_id, rule_code persisted)
OutboxEvent: Marked PUBLISHED
```

---

## 5. Event Operations Observability UI

The customer-facing application includes an enterprise Event Operations workspace at `/settings/events` (`frontend/src/pages/EventOperationsPage.jsx`), strictly adhering to business domain nomenclature with zero internal development or phase labels.

### Workspace Tabs:
1. **Overview**: Metric summary cards (Total Outbox, Published, Inbox Deliveries, Processed, In Retry, Dead Letters), recent activity feed, and on-demand **Run Dispatcher Now** action button.
2. **Outbox Events**: Real-time table of outbox entries showing Event ID, Type, Source, Status, Attempts, Occurred At, with a **View Payload & Audit** modal.
3. **Inbox Deliveries**: Consumer message registry showing Consumer Name, Event Code, Status, Rule Code Matched, Journal Number posted, and Execution Timestamps.
4. **Retry Queue**: Real-time view of failed messages undergoing exponential backoff, showing Error Category, Last Error Message, Next Retry Time, with an **Immediate Retry** action button.
5. **Dead Letters**: Registry of rejected events requiring human intervention, with a **Replay Event** modal requiring an audit justification before re-queueing.
6. **Event Trace**: Interactive audit tracer allowing search by Event ID or Correlation ID, displaying the chronological sequence from Outbox Emission $\to$ Consumer Inbox $\to$ Rule Resolution $\to$ GL Journal Posting with balanced debit/credit breakdown.
7. **Subscriptions**: Registry of active and paused tenant event subscriptions with one-click **Pause / Resume** toggles.

---

## 6. Acceptance & Regression Verification Evidence

### 6.1 Phase R3 Acceptance Suite (`tests/phase_r3_event_pipeline_acceptance.js`)

**Command:** `node tests/phase_r3_event_pipeline_acceptance.js`  
**Exit Code:** `0`  
**Result:** **66 / 66 PASSED (100%)**

| Test Group | Identifier | Assertion Description | Result |
| :--- | :--- | :--- | :---: |
| **Test 1** | R3-01a, b, c | Invoice issued in event-driven mode; 0 direct journals; 1 OutboxEvent PENDING | **PASS** |
| **Test 2** | R3-02, 02b | Schema validation rejects malformed payload prior to outbox persistence | **PASS** |
| **Test 3–7** | R3-03..07 | Dispatcher publishes event; Outbox $\to$ PUBLISHED; Inbox $\to$ PROCESSED; GL Journal posted | **PASS** |
| **Test 6b–e** | R3-06b..e | Journal sourceModule is RULES_ENGINE; reference links eventId; balanced $9,562.50 | **PASS** |
| **Test 8–9** | R3-08..09c | Repeated dispatch finds 0 pending; Consumer redelivery recognizes duplicate; 1 GL journal | **PASS** |
| **Test 10** | R3-10a, b | Concurrent delivery deduplication: exactly 1 journal created despite simultaneous calls | **PASS** |
| **Test 11** | R3-11a, b | Worker crash recovery: expired lease reclaimed by healthy worker with updated ownership | **PASS** |
| **Test 12–13** | R3-12a..13b | Transient error sets RETRY; calculates backoff; manual retry publishes successfully | **PASS** |
| **Test 14–15** | R3-14..15b | Unmatched event moves to DEAD_LETTER (NO_RULE_MATCH); 0 journals created | **PASS** |
| **Test 16** | R3-16a, b, c | Ambiguous rule match moves to DEAD_LETTER (AMBIGUOUS_RULE_MATCH); 0 journals | **PASS** |
| **Test 17** | R3-17a, b, c | Closed fiscal period produces DEAD_LETTER (CLOSED_PERIOD); 0 journals created | **PASS** |
| **Test 18** | R3-18a, b, c | Lost acknowledgment recovery: redelivery discovers existing GL journal; 0 double-post | **PASS** |
| **Test 19–20** | R3-19a..d | Replay without audit reason rejected; valid reason resets status and audits user/reason | **PASS** |
| **Test 21** | R3-21a, b, c | Cross-tenant isolation: Tenant B cannot view or retry Tenant A outbox events | **PASS** |
| **Test 22** | R3-22a, b | Paused tenant event subscription is respected; consumer skips processing; 0 journals | **PASS** |
| **Test 23–24** | R3-23a, b | Simulation mode computes balanced lines; creates 0 database journals | **PASS** |
| **Test 25** | R3-25a..d | Event Trace API returns complete audit chain: Outbox $\to$ Inbox $\to$ GL Journal lines | **PASS** |
| **Test 26** | R3-26a, b, c | Pipeline Stats API accurately aggregates published outbox and processed inbox totals | **PASS** |
| **Test 27** | R3-27a, b, c | Event Subscription CRUD & toggle APIs allow active/inactive state management | **PASS** |

---

### 6.2 Sequential Regression Verification

All prior phase test suites were executed sequentially against the persistent MongoDB database.

| Phase Suite | Test Script | Total Tests | Passed | Failed | Exit Code | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 2 GL Engine** | `phase2_full_acceptance.js` | 16 | 16 | 0 | 0 | **PASS** |
| **Phase R1 Tenancy & Counterparty** | `phase_r1_acceptance.js` | 14 | 14 | 0 | 0 | **PASS** |
| **Phase R2 Dynamic JE Rule Engine** | `phase_r2_je_rule_engine_acceptance.js` | 29 | 29 | 0 | 0 | **PASS** |
| **Phase 3 Billing & AR** | `phase3_billing_acceptance.js` | 16 | 16 | 0 | 0 | **PASS** |
| **Phase 4 Treasury & Bank Rec** | `phase4_treasury_acceptance.js` | 24 | 24 | 0 | 0 | **PASS** |
| **Phase 5 Commissions & Fiduciary** | `phase5_commissions_acceptance.js` | 18 | 18 | 0 | 0 | **PASS** |
| **Phase 6 Finance Close & UPR** | `phase6_finance_close_acceptance.js` | 21 | 21 | 0 | 0 | **PASS** |
| **Phase R3 Event Pipeline Acceptance** | `phase_r3_event_pipeline_acceptance.js` | 66 | 66 | 0 | 0 | **PASS** |
| **Total Test Assertions** | **8 Test Suites** | **204** | **204** | **0** | **0** | **100% PASS** |

### 6.3 Frontend Production Build Verification

```
> veridex-finance-frontend@4.6.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1491 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.82 kB │ gzip:   0.48 kB
dist/assets/index-2qncADnE.css   38.55 kB │ gzip:   6.87 kB
dist/assets/index-CWMgjWes.js   481.66 kB │ gzip: 100.66 kB
✓ built in 2.33s
```
**Exit Code:** `0` (Zero compilation errors, zero lint warnings).

---

## 7. Migration Boundary & Phase R4 Readiness

In compliance with the Phase R3 prompt constraints:
- **Scope Boundary Honored**: Only the designated Billing Invoice issuance path was wired to the event pipeline with `useEventPipeline: true`.
- **Zero Regressions**: Legacy direct GL posting paths across Billing, Treasury, Commissions, and Finance Close remain intact and fully functional, ensuring 100% backward compatibility.
- **Phase R4 Prerequisite**: The durable outbox, idempotent inbox, polling dispatcher, and delivery observability infrastructure are fully operational and verified, ready for Phase R4 to migrate all remaining domain services (Billing Payments/Adjustments, Treasury Bank Rec/Returns/Disbursements, Commissions Settlement/Fiduciary Sweeps, Finance Close UPR) onto the event bus.

---

## 8. Review Sign-off Gate

Phase R3 implementation is complete and verified. The system is stopped and ready for technical and product review.
