# Veridex One v4.6 — MGA Persona Manual Testing Reference
## Harbor Risk Underwriting Managers (`MGA`) End-to-End Acceptance Pack

**Document Purpose:** Ground-truth manual testing reference for Managing General Agent (MGA) tenant acceptance.  
**Execution Mode:** Manual only (UI / API). Does NOT automatically seed or alter existing tenant data.  
**Auditor / Tester Role:** Platform Admin / MGA Controller.

---

## 1. Tenant Overview & Business Model

- **Tenant Archetype:** `MGA` (Harbor Risk Underwriting Managers)
- **Primary Business:** Program Underwriting Administration, Gross Agency Billing, Split Fiduciary Payables, Texas Insurance Code § 4053 Fiduciary Trust Segregation, MGA Earned Commission Sweeps, and Carrier Settlement Disbursements.
- **Base Currency:** `USD`
- **Fiduciary Statute:** Texas Insurance Code § 4053 (requires strictly segregated premium trust cash in Account `1010`; sweeps to operating cash in Account `1000` are restricted to earned, non-disputed MGA commission override).
- **Inter-Tenant Boundary:** Settlements to Carrier (`Summit National`) and broker commission disbursements to `Brightline` are executed through local banking rails (wires/ACH); automated inter-tenant event bridging is unsupported in v4.6.

---

## 2. Configuration & Prerequisites

### 2.1 Chart of Accounts (COA)
| Code | Account Name | Type | Normal Balance | Posting Allowed | Usage / Scope |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `1000` | MGA Operating Cash (Chase Bank) | ASSET | DEBIT | YES | Unrestricted commercial operating depository |
| `1010` | Texas Statutory Premium Trust Account | ASSET | DEBIT | YES | Segregated fiduciary trust account under Texas § 4053 |
| `1100` | Agency Premium Receivable | ASSET | DEBIT | YES | Control account for producing broker statement invoices |
| `2010` | Due to Insurance Carrier (Fiduciary) | LIABILITY | CREDIT | YES | Net fiduciary liability owed to underwriting carrier |
| `2020` | Broker Commissions Payable | LIABILITY | CREDIT | YES | Fiduciary liability owed to producing retail broker |
| `4000` | MGA Underwriting Commission Revenue | REVENUE | CREDIT | YES | Earned MGA program management and override fee |

### 2.2 Fiduciary Account Configuration
- **Account Code:** `FID-TX-TRUST-01`
- **Account Name:** Frost Bank Texas § 4053 Statutory Premium Trust
- **Account Type:** `PREMIUM_TRUST`
- **Jurisdiction Statute:** `TEXAS_INS_CODE_4053`
- **GL Account Code:** `1010`
- **Bank Reference Token:** Masked vault token (`tok_frost_tx_trust_9941`)
- **Status:** `ACTIVE`

### 2.3 Fiscal Period
- **Period Name:** `2026-07`
- **Date Range:** `2026-07-01` to `2026-07-31`
- **Status:** `OPEN`

