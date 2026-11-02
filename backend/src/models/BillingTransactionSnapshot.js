const mongoose = require('mongoose');

/**
 * Module 35 / Module 12: Billing Transaction Snapshot
 * Implements policy transaction snapshot: records each underwriting change
 * (New Business, Endorsement, Renewal, Cancellation, Audit).
 * Referenced by installment_schedule and invoice_line (CHG 4.0: replaces policy_transaction_id)
 */
const BillingTransactionSnapshotSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    billing_policy_snapshot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingPolicySnapshot',
      required: true,
      index: true
    },
    source_entity_id: {
      type: String,
      trim: true,
      default: '' // Upstream PAS Policy Transaction ID (e.g. PTX-NB-001)
    },
    source_event_position: {
      type: Number,
      default: 1
    },
    transaction_type: {
      type: String,
      enum: ['NEW_BUSINESS', 'ENDORSEMENT', 'RENEWAL', 'CANCELLATION', 'REINSTATEMENT', 'AUDIT'],
      required: true,
      default: 'NEW_BUSINESS'
    },
    effective_date: {
      type: Date,
      required: true
    },
    premium_change: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    charges: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00') // Policy fee, stamping fee, inspection fee
    },
    taxes: {
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
    snapshot_json: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'billing_transaction_snapshots'
  }
);

BillingTransactionSnapshotSchema.index({ tenant_id: 1, billing_policy_snapshot_id: 1, source_entity_id: 1 });

BillingTransactionSnapshotSchema.virtual('billing_transaction_snapshot_id').get(function() {
  return `BTS-${this._id.toString().slice(-8).toUpperCase()}`;
});

BillingTransactionSnapshotSchema.set('toJSON', { virtuals: true });
BillingTransactionSnapshotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BillingTransactionSnapshot', BillingTransactionSnapshotSchema);

