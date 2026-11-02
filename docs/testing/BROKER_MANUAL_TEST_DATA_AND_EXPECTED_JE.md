# Veridex One v4.6 — Broker Persona Manual Testing Reference
## Brightline Commercial Insurance Services (`BROKER`) End-to-End Acceptance Pack

**Document Purpose:** Ground-truth manual testing reference for Insurance Brokerage tenant acceptance.  
**Execution Mode:** Manual only (UI / API). Does NOT automatically seed or alter existing tenant data.  
**Auditor / Tester Role:** Platform Admin / Brokerage Finance Manager.

---

## 1. Tenant Overview & Business Model

- **Tenant Archetype:** `BROKER` (Brightline Commercial Insurance Services)
- **Primary Business:** Retail Client Direct Invoicing, Fiduciary Client Premium Trust Receipts, Internal Producer Commission Splits (e.g. 70/30 internal producer split), House Commission Sweeps, and Net Remittances to Managing General Agents or Carriers.
- **Base Currency:** `USD`
- **Fiduciary Statute:** Client Premium Trust Cash Segregation (Client trust funds received in Account `1010` are held in a fiduciary capacity until swept as earned house commission or disbursed to underwriting managers and internal retail producers).
- **Inter-Tenant Boundary:** Premium remittances to MGAs (`Harbor Risk`) or Carriers (`Summit National`) are processed via standard outbound electronic banking rails (ACH/Wire); automated inter-tenant event bridging is unsupported in v4.6.

---

## 2. Configuration & Prerequisites

### 2.1 Chart of Accounts (COA)
| Code | Account Name | Type | Normal Balance | Posting Allowed | Usage / Scope |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `1000` | Broker Operating Cash (Bank of America) | ASSET | DEBIT | YES | Unrestricted operating depository |
| `1010` | Client Premium Trust Cash (JPMorgan Chase) | ASSET | DEBIT | YES | Segregated client premium trust account |
| `1100` | Client Direct Receivable | ASSET | DEBIT | YES | Subledger control account for commercial client invoices |
| `2010` | Due to Underwriting Manager / MGA | LIABILITY | CREDIT | YES | Net fiduciary liability owed to managing general agent |
| `2030` | Retail Producer Commissions Payable | LIABILITY | CREDIT | YES | Subledger payable owed to retail commercial lines producer |
| `4000` | House Brokerage Commission Revenue | REVENUE | CREDIT | YES | Retained house brokerage commission income |

### 2.2 Fiduciary Trust Account Configuration
- **Account Code:** `FID-BROKER-TRUST-01`
- **Account Name:** JPMorgan Chase Commercial Client Premium Trust
- **Account Type:** `PREMIUM_TRUST`
- **Jurisdiction Statute:** `CLIENT_TRUST_FIDUCIARY`
- **GL Account Code:** `1010`
- **Bank Reference Token:** Vault reference token (`tok_jpm_trust_8841`)
- **Status:** `ACTIVE`

### 2.3 Fiscal Period
- **Period Name:** `2026-07`
- **Date Range:** `2026-07-01` to `2026-07-31`
- **Status:** `OPEN`