### 2.4 Published Journal Entry Rules
1. **Rule `RULE_MGA_INV_001`** (`billing.invoice.issued`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1100` — Expression: `payload.total_amount` (Memo: "Dr Agency AR")
   - Line 2: `CREDIT` `2010` — Expression: `payload.total_amount * 0.85` (Memo: "Cr Due to Carrier 85%")
   - Line 3: `CREDIT` `2020` — Expression: `payload.total_amount * 0.10` (Memo: "Cr Broker Payable 10%")
   - Line 4: `CREDIT` `4000` — Expression: `payload.total_amount * 0.05` (Memo: "Cr MGA Override Revenue 5%")
2. **Rule `RULE_MGA_PMT_001`** (`billing.payment.received`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1010` — Expression: `payload.payment_amount` (Memo: "Dr Premium Trust Cash § 4053")
   - Line 2: `CREDIT` `1100` — Expression: `payload.allocated_amount` (Memo: "Cr Agency AR")
3. **Rule `RULE_MGA_SWEEP_001`** (`fiduciary.sweep.executed`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1000` — Expression: `payload.amount` (Memo: "Dr Operating Cash Transfer")
   - Line 2: `CREDIT` `1010` — Expression: `payload.amount` (Memo: "Cr Premium Trust Release")
4. **Rule `RULE_MGA_SETTLE_001`** (`carrier.settlement.disbursed`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `2010` — Expression: `payload.net_due_carrier` (Memo: "Dr Discharge Due to Carrier")
   - Line 2: `CREDIT` `1010` — Expression: `payload.net_due_carrier` (Memo: "Cr Premium Trust Settlement Disbursed")

---

## 3. Step-by-Step Scenario: Commercial Package Agency Bill Placement

- **Producing Broker:** Brightline Commercial Insurance Services (`BROKER-BRIGHTLINE`)
- **Underwriting Carrier:** Summit National Insurance Co. (`CARRIER-SUMMIT`)
- **Policy Reference:** `POL-HARBOR-8821`
- **Gross Written Premium:** `$10,000.00`
- **Commission Split Structure:**
  - Carrier Net Due: 85% (`$8,500.00`)
  - Producing Broker Commission: 10% (`$1,000.00`)
  - MGA Retained Commission Override: 5% (`$500.00`)

---

### Step M-1: Issue Agency Statement Invoice
- **Action:** Issue agency statement invoice to Brightline Brokerage for gross written premium.
- **UI Navigation:** Billing Workspace $\to$ Invoices $\to$ "+ Create Invoice".
- **API Call:** `POST /api/v1/billing/invoices`
```bash
curl -X POST http://localhost:5050/api/v1/billing/invoices \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <MGA_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "billingAccountId": "<MGA_BILLING_ACCOUNT_ID>",
    "policyId": "POL-HARBOR-8821",
    "installmentNumber": 1,
    "invoiceDate": "2026-07-01",
    "lines": [
      { "line_type": "PREMIUM", "description": "Commercial Package Gross Written Premium", "amount": "10000.00" }
    ]
  }'
```
- **Emitted Event:** `billing.invoice.issued` (Correlation ID: `CORR-INV-HARBOR-001`)
- **Published Rule Triggered:** `RULE_MGA_INV_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1100` | Agency Premium Receivable | 10,000.00 | 0.00 |
  | 2 | `CREDIT` | `2010` | Due to Insurance Carrier (Fiduciary) | 0.00 | 8,500.00 |
  | 3 | `CREDIT` | `2020` | Broker Commissions Payable | 0.00 | 1,000.00 |
  | 4 | `CREDIT` | `4000` | MGA Underwriting Commission Revenue | 0.00 | 500.00 |
- **Subledger & Invariants:**
  - Agency AR Status: `ISSUED`, Balance Due: `$10,000.00`.
  - Double Entry Balance: Debits `$10,000.00` == Credits `$10,000.00` (Zero imbalance).
  - Account `1020` Plug Check: Strict `$0.00`.

---

### Step M-2: Receive Broker Premium into Fiduciary Trust Cash
- **Action:** Record broker wire receipt of `$10,000.00` into Texas § 4053 Fiduciary Trust Account.
- **UI Navigation:** Billing Workspace $\to$ Payments $\to$ "+ Receive Payment".
- **API Call:** `POST /api/v1/billing/payments`
```bash
curl -X POST http://localhost:5050/api/v1/billing/payments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <MGA_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "billingAccountId": "<MGA_BILLING_ACCOUNT_ID>",
    "amount": "10000.00",
    "paymentMethod": "WIRE",
    "referenceNumber": "WIRE-FROST-TX-8821",
    "paymentDate": "2026-07-08",
    "targetInvoiceId": "<INVOICE_ID>",
    "isFiduciary": true
  }'
```
- **Emitted Event:** `billing.payment.received`
- **Published Rule Triggered:** `RULE_MGA_PMT_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1010` | Texas Statutory Premium Trust Account | 10,000.00 | 0.00 |
  | 2 | `CREDIT` | `1100` | Agency Premium Receivable | 0.00 | 10,000.00 |
- **Subledger & Invariants:**
  - Agency AR Balance: `$0.00` (cleared).
  - Premium Trust Cash (`1010`): `$10,000.00 Dr`.

---

### Step M-3: Execute Compliant MGA Fiduciary Commission Sweep
- **Action:** Sweep earned MGA commission override (`$500.00`) from Trust Cash (`1010`) to Operating Cash (`1000`).
- **UI Navigation:** Commissions Workspace $\to$ Sweeps $\to$ "Execute Sweep".
- **API Call:** `POST /api/v1/commissions/sweeps/execute`
```bash
curl -X POST http://localhost:5050/api/v1/commissions/sweeps/execute \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <MGA_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "fiduciary_account_id": "<FIDUCIARY_ACCOUNT_ID>",
    "amount": "500.00",
    "notes": "MGA July earned override sweep [Texas § 4053]"
  }'
