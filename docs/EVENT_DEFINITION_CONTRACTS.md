# Veridex One — Event Definition Contracts & Catalog

**Version:** 4.6.0-R2  
**Specification:** JSON Schema Draft-07  
**Module:** Event Catalog & Inbound Contracts  

---

## 1. Specification Overview

Every financial event ingested by Veridex One must conform to a registered `EventDefinition`. The event definition enforces a strongly-typed contract using **JSON Schema Draft-07** compiled and validated via `ajv` (with `ajv-formats`).

### Common Envelope Structure
All events adhere to a standard envelope:
```json
{
  "event_id": "EVT-2026-0001",
  "event_type": "POLICY_BOUND",
  "tenant_id": "TENANT-TX-01",
  "timestamp": "2026-10-14T08:00:00.000Z",
  "idempotency_key": "IDEMP-POL-8821-BOUND",
  "version": 1,
  "payload": { ... }
}
```

---

## 2. Core Insurance Finance Event Types

The table below outlines the canonical insurance events supported by Veridex One:

| Event Type | Category | Description | Primary Financial Impact |
| :--- | :--- | :--- | :--- |
| `POLICY_BOUND` | Underwriting & Policy | Policy contract bound and written | Debits AR Premium, Credits Written Premium / UPR |
| `INVOICE_ISSUED` | Billing / AR | Installment invoice generated | Subledger aging / direct bill receivables |
| `PAYMENT_RECEIVED` | Treasury / Cash Ops | Cash collected from insured or broker | Debits Cash (Operating or Trust), Credits AR Premium / Unapplied Cash |
| `COMMISSION_ACCRUED` | Commissions | Producer commission earned/accrued | Debits Commission Expense, Credits Commission Payable |
| `DISBURSEMENT_INITIATED` | Cash Ops / Settlements | Carrier settlement or producer payout | Debits Payable / Trust Liability, Credits Operating / Trust Cash |
| `UPR_EARNED` | Finance Close | Monthly / Daily UPR earned premium recognition | Debits Unearned Premium Reserve (UPR), Credits Earned Premium |

---

## 3. Event Contract Schemas & Sample Payloads

### 3.1 `POLICY_BOUND`

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PolicyBoundEvent",
  "type": "object",
  "required": ["policy_id", "policy_number", "effective_date", "expiration_date", "written_premium", "currency", "line_of_business"],
  "properties": {
    "policy_id": { "type": "string" },
    "policy_number": { "type": "string" },
    "carrier_id": { "type": "string" },
    "broker_id": { "type": "string" },
    "insured_id": { "type": "string" },
    "effective_date": { "type": "string", "format": "date" },
    "expiration_date": { "type": "string", "format": "date" },
    "written_premium": { "type": "number", "minimum": 0 },
    "policy_fee": { "type": "number", "minimum": 0, "default": 0 },
    "tax_amount": { "type": "number", "minimum": 0, "default": 0 },
    "currency": { "type": "string", "minLength": 3, "maxLength": 3 },
    "line_of_business": { "type": "string" }
  },
  "additionalProperties": true
}
```

#### Sample Valid Payload
```json
{
  "policy_id": "pol-tx-8821",
  "policy_number": "POL-TX-8821",
  "carrier_id": "pty-carrier-travelers",
  "broker_id": "pty-broker-acme",
  "insured_id": "pty-insured-lone-star",
  "effective_date": "2026-07-01",
  "expiration_date": "2027-07-01",
  "written_premium": 37650.00,
  "policy_fee": 150.00,
  "tax_amount": 0.00,
  "currency": "USD",
  "line_of_business": "COMMERCIAL_AUTO"
}
```

---

### 3.2 `PAYMENT_RECEIVED`

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PaymentReceivedEvent",
  "type": "object",
  "required": ["payment_id", "received_date", "amount", "currency", "payment_method", "cash_account_type"],
  "properties": {
    "payment_id": { "type": "string" },
    "invoice_id": { "type": "string" },
    "payer_id": { "type": "string" },
    "received_date": { "type": "string", "format": "date" },
    "amount": { "type": "number", "exclusiveMinimum": 0 },
    "currency": { "type": "string", "minLength": 3, "maxLength": 3 },
    "payment_method": { "type": "string", "enum": ["CHECK", "ACH", "WIRE", "CREDIT_CARD"] },
    "cash_account_type": { "type": "string", "enum": ["OPERATING", "TRUST"] },
    "applied_amount": { "type": "number", "minimum": 0 },
    "unapplied_amount": { "type": "number", "minimum": 0 }
  },
  "additionalProperties": true
}
```

