const mongoose = require('mongoose');

/**
 * Module 12: Premium Finance Agreement
 * Records commercial financing contract (e.g. First Insurance Funding, AFCO, Imperial PFS).
 * References billing_account and billing_account_policy (CHG 4.02: replaces policy_id & may stand alone)
 */
const PremiumFinanceAgreementSchema = new mongoose.Schema(
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
    billing_account_policy_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingAccountPolicy',
      default: null,
      index: true
    },
    finance_company_party_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null // Premium Finance Company counterparty
    },
    agreement_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    amount_financed: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    down_payment: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    interest_rate: {
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
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'TERMINATED', 'SETTLED'],
      default: 'ACTIVE'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'premium_finance_agreements'
  }
);

PremiumFinanceAgreementSchema.index({ tenant_id: 1, agreement_number: 1 }, { unique: true });

module.exports = mongoose.model('PremiumFinanceAgreement', PremiumFinanceAgreementSchema);