```
- **Emitted Event:** `fiduciary.sweep.executed`
- **Published Rule Triggered:** `RULE_MGA_SWEEP_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1000` | MGA Operating Cash | 500.00 | 0.00 |
  | 2 | `CREDIT` | `1010` | Texas Statutory Premium Trust Account | 0.00 | 500.00 |
- **Balances After Sweep:**
  - Operating Cash (`1000`): `$500.00 Dr`
  - Fiduciary Trust Cash (`1010`): `$9,500.00 Dr` ($8,500 carrier due + $1,000 broker due)

---

### Step M-4: Over-Sweep Prevention Guard
- **Action:** Attempt to sweep an additional `$100.00` without corresponding earned commissions.
- **API Call:** `POST /api/v1/commissions/sweeps/execute` with `amount: "100.00"`.
- **Expected Response:** HTTP 400 Bad Request
```json
{
  "status": "error",
  "message": "Sweep amount ($100.00) exceeds eligible earned retained MGA commission ($0.00)"
}
```
- **Fiduciary Invariant:** Fails closed before touching database. Trust Cash is protected from commingling or conversion under Texas Insurance Code § 4053.

---

### Step M-5: Disburse Net Carrier Settlement
- **Action:** Remit net `$8,500.00` settlement to Summit National from Trust Cash (`1010`).
- **UI Navigation:** Commissions Workspace $\to$ Settlements $\to$ "Disburse Payment".
- **API Call:** `POST /api/v1/commissions/settlements/:id/disburse`
```bash
curl -X POST http://localhost:5050/api/v1/commissions/settlements/<STATEMENT_ID>/disburse \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <MGA_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentReference": "ACH-SUMMIT-DISBURSE-001"
  }'
```
- **Emitted Event:** `carrier.settlement.disbursed`
- **Published Rule Triggered:** `RULE_MGA_SETTLE_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `2010` | Due to Insurance Carrier (Fiduciary) | 8,500.00 | 0.00 |
  | 2 | `CREDIT` | `1010` | Texas Statutory Premium Trust Account | 0.00 | 8,500.00 |
- **Subledger & Invariants:**
  - Settlement statement status updated to `PAID`.
  - Due to Carrier (`2010`) balance: `$0.00` (discharged).

---

### Step M-6: MGA Fiduciary Equilibrium & Trial Balance
- **Action:** Generate and certify Trial Balance snapshot for `2026-07`.
- **UI Navigation:** Finance Close Workspace $\to$ Trial Balance $\to$ "Certify Snapshot".
- **API Call:** `POST /api/v1/close/trial-balance/certify`
```bash
curl -X POST http://localhost:5050/api/v1/close/trial-balance/certify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <MGA_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{ "period_name": "2026-07" }'
```
- **Expected Ending Trial Balance:**
  | Account Code | Account Name | Type | Debit ($) | Credit ($) | Net Balance ($) |
  | :--- | :--- | :--- | :-: | :-: | :-: |
  | `1000` | MGA Operating Cash | ASSET | 500.00 | 0.00 | $500.00 Dr |
  | `1010` | Texas Statutory Premium Trust Account | ASSET | 1,000.00 | 0.00 | $1,000.00 Dr |
  | `1100` | Agency Premium Receivable | ASSET | 0.00 | 0.00 | $0.00 |
  | `2010` | Due to Insurance Carrier | LIABILITY | 0.00 | 0.00 | $0.00 |
  | `2020` | Broker Commissions Payable | LIABILITY | 0.00 | 1,000.00 | $1,000.00 Cr |
  | `4000` | MGA Underwriting Commission Revenue | REVENUE | 0.00 | 500.00 | $500.00 Cr |
  | **TOTALS** | | | **1,500.00** | **1,500.00** | **Balanced ($0.00 Diff)** |

---

## 4. Fiduciary Equilibrium Verification Checklist

1. **Statutory § 4053 Equilibrium:**
   - Remaining Trust Cash in Account `1010` (`$1,000.00`) **exactly equals** Broker Commissions Payable in Account `2020` (`$1,000.00`).
   - Difference: `$0.00` (Complete mathematical equilibrium).
2. **Carrier Liability Discharge:**
   - Account `2010` Balance: `$0.00` (Gross written premium liability fully settled).
3. **Agency Subledger Balance:**
   - Account `1100` Balance: `$0.00` (Gross broker invoice fully collected).
4. **Operating Segregation:**
   - Account `1000` Balance: `$500.00 Dr` == Account `4000` Revenue: `$500.00 Cr`.

---

## 5. Test Data Clean-Up Guidance

1. **Isolation:** Use a dedicated test tenant code (e.g. `TEST_MGA_<TIMESTAMP>`).
2. **Never drop databases directly.**
3. **Archival:** Upon test completion, execute `POST /api/v1/close/periods/close` to hard-close the testing period and mark the testing tenant `status: 'INACTIVE'`.
