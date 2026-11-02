const mongoose = require('mongoose');

/**
 * Module 12: Billing Account Policy
 * Links a Billing Account to an Insured's Policy via BillingPolicySnapshot.
 * In v4.0 ERD (CHG 4.0), billing_policy_snapshot_id replaces direct policy_id.
 */
const BillingAccountPolicySchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    billing_account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingAccount',
      required: true,
      index: true
    },
    billing_policy_snapshot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingPolicySnapshot',
      default: null,
      index: true // CHG 4.0: Replaces policy_id to decouple billing from PAS
    },
    policy_id: {
      type: String,
      default: '',
      trim: true
    },
    policy_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    carrier_name: {
      type: String,
      default: ''
    },
    line_of_business: {
      type: String,
      default: 'COMMERCIAL_AUTO'
    },
    effective_from: {
      type: Date,
      default: function () {
        return this.effective_date || new Date();
      }
    },
    effective_to: {
      type: Date,
      default: function () {
        return this.expiration_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
    },
    effective_date: {
      type: Date,
      required: true
    },
    expiration_date: {
      type: Date,
      required: true
    },
    total_premium: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    total_fees: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    total_taxes: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    status: {
      type: String,
      enum: ['BOUND', 'ACTIVE', 'CANCELLED', 'EXPIRED'],
      default: 'BOUND'
    }
  },
  {
    timestamps: true,
    collection: 'billing_account_policies'
  }
);

BillingAccountPolicySchema.index({ tenant_id: 1, policy_number: 1 });
BillingAccountPolicySchema.index({ tenant_id: 1, billing_account_id: 1, billing_policy_snapshot_id: 1 });

module.exports = mongoose.model('BillingAccountPolicy', BillingAccountPolicySchema);
