# Veridex One — Domain Event Catalog
## Canonical Business Event Definitions, JSON Schemas & Handshake Invariants

**Version:** 1.0.0  
**Effective Date:** October 14, 2026  
**Audience:** Platform Architects, Financial Engineers, Integration Teams

---

## 1. Catalog Overview

The Veridex One Domain Event Catalog defines the standard, tenant-scoped events emitted by core business domain services (Billing & AR, Treasury & Bank Reconciliation, Commissions & Fiduciary, and Finance Close). 

Each event follows strict semantic versioning, JSON Schema draft-07 validation, deterministic idempotency key formatting, and explicit financial posting classifications.

### Event Classification Principles:
1. **Financial Posting Events (`creates_journal: true`)**: Business transactions that alter financial position, assets, liabilities, revenue, or expense. Delivered through the durable outbox to the `JE_RULES_CONSUMER`, which resolves tenant-specific published rules and posts balanced double-entry journals to the General Ledger.
2. **Operational / Informational Events (`creates_journal: false`)**: Lifecycle state transitions, imports, reconciliation matches, or report runs. Audited in the outbox/inbox pipeline with zero GL financial impact.

---

## 2. Event Inventory & Contracts

### 2.1 Billing & Accounts Receivable

#### 2.1.1 `billing.invoice.issued`
- **Description:** Emitted when a formal customer invoice (deposit or installment) is issued against a billing account and linked policy.
- **Producer:** `billingService.js` $\to$ `issueInvoice()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Accounts Receivable, Cr Unearned Premium Reserve, Cr Fee Revenue)
- **Idempotency Key:** `tenant:billing:invoice:{invoice_id}`
- **Retryable:** Yes (transient DB or network timeouts)
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["invoice_number", "total_amount", "premium_amount", "fee_amount"],
  "properties": {
    "invoice_number": { "type": "string" },
    "billing_account_id": { "type": "string" },
    "policy_id": { "type": "string" },
    "installment_number": { "type": "integer", "minimum": 1 },
    "total_amount": { "type": "number", "minimum": 0 },
    "premium_amount": { "type": "number", "minimum": 0 },
    "fee_amount": { "type": "number", "minimum": 0 },
    "currency": { "type": "string", "default": "USD" },
    "due_date": { "type": "string" }
  }
}
```

