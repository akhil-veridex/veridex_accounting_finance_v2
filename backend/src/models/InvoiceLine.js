const mongoose = require('mongoose');

/**
 * Module 12: Invoice Line
 * Individual charge line on an invoice.
 * In v4.0 ERD (CHG 4.0), points to installment_id and billing_transaction_snapshot_id
 * to trace each line back to the underwriting transaction snapshot.
 */
const InvoiceLineSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true
    },
    installment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstallmentSchedule',
      default: null,
      index: true // NEW in v4.0 ERD
    },
    billing_transaction_snapshot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingTransactionSnapshot',
      default: null,
      index: true // CHG 4.0: replaces policy_transaction_id
    },
    line_number: {
      type: Number,
      required: true
    },
    line_type: {
      type: String,
      enum: ['PREMIUM', 'FEE', 'TAX', 'COMMISSION_NET', 'SURPLUS_TAX', 'ADJUSTMENT', 'SURCHARGE'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    tax_amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    currency_code: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
      maxlength: 3
    },
    ledger_account_code: {
      type: String,
      required: true // e.g. 2200 for UPR/Premium, 4100 for Policy Fee, 1100 for AR
    }
  },
  {
    timestamps: true,
    collection: 'invoice_lines'
  }
);

InvoiceLineSchema.index({ tenant_id: 1, invoice_id: 1, line_number: 1 }, { unique: true });

module.exports = mongoose.model('InvoiceLine', InvoiceLineSchema);
