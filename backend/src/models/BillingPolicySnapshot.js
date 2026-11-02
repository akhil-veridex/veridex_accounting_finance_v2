const mongoose = require('mongoose');

/**
 * Module 35 / Module 12: Billing Policy Snapshot
 * Implements decoupled standalone operation: stores immutable snapshot of policy data
 * consumed from Veridex PAS or external policy admin systems (Guidewire, Applied Epic, etc.)
 * Referenced by billing_account_policy (CHG 4.0: replaces direct policy_id)
 */
const BillingPolicySnapshotSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    external_system_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalSystem',
      default: null // null when origin is internal Veridex PAS
    },
    source_entity_id: {
      type: String,
      trim: true,
      default: '' // Upstream PAS Policy ID or version reference
    },
    source_version: {
      type: String,
      trim: true,
      default: 'v1.0'
    },
    source_event_position: {
      type: Number,
      default: 1 // Sequence / watermark of source event
    },
    source_updated_at: {
      type: Date,
      default: Date.now
    },
    policy_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    payer_party_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null,
      index: true
    },
    insured_party_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null
    },
    carrier_party_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null
    },
    effective_date: {
      type: Date,
      required: true
    },
    expiration_date: {
      type: Date,
      required: true
    },
    currency_code: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
      maxlength: 3
    },
    status: {
      type: String,
      enum: ['BOUND', 'ACTIVE', 'CANCELLED', 'EXPIRED'],
      default: 'BOUND'
    },
    total_premium: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    total_fees: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    total_taxes: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    line_of_business: {
      type: String,
      default: 'COMMERCIAL_AUTO'
    },
    snapshot_json: {
      type: mongoose.Schema.Types.Mixed,
      default: {} // Complete immutable payload of coverages, limits, deductibles, vehicles
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'billing_policy_snapshots'
  }
);

BillingPolicySnapshotSchema.index({ tenant_id: 1, policy_number: 1, source_version: 1 }, { unique: true });

BillingPolicySnapshotSchema.virtual('billing_policy_snapshot_id').get(function() {
  return `BPS-${this._id.toString().slice(-8).toUpperCase()}`;
});

BillingPolicySnapshotSchema.set('toJSON', { virtuals: true });
BillingPolicySnapshotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BillingPolicySnapshot', BillingPolicySnapshotSchema);

