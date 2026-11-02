# Veridex One — Phase R5 Manual Acceptance Guide
## Unified Operational Walkthrough for Multi-Tenant Insurance Finance & Accounting

**Version:** 4.6.0  
**Phase:** R5 — End-to-End Tenant Business Acceptance & Operational Readiness  
**Target Audience:** Finance Operations, Lead Accounting Auditors, QA Automation Engineers  
**Target Base URL:** `http://localhost:5050` (or configured API gateway)  

---

## 1. Overview & Operational Principles

This guide provides a unified, step-by-step operational procedure for manual business acceptance across all three canonical insurance archetypes supported by Veridex One:
1. **Carrier Archetype:** Direct billing, written premium & UPR accounting, cash collection, NSF return handling, ASC 944 UPR amortization, and Trial Balance certification.
2. **MGA Archetype:** Agency billing, split fiduciary liabilities (Carrier 85%, Broker 10%), retained revenue (5%), Premium Trust Cash (§ 4053), earned fiduciary sweep with over-sweep guard, and net carrier settlement.
3. **Broker Archetype:** Retail client billing, producer commission split (7%), house brokerage retention (3%), Client Trust Cash collection, and house sweep to operating cash.

### Core Working Rules:
- **No Automatic Seeding:** No demo records or sample tenants are seeded on application startup.
- **Tenant Isolation:** Carrier, MGA, and Broker operate in independent tenant environments with distinct Chart of Accounts, fiscal periods, and published JE rules.
- **Zero Plug Accounts:** All journals balance organically. Account 1020 is eliminated.

---

## 2. System Readiness & Health Check

Before executing business transactions, verify that the database cluster satisfies the multi-document transaction topology prerequisite.

### Request:
```bash
curl -s -X GET http://localhost:5050/health
```

### Expected Response:
```json
{
  "status": "healthy",
  "database": {
    "status": "TRANSACTION_CAPABLE",
    "topology": "ReplicaSetWithPrimary",
    "transactions_supported": true
  }
}
```
> [!IMPORTANT]
> If `transactions_supported` is `false`, the platform will fail closed with `DATABASE_TOPOLOGY_UNSUPPORTED` on any atomic financial operation. Ensure MongoDB is running as a replica set.

---

## 3. Walkthrough 1: Carrier Archetype Acceptance

### Step C-1: Onboard Carrier Tenant
- **UI Path:** Navigation Drawer $\to$ Organization Settings $\to$ "Create New Tenant"
- **API Endpoint:** `POST /api/v1/auth/register-tenant`
```bash
curl -X POST http://localhost:5050/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_name": "Acceptance Carrier Corporation",
    "tenant_type": "CARRIER",
    "base_currency": "USD"
  }'
```
*Save returned `tenant_id` as `$CARRIER_TID` and use auth token `$CARRIER_TOKEN`.*

### Step C-2: Setup Carrier Chart of Accounts & Fiscal Periods
- **UI Path:** GL Workspace $\to$ Chart of Accounts $\to$ "Add Account"
- Create accounts:
  - `1000` (Operating Cash, Asset, Normal Balance Debit)
  - `1100` (Policyholder Premium Receivable, Asset, Normal Balance Debit)
  - `2200` (Unearned Premium Reserve, Liability, Normal Balance Credit)
  - `4000` (Earned Premium Revenue, Revenue, Normal Balance Credit)
  - `4100` (Policy Fee Income, Revenue, Normal Balance Credit)
- Open fiscal period for current month via GL Workspace $\to$ Fiscal Periods.

### Step C-3: Publish Carrier Journal Entry Rules
- **UI Path:** Event Operations $\to$ JE Rules Builder $\to$ "Publish Rule"
- Publish rules for:
  1. `billing.invoice.issued` $\to$ `RULE_CARRIER_INV_001`:
     - Dr `1100` (AR) = `payload.total_amount`
     - Cr `2200` (UPR) = `payload.premium_amount`
     - Cr `4100` (Fee Income) = `payload.fee_amount`
  2. `billing.payment.received` $\to$ `RULE_CARRIER_PMT_001`:
     - Dr `1000` (Cash) = `payload.allocated_amount`
     - Cr `1100` (AR) = `payload.allocated_amount`
  3. `treasury.payment.returned` $\to$ `RULE_CARRIER_RET_001`:
     - Dr `1100` (AR Reinstatement) = `payload.return_amount`
     - Dr `1100` (NSF Fee AR) = `payload.nsf_fee_amount`
     - Cr `1000` (Operating Cash) = `payload.return_amount`
     - Cr `4100` (NSF Fee Revenue) = `payload.nsf_fee_amount`
  4. `upr.earning.requested` $\to$ `RULE_CARRIER_UPR_001`:
     - Dr `2200` (UPR) = `payload.total_earned_amount`
     - Cr `4000` (Earned Premium) = `payload.total_earned_amount`

