# Veridex One — Domain Posting Migration Matrix
## Mapping Business Operations to Published Rules, Debit/Credit Invariants & Migration Adapters

**Version:** 1.0.0  
**Effective Date:** October 14, 2026  

---

## 1. Migration Overview & Strategy

Phase R4 completes the architectural transition of Veridex One from hardcoded point-to-point GL postings to a dynamic, rules-driven event architecture.

### Core Architectural Rules:
1. **Single Entry Point to General Ledger:** The Event Pipeline Consumer (`inboxService.processEventForConsumer`) is the designated gateway for all business accounting journals. It evaluates tenant-scoped published `PostingRule` records and invokes `journalPostingService.postJournalEntry()` with `sourceModule: 'RULES_ENGINE'`.
2. **Safe Failure:** If a published rule is missing, unpublished, expired, or ambiguous, the consumer fails safely and marks the inbox message `DEAD_LETTER` with `NO_RULE_MATCH` or `AMBIGUOUS_RULE_MATCH`. **It never silently posts a hardcoded journal.**
3. **Approved Migration Adapter:** To ensure 100% backward compatibility for existing regression suites and non-rules tenants, legacy direct posting call sites in domain services are encapsulated within an approved `LegacyPostingAdapter` that is active only when explicitly requested (`x-use-migration-adapter: true` or `useMigrationAdapter: true`).

---

## 2. Complete Domain Operation Migration Matrix

| Domain | Business Operation | Event Code | Rule Code (Standard) | Debit Account | Credit Account | Idempotency Key Format |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Billing** | Issue Invoice (Deposit / Installment) | `billing.invoice.issued` | `RULE_INV_ISSUED_001` | `1100` (AR Total) | `2200` (UPR Premium), `4100` (Policy Fee) | `tenant:billing:invoice:{invoice_id}` |
| **Billing** | Record Payment Receipt & Waterfall | `billing.payment.received` | `RULE_PMT_RECEIVED_001` | `1000` / `1010` (Cash) | `1100` (AR Cleared), `2190` (Unapplied Suspense) | `tenant:billing:payment:{payment_id}` |
| **Billing** | Apply Billing Adjustment | `billing.adjustment.applied` | `RULE_ADJ_APPLIED_001` | `4100` (Fee Contra) / `5000` (Write-off) | `1100` (AR Knockoff) | `tenant:billing:adj:{adj_id}` |
| **Treasury** | Process Dishonored NSF Return | `treasury.payment.returned` | `RULE_PMT_RETURN_001` | `1100` (AR Reinstated), `1100` (Fee Assess) | `1010` (Cash Reversed), `4100` (Fee Income) | `tenant:treasury:return:{return_id}` |
| **Treasury** | Disburse Premium Refund | `treasury.refund.disbursed` | `RULE_REFUND_DISBURSE_001`| `2100` (Return Premium Payable) | `1010` (Trust Cash Disbursed) | `tenant:treasury:refund:{refund_id}` |
| **Commissions**| Execute MGA Fiduciary Sweep | `fiduciary.sweep.executed` | `RULE_FID_SWEEP_001` | `1000` (Operating Cash) | `1010` (Premium Trust Cash) | `tenant:fiduciary:sweep:{sweep_ref}` |
| **Commissions**| Disburse Carrier Settlement | `carrier.settlement.disbursed`| `RULE_SETTLE_DISBURSE_001`| `2010` (Due to Carrier) | `1010` (Premium Trust Cash) | `tenant:settlement:disburse:{statement_id}`|
| **Finance Close**| Amortize Monthly / Daily UPR | `upr.earning.requested` | `RULE_UPR_EARN_001` | `2200` (UPR Liability) | `4000` (Earned Premium Revenue) | `tenant:upr:{policy_ref}:{period_name}` |

---

## 3. Justified Direct-Posting Exceptions

Under Section 7 R4-F, the only allowable call sites to `postJournalEntry()` outside `inboxService.js` are:

1. **`glController.js:284` (`createJournal`)**:
   - **Justification:** Manual user journal entry interface for accountants and finance controllers (`GL_MANUAL`). This is an administrative accounting capability, not an automated business event.
2. **`journalPostingService.js:230` (`reverseJournalEntry`)**:
   - **Justification:** Core GL accounting invariant engine. Handles GAAP-compliant reversal of posted journals by creating balancing contra-entries with back-references (`reversal_of_journal_id`).
3. **`eventSimulatorService.js:234` (`postSimulatedJournalToGL`)**:
   - **Justification:** Interactive Rule Builder & Simulation workspace test utility. Allows administrators to explicitly commit a verified simulation to the ledger for rule debugging.
4. **`legacyPostingAdapter.js`**:
   - **Justification:** Approved migration adapter providing temporary backward compatibility for legacy callers and pre-existing regression test suites that do not configure dynamic rules.
