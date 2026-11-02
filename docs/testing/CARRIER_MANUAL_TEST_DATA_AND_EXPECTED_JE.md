# Veridex One v4.6 — Carrier Persona Manual Testing Reference
## Summit National Insurance Co. (`CARRIER`) End-to-End Acceptance Pack

**Document Purpose:** Ground-truth manual testing reference for Carrier tenant acceptance.  
**Execution Mode:** Manual only (UI / API). Does NOT automatically seed or alter existing tenant data.  
**Auditor / Tester Role:** Platform Admin / Carrier Finance Lead.

---

## 1. Tenant Overview & Business Model

- **Tenant Archetype:** `CARRIER` (Summit National Insurance Co.)
- **Primary Business:** Direct & Agency Policy Underwriting, Inception Written Premium & Unearned Premium Reserve (UPR) Liability, Operating Cash Collection, Return/NSF Processing, and ASC 944 UPR Monthly Amortization.
- **Base Currency:** `USD`
- **Fiduciary Statute:** Direct carrier operating model (fiduciary trust not required for direct bills; operating cash segregation enforced).
- **Inter-Tenant Boundary:** Settlements received from MGAs are booked via domestic banking rails (wires/ACH) as cash receipts against broker receivables; automated inter-tenant event bridging is unsupported in v4.6.

---

## 2. Configuration & Prerequisites

### 2.1 Chart of Accounts (COA)
| Code | Account Name | Type | Normal Balance | Posting Allowed | Usage / Scope |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `1000` | Carrier Operating Cash (Wells Fargo) | ASSET | DEBIT | YES | Primary operating depository for premium collections |
| `1100` | Direct Premium Receivable | ASSET | DEBIT | YES | Control account for policyholder invoice balances |
| `2200` | Unearned Premium Reserve (UPR) | LIABILITY | CREDIT | YES | Unearned written premium liability under ASC 944 |
| `4000` | Earned Premium Revenue | REVENUE | CREDIT | YES | Pro-rata earned underwriting premium |
| `4100` | Policy Fee & Other Revenue | REVENUE | CREDIT | YES | Non-refundable policy fees and NSF return penalties |

### 2.2 Fiscal Period
- **Period Name:** `2026-07`
- **Date Range:** `2026-07-01` to `2026-07-31`
- **Status:** `OPEN` (Required for journal posting; closing period freezes posting)