### Step C-4: Issue Direct Policy Invoice
- **UI Path:** Billing Workspace $\to$ Invoices $\to$ "Create Invoice"
- **API Call:**
```bash
curl -X POST http://localhost:5050/api/v1/billing/invoices \
  -H "Authorization: Bearer $CARRIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_number": "INV-CARRIER-MANUAL-001",
    "policy_id": "POL-CARRIER-101",
    "total_amount": 9200.00,
    "premium_amount": 9000.00,
    "fee_amount": 200.00,
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1100** `$9,200.00`, **Cr 2200** `$9,000.00`, **Cr 4100** `$200.00`.

### Step C-5: Record Customer Payment
- **UI Path:** Billing Workspace $\to$ Payments $\to$ "Receive Payment"
```bash
curl -X POST http://localhost:5050/api/v1/billing/payments \
  -H "Authorization: Bearer $CARRIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_number": "PMT-CARRIER-MANUAL-001",
    "invoice_id": "<INVOICE_ID>",
    "payment_amount": 9200.00,
    "allocated_amount": 9200.00,
    "unapplied_amount": 0.00,
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1000** `$9,200.00`, **Cr 1100** `$9,200.00`. AR balance is `$0.00`.

### Step C-6: Process NSF Dishonored Payment Return
- **UI Path:** Treasury Workspace $\to$ Returns $\to$ "Process NSF Return"
```bash
curl -X POST http://localhost:5050/api/v1/treasury/returns \
  -H "Authorization: Bearer $CARRIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "return_number": "RET-CARRIER-MANUAL-001",
    "payment_id": "<PAYMENT_ID>",
    "return_amount": 9200.00,
    "nsf_fee_amount": 35.00,
    "reason_code": "NSF",
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1100** `$9,235.00` total, **Cr 1000** `$9,200.00`, **Cr 4100** `$35.00`.

### Step C-7: Run Month-End UPR Amortization
- **UI Path:** Finance Close Workspace $\to$ UPR Earning $\to$ "Run Earning"
```bash
curl -X POST http://localhost:5050/api/v1/close/upr-runs \
  -H "Authorization: Bearer $CARRIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_id": "POL-CARRIER-101",
    "as_of_date": "2026-01-31",
    "earned_amount": 764.38,
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 2200** `$764.38`, **Cr 4000** `$764.38`.

### Step C-8: Certify Trial Balance
- **UI Path:** Finance Close Workspace $\to$ Trial Balance $\to$ "Certify Snapshot"
- **Verification:** Total Debits (`$9,235.00`) == Total Credits (`$9,235.00`). Variance: `$0.00`.

---

## 4. Walkthrough 2: MGA Archetype Acceptance

### Step M-1: Onboard MGA Tenant
```bash
curl -X POST http://localhost:5050/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_name": "Acceptance Underwriting Managers",
    "tenant_type": "MGA",
    "base_currency": "USD"
  }'
```
*Save returned `tenant_id` as `$MGA_TID` and use auth token `$MGA_TOKEN`.*

### Step M-2: Setup MGA Chart of Accounts
Create accounts:
- `1000` (Operating Cash, Asset)
- `1010` (Premium Trust Cash - Texas Ins. Code § 4053, Asset)
- `1100` (Agency Premium Receivable, Asset)
- `2010` (Due to Insurance Carrier, Liability)
- `2020` (Broker Commission Payable, Liability)
- `4000` (MGA Commission Revenue, Revenue)

### Step M-3: Publish MGA Journal Entry Rules
- `billing.invoice.issued` $\to$ `RULE_MGA_INV_001`:
  - Dr `1100` (AR) = `payload.total_amount` (`$10,000.00`)
  - Cr `2010` (Carrier Due 85%) = `payload.due_to_carrier` (`$8,500.00`)
  - Cr `2020` (Broker Due 10%) = `payload.due_to_broker` (`$1,000.00`)
  - Cr `4000` (MGA Revenue 5%) = `payload.mga_revenue` (`$500.00`)
- `billing.payment.received` $\to$ `RULE_MGA_PMT_001`:
  - Dr `1010` (Trust Cash) = `payload.allocated_amount`
  - Cr `1100` (AR) = `payload.allocated_amount`