#### Sample Valid Payload
```json
{
  "payment_id": "PAY-2026-9011",
  "invoice_id": "INV-2026-001",
  "payer_id": "pty-insured-lone-star",
  "received_date": "2026-07-15",
  "amount": 9562.50,
  "currency": "USD",
  "payment_method": "ACH",
  "cash_account_type": "TRUST",
  "applied_amount": 9562.50,
  "unapplied_amount": 0.00
}
```

---

### 3.3 `COMMISSION_ACCRUED`

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CommissionAccruedEvent",
  "type": "object",
  "required": ["policy_id", "payee_id", "basis_amount", "commission_rate", "commission_amount", "currency"],
  "properties": {
    "policy_id": { "type": "string" },
    "payee_id": { "type": "string" },
    "agreement_id": { "type": "string" },
    "basis_amount": { "type": "number", "minimum": 0 },
    "commission_rate": { "type": "number", "minimum": 0, "maximum": 1 },
    "commission_amount": { "type": "number", "minimum": 0 },
    "currency": { "type": "string", "minLength": 3, "maxLength": 3 }
  },
  "additionalProperties": true
}
```

#### Sample Valid Payload
```json
{
  "policy_id": "pol-tx-8821",
  "payee_id": "pty-broker-acme",
  "agreement_id": "AGR-COMM-2026",
  "basis_amount": 37650.00,
  "commission_rate": 0.10,
  "commission_amount": 3765.00,
  "currency": "USD"
}
```

---

### 3.4 `UPR_EARNED`

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "UPREarnedEvent",
  "type": "object",
  "required": ["policy_id", "as_of_date", "period_id", "earned_amount", "currency"],
  "properties": {
    "policy_id": { "type": "string" },
    "as_of_date": { "type": "string", "format": "date" },
    "period_id": { "type": "string" },
    "earned_amount": { "type": "number", "exclusiveMinimum": 0 },
    "unearned_remaining": { "type": "number", "minimum": 0 },
    "currency": { "type": "string", "minLength": 3, "maxLength": 3 }
  },
  "additionalProperties": true
}
```

#### Sample Valid Payload
```json
{
  "policy_id": "pol-tx-8821",
  "as_of_date": "2026-07-31",
  "period_id": "PER-2026-07",
  "earned_amount": 3137.50,
  "unearned_remaining": 34512.50,
  "currency": "USD"
}
```

---

## 4. Contract Validation & Versioning Lifecycle

1. **Catalog Registration**: When creating or updating an `EventDefinition`, the JSON Schema is compiled by `ajv`. Malformed schemas are rejected at definition time.
2. **Schema Invariant Checking**: All payload keys referenced by `PostingRuleLine` formulas or condition filters must exist within the declared schema or additional properties policy.
3. **Draft-07 Validation**: During event simulation or ingestion, incoming payloads are validated against the active compiled schema for `event_type`. Schema validation failures yield a descriptive error with JSON Schema path violations:
   ```json
   {
     "success": false,
     "error": "Event payload schema validation failed",
     "details": [
       {
         "keyword": "required",
         "dataPath": "",
         "schemaPath": "#/required",
         "params": { "missingProperty": "written_premium" },
         "message": "should have required property 'written_premium'"
       }
     ]
   }
   ```