### 2.3 Published Journal Entry Rules
1. **Rule `RULE_CARRIER_INV_001`** (`billing.invoice.issued`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1100` — Expression: `payload.total_amount` (Memo: "Dr AR")
   - Line 2: `CREDIT` `2200` — Expression: `payload.premium_amount` (Memo: "Cr UPR Liability")
   - Line 3: `CREDIT` `4100` — Expression: `payload.fee_amount` (Memo: "Cr Policy Fee")
2. **Rule `RULE_CARRIER_PMT_001`** (`billing.payment.received`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1000` — Expression: `payload.payment_amount` (Memo: "Dr Operating Cash")
   - Line 2: `CREDIT` `1100` — Expression: `payload.allocated_amount` (Memo: "Cr AR")
3. **Rule `RULE_CARRIER_RET_001`** (`treasury.payment.returned`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1100` — Expression: `payload.return_amount` (Memo: "Dr Re-instate AR")
   - Line 2: `CREDIT` `1000` — Expression: `payload.return_amount` (Memo: "Cr Operating Cash Dishonor")
   - Line 3: `DEBIT` `1100` — Expression: `payload.fee_amount` (Memo: "Dr NSF Fee AR")
   - Line 4: `CREDIT` `4100` — Expression: `payload.fee_amount` (Memo: "Cr NSF Fee Income")
4. **Rule `RULE_CARRIER_UPR_001`** (`upr.earning.requested`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `2200` — Expression: `payload.earned_amount` (Memo: "Dr UPR Liability Amortization")
   - Line 2: `CREDIT` `4000` — Expression: `payload.earned_amount` (Memo: "Cr Earned Premium Revenue")

---

## 3. Step-by-Step Scenario: Commercial Auto Direct Bill Policy

- **Customer:** Lone Star Freight LLC
- **Policy Reference:** `POL-CARRIER-001` (Commercial Auto Annual Fleet)
- **Policy Term:** `2026-07-01` to `2027-06-30` (365 days)
- **Gross Written Premium:** `$9,000.00`
- **Policy Fee:** `$200.00`
- **Total Initial Invoice:** `$9,200.00`

---

### Step C-1: Issue Direct Bill Policy Invoice
- **Action:** Issue direct bill invoice for policy inception deposit + fee.
- **UI Navigation:** Billing Workspace $\to$ Invoices $\to$ "+ Create Invoice".
- **API Call:** `POST /api/v1/billing/invoices`
```bash
curl -X POST http://localhost:5050/api/v1/billing/invoices \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <CARRIER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "billingAccountId": "<BILLING_ACCOUNT_ID>",
    "policyId": "POL-CARRIER-001",
    "installmentNumber": 1,
    "invoiceDate": "2026-07-01",
    "lines": [
      { "line_type": "PREMIUM", "description": "Annual Premium Installment", "amount": "9000.00" },
      { "line_type": "FEE", "description": "Policy Underwriting Fee", "amount": "200.00" }
    ]
  }'
```
- **Emitted Event:** `billing.invoice.issued` (Correlation ID: `CORR-INV-CARRIER-001`)
- **Published Rule Triggered:** `RULE_CARRIER_INV_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1100` | Direct Premium Receivable | 9,200.00 | 0.00 |
  | 2 | `CREDIT` | `2200` | Unearned Premium Reserve (UPR) | 0.00 | 9,000.00 |
  | 3 | `CREDIT` | `4100` | Policy Fee & Other Revenue | 0.00 | 200.00 |
- **Subledger & Invariants:**
  - Invoice Status: `ISSUED`, Balance Due: `$9,200.00`, Amount Paid: `$0.00`.
  - Account `1020` Plug Check: Strict `$0.00` (Account 1020 does not exist and is never posted).

---

### Step C-2: Customer Cash Payment Receipt
- **Action:** Record customer ACH payment of `$9,200.00`.
- **UI Navigation:** Billing Workspace $\to$ Payments $\to$ "+ Receive Payment".
- **API Call:** `POST /api/v1/billing/payments`
```bash
curl -X POST http://localhost:5050/api/v1/billing/payments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <CARRIER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "billingAccountId": "<BILLING_ACCOUNT_ID>",
    "amount": "9200.00",
    "paymentMethod": "ACH",
    "referenceNumber": "ACH-CARRIER-001",
    "paymentDate": "2026-07-05",
    "targetInvoiceId": "<INVOICE_ID>",
    "isFiduciary": false
  }'
```
- **Emitted Event:** `billing.payment.received`
- **Published Rule Triggered:** `RULE_CARRIER_PMT_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1000` | Carrier Operating Cash | 9,200.00 | 0.00 |
  | 2 | `CREDIT` | `1100` | Direct Premium Receivable | 0.00 | 9,200.00 |
- **Subledger & Invariants:**
  - Invoice Status: `PAID`, Balance Due: `$0.00`, Amount Paid: `$9,200.00`.
  - Payment Allocation: `$9,200.00` allocated, `$0.00` unapplied cash.

---

### Step C-3: Payment Return (Dishonored NSF Check)
- **Action:** Record bank notification that payment `ACH-CARRIER-001` was returned NSF; assess `$35.00` fee.
- **UI Navigation:** Treasury Workspace $\to$ Returns $\to$ "Process NSF Return".
- **API Call:** `POST /api/v1/treasury/returns`
```bash
curl -X POST http://localhost:5050/api/v1/treasury/returns \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <CARRIER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "<PAYMENT_ID>",
    "returnCode": "R01",
    "reasonDescription": "Customer NSF Return"
  }'