- `fiduciary.sweep.executed` $\to$ `RULE_MGA_SWEEP_001`:
  - Dr `1000` (Operating Cash) = `payload.amount`
  - Cr `1010` (Trust Cash) = `payload.amount`
- `carrier.settlement.disbursed` $\to$ `RULE_MGA_SETTLE_001`:
  - Dr `2010` (Due to Carrier) = `payload.net_amount`
  - Cr `1010` (Trust Cash) = `payload.net_amount`

### Step M-4: Issue Agency Bill Invoice
```bash
curl -X POST http://localhost:5050/api/v1/billing/invoices \
  -H "Authorization: Bearer $MGA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_number": "INV-MGA-MANUAL-001",
    "policy_id": "POL-MGA-101",
    "total_amount": 10000.00,
    "due_to_carrier": 8500.00,
    "due_to_broker": 1000.00,
    "mga_revenue": 500.00,
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1100** `$10,000.00`, **Cr 2010** `$8,500.00`, **Cr 2020** `$1,000.00`, **Cr 4000** `$500.00`.

### Step M-5: Receive Agency Payment into Premium Trust
```bash
curl -X POST http://localhost:5050/api/v1/billing/payments \
  -H "Authorization: Bearer $MGA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_number": "PMT-MGA-MANUAL-001",
    "invoice_id": "<INVOICE_ID>",
    "payment_amount": 10000.00,
    "allocated_amount": 10000.00,
    "unapplied_amount": 0.00,
    "is_fiduciary": true,
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1010** `$10,000.00`, **Cr 1100** `$10,000.00`. Trust cash balance is `$10,000.00`.

### Step M-6: Execute Earned Fiduciary Sweep & Test Over-Sweep Guard
- **Execute Valid Sweep ($500.00):**
```bash
curl -X POST http://localhost:5050/api/v1/commissions/fiduciary/sweeps \
  -H "Authorization: Bearer $MGA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sweep_reference": "SWEEP-MGA-MANUAL-001",
    "amount": 500.00,
    "eligible_retained": 500.00,
    "notes": "Transfer 5% earned commission",
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1000** `$500.00`, **Cr 1010** `$500.00`.
- **Test Over-Sweep Guard:** Attempt a second sweep of `$100.00`.
  - **Expected Result:** HTTP 400 Bad Request (`Sweep amount exceeds remaining eligible retained commissions`).

### Step M-7: Disburse Carrier Settlement
```bash
curl -X POST http://localhost:5050/api/v1/commissions/settlements/<STATEMENT_ID>/disburse \
  -H "Authorization: Bearer $MGA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "statement_number": "STMT-MGA-MANUAL-001",
    "net_amount": 8500.00,
    "gross_premium": 10000.00,
    "commission_deducted": 1500.00,
    "payment_reference": "WIRE-CARRIER-MANUAL-001",
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 2010** `$8,500.00`, **Cr 1010** `$8,500.00`. Carrier payable balance is `$0.00`.

### Step M-8: Verify Fiduciary Equilibrium (§ 4053)
- Premium Trust Cash (`1010`): `$1,000.00`
- Broker Commission Payable (`2020`): `$1,000.00`
- **Equilibrium Check:** $\text{Trust Cash (1010)} = \text{Broker Payable (2020)}$. Fiduciary deficit = `$0.00`.

---

## 5. Walkthrough 3: Broker Archetype Acceptance

### Step B-1: Onboard Broker Tenant
```bash
curl -X POST http://localhost:5050/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_name": "Acceptance Brokerage Services",
    "tenant_type": "BROKER",
    "base_currency": "USD"
  }'
```
*Save returned `tenant_id` as `$BROKER_TID` and use auth token `$BROKER_TOKEN`.*

### Step B-2: Setup Broker Chart of Accounts
Create accounts:
- `1000` (Operating Cash, Asset)
- `1010` (Client Premium Trust Cash, Asset)
- `1100` (Retail Client Receivable, Asset)
- `2010` (Due to Underwriting Manager / MGA, Liability)
- `2030` (Producer Commission Payable, Liability)
- `4000` (House Brokerage Commission Revenue, Revenue)

### Step B-3: Publish Broker Journal Entry Rules
- `billing.invoice.issued` $\to$ `RULE_BROKER_INV_001`:
  - Dr `1100` (AR) = `payload.total_amount` (`$10,000.00`)
  - Cr `2010` (Due to MGA 90%) = `payload.due_to_mga` (`$9,000.00`)
  - Cr `2030` (Producer Payable 7%) = `payload.producer_payable` (`$700.00`)
  - Cr `4000` (House Revenue 3%) = `payload.house_revenue` (`$300.00`)