#### 2.1.2 `billing.payment.received`
- **Description:** Emitted when customer funds are captured and allocated against invoices or suspense.
- **Producer:** `billingService.js` $\to$ `processPaymentReceipt()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Operating/Trust Cash, Cr Accounts Receivable, Cr Unapplied Cash Suspense)
- **Idempotency Key:** `tenant:billing:payment:{payment_id}`
- **Retryable:** Yes
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["payment_number", "payment_amount", "allocated_amount", "unapplied_amount"],
  "properties": {
    "payment_number": { "type": "string" },
    "billing_account_id": { "type": "string" },
    "payment_method": { "type": "string", "enum": ["ACH", "WIRE", "CHECK", "CREDIT_CARD"] },
    "reference_number": { "type": "string" },
    "payment_amount": { "type": "number", "minimum": 0 },
    "allocated_amount": { "type": "number", "minimum": 0 },
    "unapplied_amount": { "type": "number", "minimum": 0 },
    "is_fiduciary": { "type": "boolean", "default": true },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

#### 2.1.3 `billing.adjustment.applied`
- **Description:** Emitted when an AR balance adjustment (Fee Waiver, Credit Memo, Bad Debt Write-off) is authorized.
- **Producer:** `billingService.js` $\to$ `createAdjustment()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Fee Contra / Bad Debt Expense, Cr Accounts Receivable)
- **Idempotency Key:** `tenant:billing:adj:{adjustment_id}`
- **Retryable:** Yes
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["adjustment_number", "adjustment_type", "amount"],
  "properties": {
    "adjustment_number": { "type": "string" },
    "billing_account_id": { "type": "string" },
    "invoice_id": { "type": "string" },
    "adjustment_type": { "type": "string", "enum": ["FEE_WAIVER", "CREDIT_MEMO", "WRITE_OFF"] },
    "amount": { "type": "number", "minimum": 0 },
    "reason_code": { "type": "string" },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

---

### 2.2 Treasury & Bank Reconciliation

#### 2.2.1 `treasury.payment_attempt.failed`
- **Description:** Emitted when a processor debit attempt fails or declines (e.g., Insufficient Funds, Expired Token).
- **Producer:** `treasuryService.js` $\to$ `executePaymentAttempt()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **No** (Informational; payment attempts do not move cash or clear AR)
- **Idempotency Key:** `tenant:treasury:attempt:{attempt_id}`
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["attempt_id", "mandate_id", "amount", "failure_code"],
  "properties": {
    "attempt_id": { "type": "string" },
    "mandate_id": { "type": "string" },
    "amount": { "type": "number" },
    "failure_code": { "type": "string" },
    "failure_message": { "type": "string" }
  }
}
```

#### 2.2.2 `treasury.payment.returned`
- **Description:** Emitted when an ACH dishonor or NSF return notification is received from the bank.
- **Producer:** `treasuryService.js` $\to$ `processPaymentReturn()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Accounts Receivable, Cr Cash, Dr Accounts Receivable [NSF Fee], Cr Fee Income)
- **Idempotency Key:** `tenant:treasury:return:{return_id}`
- **Retryable:** Yes
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["return_number", "payment_number", "return_amount", "fee_amount", "return_code"],
  "properties": {
    "return_number": { "type": "string" },
    "payment_id": { "type": "string" },
    "payment_number": { "type": "string" },
    "return_amount": { "type": "number", "minimum": 0 },
    "fee_amount": { "type": "number", "minimum": 0 },
    "return_code": { "type": "string" },
    "reason_description": { "type": "string" },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

#### 2.2.3 `treasury.refund.disbursed`
- **Description:** Emitted when an approved premium refund or cancellation return is disbursed to a policyholder.
- **Producer:** `treasuryService.js` $\to$ `processRefundDisbursement()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Return Premium Payable / Unapplied Cash, Cr Trust Cash)
- **Idempotency Key:** `tenant:treasury:refund:{refund_id}`
- **Retryable:** Yes
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["refund_number", "amount", "refund_method"],
  "properties": {
    "refund_number": { "type": "string" },
    "billing_account_id": { "type": "string" },
    "amount": { "type": "number", "minimum": 0 },
    "refund_method": { "type": "string", "enum": ["ACH", "WIRE", "CHECK"] },
    "reason": { "type": "string" },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

#### 2.2.4 `treasury.bank_statement.imported` & `treasury.bank_transaction.matched`
- **Description:** Emitted during bank statement ingestion and auto/manual reconciliation matching.
- **Producer:** `treasuryService.js` $\to$ `importBankStatementLines()`, `manualMatch()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **No** (Reconciliation subledger metadata; does not represent a new economic cash movement)
- **Idempotency Key:** `tenant:treasury:bank_line:{line_id}`

---

### 2.3 Commissions, Fiduciary & Settlements

#### 2.3.1 `commission.accrued`
- **Description:** Emitted when policy commission calculations are finalized and payable splits recorded.
- **Producer:** `commissionsService.js` $\to$ `processCommissionTransaction()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** Optional by rule (Dr Commission Expense, Cr Commission Payable)
- **Idempotency Key:** `tenant:comm:tx:{transaction_id}`
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["transaction_number", "total_commission", "basis_amount"],
  "properties": {
    "transaction_number": { "type": "string" },
    "policy_reference": { "type": "string" },
    "total_commission": { "type": "number", "minimum": 0 },
    "basis_amount": { "type": "number", "minimum": 0 },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

#### 2.3.2 `fiduciary.sweep.executed`
- **Description:** Emitted when statutory earned commissions are swept from the Texas § 4053 Fiduciary Premium Trust to Operating Cash.
- **Producer:** `commissionsService.js` $\to$ `executeFiduciarySweep()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Operating Cash, Cr Premium Trust Cash)
- **Idempotency Key:** `tenant:fiduciary:sweep:{sweep_ref}`
- **Retryable:** Yes
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["sweep_reference", "amount"],
  "properties": {
    "sweep_reference": { "type": "string" },
    "fiduciary_account_id": { "type": "string" },
    "amount": { "type": "number", "minimum": 0 },
    "eligible_retained": { "type": "number", "minimum": 0 },
    "notes": { "type": "string" },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

#### 2.3.3 `carrier.settlement.disbursed`
- **Description:** Emitted when net premium settlements due to insurance carriers are disbursed from trust cash.
- **Producer:** `commissionsService.js` $\to$ `disburseSettlementPayment()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Due to Carrier, Cr Premium Trust Cash)
- **Idempotency Key:** `tenant:settlement:disburse:{statement_id}`
- **Retryable:** Yes
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["statement_number", "net_amount", "payment_reference"],
  "properties": {
    "statement_number": { "type": "string" },
    "carrier_party_id": { "type": "string" },
    "net_amount": { "type": "number", "minimum": 0 },
    "gross_premium": { "type": "number", "minimum": 0 },
    "commission_deducted": { "type": "number", "minimum": 0 },
    "payment_reference": { "type": "string" },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

---

### 2.4 Finance Close, UPR & Financial Reporting

#### 2.4.1 `upr.earning.requested`
- **Description:** Emitted when unearned premium reserve daily or monthly amortization is executed.
- **Producer:** `financeCloseService.js` $\to$ `runUprEarning()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **Yes** (Dr Unearned Premium Reserve, Cr Earned Premium Revenue)
- **Idempotency Key:** `tenant:upr:{policy_ref}:{period_name}`
- **Retryable:** Yes
- **JSON Schema (v1.0.0):**
```json
{
  "type": "object",
  "required": ["policy_reference", "period_name", "earned_premium", "written_premium"],
  "properties": {
    "policy_reference": { "type": "string" },
    "period_name": { "type": "string" },
    "earned_premium": { "type": "number", "minimum": 0 },
    "written_premium": { "type": "number", "minimum": 0 },
    "covered_days": { "type": "integer", "minimum": 1 },
    "total_term_days": { "type": "integer", "minimum": 1 },
    "currency": { "type": "string", "default": "USD" }
  }
}
```

#### 2.4.2 `finance.subledger.reconciliation.completed` & `finance.period_close.task.completed`
- **Description:** Emitted when automated subledger-to-GL audit checks complete or sequential close tasks advance.
- **Producer:** `financeCloseService.js` $\to$ `reconcileSubledgers()`, `executePeriodCloseStep()`
- **Consumer:** `JE_RULES_CONSUMER`
- **Creates Journal:** **No** (Audit tracking and close task orchestration; no direct GL journal)
- **Idempotency Key:** `tenant:close:{period_name}:{task_name}`