```
- **Emitted Event:** `treasury.payment.returned`
- **Published Rule Triggered:** `RULE_CARRIER_RET_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1100` | Direct Premium Receivable (Re-instate) | 9,200.00 | 0.00 |
  | 2 | `CREDIT` | `1000` | Carrier Operating Cash (Cash Recalled) | 0.00 | 9,200.00 |
  | 3 | `DEBIT` | `1100` | Direct Premium Receivable (NSF Fee Assessment) | 35.00 | 0.00 |
  | 4 | `CREDIT` | `4100` | Policy Fee & Other Revenue (NSF Penalty Revenue)| 0.00 | 35.00 |
- **Subledger & Invariants:**
  - Payment status: `RETURNED`.
  - PaymentAllocation status: `REVERSED`.
  - Invoice status restored to `ISSUED` (or `PARTIALLY_PAID`), Balance Due restored to `$9,200.00`.
  - Carrier Operating Cash balance: `$0.00`.

---

### Step C-4: Month-End UPR Amortization Run (July 2026)
- **Action:** Execute monthly UPR amortization (31 days covered / 365 total days on `$9,000.00` written premium = `$764.38`).
- **UI Navigation:** Finance Close Workspace $\to$ UPR $\to$ "Run Earning".
- **API Call:** `POST /api/v1/close/upr-runs`
```bash
curl -X POST http://localhost:5050/api/v1/close/upr-runs \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <CARRIER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "policyReference": "POL-CARRIER-001",
    "periodName": "2026-07",
    "writtenPremium": "9000.00",
    "termStartDate": "2026-07-01",
    "termEndDate": "2027-07-01",
    "asOfDate": "2026-07-31"
  }'
```
- **Emitted Event:** `upr.earning.requested`
- **Published Rule Triggered:** `RULE_CARRIER_UPR_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `2200` | Unearned Premium Reserve (UPR) | 764.38 | 0.00 |
  | 2 | `CREDIT` | `4000` | Earned Premium Revenue | 0.00 | 764.38 |
- **Idempotency Check:** Re-submitting the same payload returns HTTP 200 with `alreadyRun: true` and posts NO duplicate journal lines.

---

### Step C-5: Trial Balance Verification & Certification
- **Action:** Generate and certify Trial Balance for `2026-07`.
- **UI Navigation:** Finance Close Workspace $\to$ Trial Balance $\to$ "Certify Snapshot".
- **API Call:** `POST /api/v1/close/trial-balance/certify`
```bash
curl -X POST http://localhost:5050/api/v1/close/trial-balance/certify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <CARRIER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{ "period_name": "2026-07" }'
```
- **Expected Ending Trial Balance:**
  | Account Code | Account Name | Type | Debit ($) | Credit ($) | Net Balance ($) |
  | :--- | :--- | :--- | :-: | :-: | :-: |
  | `1000` | Carrier Operating Cash | ASSET | 0.00 | 0.00 | $0.00 |
  | `1100` | Direct Premium Receivable | ASSET | 9,235.00 | 0.00 | $9,235.00 Dr |
  | `2200` | Unearned Premium Reserve (UPR) | LIABILITY | 0.00 | 8,235.62 | $8,235.62 Cr |
  | `4000` | Earned Premium Revenue | REVENUE | 0.00 | 764.38 | $764.38 Cr |
  | `4100` | Policy Fee & Other Revenue | REVENUE | 0.00 | 235.00 | $235.00 Cr |
  | **TOTALS** | | | **9,235.00** | **9,235.00** | **Balanced ($0.00 Diff)** |

---

## 4. Subledger Reconciliation Checklist

1. **AR Control Reconciliation:**
   - Account `1100` Balance (`$9,235.00`) == Open Invoice Balance (`$9,200.00`) + Assessed NSF Fee (`$35.00`).
2. **UPR Liability Reconciliation:**
   - Account `2200` Balance (`$8,235.62`) == Written Premium (`$9,000.00`) - Earned Premium (`$764.38`).
3. **Cash Equilibrium:**
   - Account `1000` Balance (`$0.00`) == Initial Cash Received (`$9,200.00`) - Cash Reversed (`$9,200.00`).
4. **Plug Verification:**
   - Query: `db.journals.find({ "tenant_id": "<CARRIER_TENANT_ID>", "lines.account_code": "1020" })` $\to$ Returns `0` records.

---

## 5. Test Data Clean-Up Guidance

When running manual acceptance tests, isolate testing data using the following protocol:
1. **Always use an isolated test tenant** (e.g. `TEST_CARRIER_<TIMESTAMP>`). Never execute manual test cases in production books.
2. **Do NOT run destructive database drops (`dropDatabase`)** on shared environments.
3. To archive a completed manual test tenant:
   - Close all open fiscal periods: Set `status: 'HARD_CLOSED'` on `FiscalPeriod`.
   - Mark tenant status inactive: Set `status: 'INACTIVE'` on `Tenant`.
   - Filter queries by `status: 'ACTIVE'` to exclude archived test tenants from reporting views.