- `billing.payment.received` $\to$ `RULE_BROKER_PMT_001`:
  - Dr `1010` (Trust Cash) = `payload.allocated_amount`
  - Cr `1100` (AR) = `payload.allocated_amount`
- `fiduciary.sweep.executed` $\to$ `RULE_BROKER_SWEEP_001`:
  - Dr `1000` (Operating Cash) = `payload.amount`
  - Cr `1010` (Trust Cash) = `payload.amount`

### Step B-4: Issue Client Direct Invoice
```bash
curl -X POST http://localhost:5050/api/v1/billing/invoices \
  -H "Authorization: Bearer $BROKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_number": "INV-BROKER-MANUAL-001",
    "policy_id": "POL-BROKER-101",
    "total_amount": 10000.00,
    "due_to_mga": 9000.00,
    "producer_payable": 700.00,
    "house_revenue": 300.00,
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1100** `$10,000.00`, **Cr 2010** `$9,000.00`, **Cr 2030** `$700.00`, **Cr 4000** `$300.00`.

### Step B-5: Receive Client Premium into Trust
```bash
curl -X POST http://localhost:5050/api/v1/billing/payments \
  -H "Authorization: Bearer $BROKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_number": "PMT-BROKER-MANUAL-001",
    "invoice_id": "<INVOICE_ID>",
    "payment_amount": 10000.00,
    "allocated_amount": 10000.00,
    "unapplied_amount": 0.00,
    "is_fiduciary": true,
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1010** `$10,000.00`, **Cr 1100** `$10,000.00`. Trust cash balance is `$10,000.00`.

### Step B-6: Sweep House Brokerage Revenue
```bash
curl -X POST http://localhost:5050/api/v1/commissions/fiduciary/sweeps \
  -H "Authorization: Bearer $BROKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sweep_reference": "SWEEP-BROKER-MANUAL-001",
    "amount": 300.00,
    "eligible_retained": 300.00,
    "notes": "Transfer 30% house brokerage retention to operating",
    "currency": "USD"
  }'
```
- **Verification:** GL Journal posted: **Dr 1000** `$300.00`, **Cr 1010** `$300.00`. Trust cash balance is `$9,700.00`.

### Step B-7: Verify Broker Fiduciary Equilibrium
- Client Trust Cash (`1010`): `$9,700.00`
- Due to Underwriting Manager (`2010`): `$9,000.00`
- Producer Commission Payable (`2030`): `$700.00`
- **Equilibrium Check:** $\text{Trust Cash (1010)} = \text{Due to MGA (2010)} + \text{Producer Payable (2030)} = \$9,700.00$. Fiduciary deficit = `$0.00`.

---

## 6. Verification & Reconciliation Checkpoints

At the conclusion of each tenant walkthrough, verify:
1. **Mathematical Balance:** Sum of all debit lines in posted journals exactly equals sum of credit lines ($\sum Dr = \sum Cr$).
2. **Subledger Alignment:**
   - Outstanding AR balance in `Invoice` collection equals balance of Account `1100`.
   - Remaining unearned premium in `UPRAmortizationSchedule` equals balance of Account `2200`.
   - Outstanding fiduciary liabilities equal balance of Accounts `2010`, `2020`, and `2030`.
3. **No Account 1020 Usage:** Query journals for `account_code: "1020"`; count must be `0`.
4. **Audit Trace:** Every posted journal must have `sourceModule: "RULES_ENGINE"` and a valid `sourceReference` linking back to the originating `OutboxEvent`.

---

## 7. Ephemeral Test Cleanup Guidance

When running manual tests in development or staging environments, perform cleanup without mutating or deleting historical production records:
```bash
# Query ephemeral test records by tenant code prefix
# e.g., in mongosh:
db.tenants.find({ tenant_code: /^R5_MANUAL_/ })

# Ephemeral fixtures may be safely removed after acceptance sign-off:
# db.invoices.deleteMany({ tenant_id: ObjectId("<EPHEMERAL_TID>") })
# db.journals.deleteMany({ tenant_id: ObjectId("<EPHEMERAL_TID>") })
# db.outbox_events.deleteMany({ tenant_id: ObjectId("<EPHEMERAL_TID>") })
```
> [!CAUTION]
> Never delete or mutate historical records associated with production tenants (`CARRIER-PROD`, `MGA-HARBOR`, `BROKER-BRIGHTLINE`). All production audits and financial periods are strictly immutable.
