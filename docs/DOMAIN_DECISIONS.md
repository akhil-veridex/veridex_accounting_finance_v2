# Domain Decisions and Ambiguity Resolution Log

**Application:** Veridex One Insurance Finance & Accounting SaaS  
**Document Version:** 1.0  
**Effective Date:** October 12, 2026  

---

## 1. Domain Decisions Register (A through J)

### Decision A: Relational Physical ERD to MongoDB/Mongoose Adaptation
- **Context:** The ERD details PostgreSQL schemas with SQL foreign keys and constraints. The approved stack is Node.js, Express, MongoDB with Mongoose, and React Vite.
- **Decision:** Map all 47 models to dedicated Mongoose schemas with explicit snake_case collection names. Enforce relational constraints and double-entry invariants in transactional service wrappers (`session.withTransaction()`).
- **Status:** `CONFIRMED`

### Decision B: Lone Pine Commission Agreement Hierarchy
- **Context:** Text mentions both 15% broker flat commission and 20% total MGA pool.
- **Decision:** Use Lone Pine Policy #POL-TX-8821 canonical values:
  - Gross Premium: $37,650.00
  - Carrier Share (Summit Mutual 80%): $30,120.00
  - MGA Pool (20%): $7,530.00
  - Split: Harbor MGA retains 10% ($3,765.00), Broker Brightline receives 10% ($3,765.00).
- **Status:** `CONFIRMED`

### Decision C: 4-Pay Installment Schedule Calculation
- **Context:** Installment distribution on $37,650.00 commercial trucking policy with $150 policy fee.
- **Decision:**
  - Down Payment: 25% of premium = $9,412.50 + $150.00 fee = $9,562.50 due July 1, 2026.
  - Remaining 3 equal installments: $9,412.50 each due on subsequent quarterly/installment dates.
- **Status:** `CONFIRMED`

### Decision D: Texas Fiduciary Trust Escrow (§ 4053) Accounting
- **Context:** Texas Insurance Code mandates complete separation of fiduciary trust funds from MGA operating revenue.
- **Decision:** Maintain separate GL accounts:
  - `1010` — Fiduciary Premium Trust Cash (Wells Fargo)
  - `1020` — MGA Operating Cash (Chase)
  - `2010` — Carrier Payable (Summit Mutual)
  - `2020` — Broker Commission Payable (Brightline Risk)
  Trust cash is restricted from operating sweep until fiduciary criteria and bordereau settlements are satisfied.
- **Status:** `CONFIRMED`

### Decision E: Fiduciary Sweep Eligibility Timing
- **Context:** Sweeping earned MGA commission from trust to operating account.
- **Decision:** Configurable demo parameter `fiduciaryHoldDays = 30`. Sweeps can only transfer earned MGA commission after funds have been collected and cleared for 30 days.
- **Status:** `CONFIRMED_AS_CONFIGURABLE`

### Decision F: UPR Amortization Daily Earning Rate
- **Context:** Day-count convention (actual/365 vs 360).
- **Decision:** Actual/365 daily earning formula ($37,650.00 / 365 = $103.1506849/day). July (31 days) earns $3,197.67 with remaining unearned reserve of $34,452.33. Penny remainder is reconciled on final expiration day.
- **Status:** `CONFIRMED`

### Decision G: Strict Immutability of Posted Financial Records
- **Context:** Modifying posted journals, invoices, and bank matches.
- **Decision:** Posted journals (`POSTED`) and certified trial balance snapshots (`FINAL_LOCKED`) cannot be updated or deleted. Corrections must be posted as linked reversal journals (`reversal_of_journal_id`) in an open fiscal period.
- **Status:** `CONFIRMED`

### Decision H: Seven-Step Financial Close Sequence
- **Context:** Month-end close orchestration tasks.
- **Decision:** Sequence exactly 7 automated close steps:
  1. Subledger Reconciliation
  2. UPR Amortization Recognition
  3. Fiduciary Escrow Audit
  4. Bordereau Settlement Finalization
  5. Trial Balance Equilibrium Assertion ($\sum Dr == \sum Cr$)
  6. Fiscal Period Hard Lock
  7. ERP Export Batch Creation
- **Status:** `CONFIRMED`

### Decision I: Transactional Outbox/Inbox Event Transport
- **Context:** External lifecycle event ingestion (Policy Bound, Payment Received, Endorsement, Claim Settled).
- **Decision:** Implement persistent MongoDB `outbox_events` and `inbox_events` collections. Consumers hash `idempotency_key` to guarantee at-least-once transport with exactly-once financial execution.
- **Status:** `CONFIRMED`

### Decision J: Multi-Currency & Precision Arithmetic
- **Context:** Currency precision policy.
- **Decision:** Base currency is `USD`. All monetary fields use `Decimal128` or scaled integer cents with rounding mode `ROUND_HALF_UP`.
- **Status:** `CONFIRMED`

### Decision K: Single-Recognition Invariant for Written Premium and Invoicing
- **Context:** Policy inception recognizes full annual written premium ($37,650.00) and policy fee ($150.00), debiting Account `1100 Premium Receivable` and crediting Account `2200 Unearned Premium Reserve` & `4100 Policy Fee Income`. When an installment schedule is generated (e.g. 4-pay installment #1 of $9,562.50) and an installment invoice is issued, downstream modules must not double-credit `2200` or double-debit `1100`.
- **Decision:** Inception establishes the full annual premium and unearned liability. Installment invoices represent billing schedule demands and payment triggers. Installment invoices do not duplicate unearned premium liability in the general ledger. Customer cash collections directly debit `1010 Premium Trust Cash` and credit `1100 Premium Receivable` with waterfall matching against invoice lines. UPR is amortized strictly on an ASC 944 Actual/365 timeline from Account `2200` to Account `4000 Earned Premium Revenue`.
- **Status:** `CONFIRMED`