### 2.4 Published Journal Entry Rules
1. **Rule `RULE_BROKER_INV_001`** (`billing.invoice.issued`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1100` — Expression: `payload.total_amount` (Memo: "Dr Client AR")
   - Line 2: `CREDIT` `2010` — Expression: `payload.total_amount * 0.90` (Memo: "Cr Due to MGA 90%")
   - Line 3: `CREDIT` `2030` — Expression: `payload.total_amount * 0.07` (Memo: "Cr Producer Payable 7%")
   - Line 4: `CREDIT` `4000` — Expression: `payload.total_amount * 0.03` (Memo: "Cr House Revenue 3%")
2. **Rule `RULE_BROKER_PMT_001`** (`billing.payment.received`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1010` — Expression: `payload.payment_amount` (Memo: "Dr Client Premium Trust Cash")
   - Line 2: `CREDIT` `1100` — Expression: `payload.allocated_amount` (Memo: "Cr Client AR")
3. **Rule `RULE_BROKER_SWEEP_001`** (`fiduciary.sweep.executed`):
   - Priority: 100, Accounting Basis: GAAP
   - Line 1: `DEBIT` `1000` — Expression: `payload.amount` (Memo: "Dr Operating Cash Transfer")
   - Line 2: `CREDIT` `1010` — Expression: `payload.amount` (Memo: "Cr Client Trust Cash Release")

---

## 3. Step-by-Step Scenario: Commercial Fleet Retail Placement

- **Client Insured:** Metro Transit Logistics Inc.
- **Underwriting Manager:** Harbor Risk Underwriting Managers (`MGA-HARBOR`)
- **Retail Producer:** James Reynolds (`PRODUCER-JAMES`)
- **Policy Reference:** `POL-BROKER-101`
- **Gross Premium:** `$10,000.00`
- **Commission & Remittance Terms:**
  - Net Due to MGA / Program Underwriter: 90% (`$9,000.00`)
  - Total Broker Commission: 10% (`$1,000.00`)
    - Producer Split (70% of commission): 7% of GWP (`$700.00`)
    - House Retained Brokerage (30% of commission): 3% of GWP (`$300.00`)

---

### Step B-1: Issue Client Direct Invoice
- **Action:** Issue direct bill invoice to Metro Transit Logistics for full policy premium.
- **UI Navigation:** Billing Workspace $\to$ Invoices $\to$ "+ Create Invoice".
- **API Call:** `POST /api/v1/billing/invoices`
```bash
curl -X POST http://localhost:5050/api/v1/billing/invoices \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <BROKER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "billingAccountId": "<BROKER_BILLING_ACCOUNT_ID>",
    "policyId": "POL-BROKER-101",
    "installmentNumber": 1,
    "invoiceDate": "2026-07-01",
    "lines": [
      { "line_type": "PREMIUM", "description": "Commercial Fleet Policy Premium", "amount": "10000.00" }
    ]
  }'
```
- **Emitted Event:** `billing.invoice.issued` (Correlation ID: `CORR-INV-BROKER-001`)
- **Published Rule Triggered:** `RULE_BROKER_INV_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1100` | Client Direct Receivable | 10,000.00 | 0.00 |
  | 2 | `CREDIT` | `2010` | Due to Underwriting Manager / MGA | 0.00 | 9,000.00 |
  | 3 | `CREDIT` | `2030` | Retail Producer Commissions Payable | 0.00 | 700.00 |
  | 4 | `CREDIT` | `4000` | House Brokerage Commission Revenue | 0.00 | 300.00 |
- **Subledger & Invariants:**
  - Client AR Status: `ISSUED`, Balance Due: `$10,000.00`.
  - Double Entry Balance: Debits `$10,000.00` == Credits `$10,000.00`.
  - Account `1020` Plug Check: Strict `$0.00`.

---

### Step B-2: Receive Client Premium into Trust Cash
- **Action:** Record customer check payment of `$10,000.00` into JPMorgan Chase Trust Account.
- **UI Navigation:** Billing Workspace $\to$ Payments $\to$ "+ Receive Payment".
- **API Call:** `POST /api/v1/billing/payments`
```bash
curl -X POST http://localhost:5050/api/v1/billing/payments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <BROKER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "billingAccountId": "<BROKER_BILLING_ACCOUNT_ID>",
    "amount": "10000.00",
    "paymentMethod": "CHECK",
    "referenceNumber": "CHK-METRO-10041",
    "paymentDate": "2026-07-09",
    "targetInvoiceId": "<INVOICE_ID>",
    "isFiduciary": true
  }'
```
- **Emitted Event:** `billing.payment.received`
- **Published Rule Triggered:** `RULE_BROKER_PMT_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1010` | Client Premium Trust Cash | 10,000.00 | 0.00 |
  | 2 | `CREDIT` | `1100` | Client Direct Receivable | 0.00 | 10,000.00 |
- **Subledger & Invariants:**
  - Client AR Balance: `$0.00` (cleared).
  - Client Trust Cash (`1010`): `$10,000.00 Dr`.

---

### Step B-3: Sweep House Commission to Operating Cash
- **Action:** Transfer `$300.00` earned house brokerage commission from Trust (`1010`) to Operating (`1000`).
- **UI Navigation:** Commissions Workspace $\to$ Sweeps $\to$ "Execute Sweep".
- **API Call:** `POST /api/v1/commissions/sweeps/execute`
```bash
curl -X POST http://localhost:5050/api/v1/commissions/sweeps/execute \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <BROKER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "fiduciary_account_id": "<FIDUCIARY_ACCOUNT_ID>",
    "amount": "300.00",
    "notes": "House brokerage commission sweep (30% split retention)"
  }'
```
- **Emitted Event:** `fiduciary.sweep.executed`
- **Published Rule Triggered:** `RULE_BROKER_SWEEP_001`
- **Expected Journal Entry:**
  | Line # | Direction | Account Code | Account Name | Debit ($) | Credit ($) |
  | :-: | :-: | :--- | :--- | :-: | :-: |
  | 1 | `DEBIT` | `1000` | Broker Operating Cash | 300.00 | 0.00 |
  | 2 | `CREDIT` | `1010` | Client Premium Trust Cash | 0.00 | 300.00 |
- **Balances After Sweep:**
  - Broker Operating Cash (`1000`): `$300.00 Dr`
  - Client Premium Trust Cash (`1010`): `$9,700.00 Dr` (safeguarding `$9,000.00` for MGA and `$700.00` for Producer)

---

### Step B-4: Broker Fiduciary Equilibrium & Trial Balance
- **Action:** Generate and certify Trial Balance snapshot for `2026-07`.
- **UI Navigation:** Finance Close Workspace $\to$ Trial Balance $\to$ "Certify Snapshot".
- **API Call:** `POST /api/v1/close/trial-balance/certify`
```bash
curl -X POST http://localhost:5050/api/v1/close/trial-balance/certify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant-id: <BROKER_TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{ "period_name": "2026-07" }'
```
- **Expected Ending Trial Balance:**
  | Account Code | Account Name | Type | Debit ($) | Credit ($) | Net Balance ($) |
  | :--- | :--- | :--- | :-: | :-: | :-: |
  | `1000` | Broker Operating Cash | ASSET | 300.00 | 0.00 | $300.00 Dr |
  | `1010` | Client Premium Trust Cash | ASSET | 9,700.00 | 0.00 | $9,700.00 Dr |
  | `1100` | Client Direct Receivable | ASSET | 0.00 | 0.00 | $0.00 |
  | `2010` | Due to Underwriting Manager / MGA | LIABILITY | 0.00 | 9,000.00 | $9,000.00 Cr |
  | `2030` | Retail Producer Commissions Payable | LIABILITY | 0.00 | 700.00 | $700.00 Cr |
  | `4000` | House Brokerage Commission Revenue | REVENUE | 0.00 | 300.00 | $300.00 Cr |
  | **TOTALS** | | | **10,000.00** | **10,000.00** | **Balanced ($0.00 Diff)** |

---

## 4. Fiduciary Equilibrium Verification Checklist

1. **Client Trust Cash Equilibrium:**
   - Remaining Trust Cash in Account `1010` (`$9,700.00`) **exactly equals** Due to MGA in Account `2010` (`$9,000.00`) + Retail Producer Payable in Account `2030` (`$700.00`).
   - Fiduciary Difference: `$0.00` (Fiduciary trust funds are perfectly covered).
2. **Client Receivable Subledger:**
   - Account `1100` Balance: `$0.00` (Retail customer balance is fully extinguished).
3. **Operating Cash Segregation:**
   - Operating Cash in Account `1000` (`$300.00 Dr`) == House Revenue in Account `4000` (`$300.00 Cr`).
4. **Zero Commingling Invariant:**
   - At no point did operating expenses or non-trust payables draw upon Account `1010`.

---

## 5. Test Data Clean-Up Guidance

1. **Isolation:** Use a dedicated test tenant code (e.g. `TEST_BROKER_<TIMESTAMP>`).
2. **Never drop databases directly.**
3. **Archival:** Upon test completion, execute `POST /api/v1/close/periods/close` to hard-close the testing period and mark the testing tenant `status: 'INACTIVE'`.
