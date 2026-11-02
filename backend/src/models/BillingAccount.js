const mongoose = require('mongoose');

const BillingAccountSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    account_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    customer_name: {
      type: String,
      required: true,
      trim: true
    },
    customer_email: {
      type: String,
      trim: true,
      default: ''
    },
    billing_address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postal_code: { type: String, default: '' },
      country: { type: String, default: 'USA' }
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    current_balance: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    past_due_balance: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    unapplied_cash: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    default_billing_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingPlan',
      default: null
    },
    // ERD v4.6 Module 12: Direct Foreign Key to BillingPlan
    billing_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingPlan',
      default: null,
      index: true
    },
    // ERD v4.6: Reference to Counterparty Payer (Insured / Broker)
    payer_party_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null,
      index: true
    },
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null
    },
    bill_type: {
      type: String,
      enum: ['DIRECT_BILL', 'AGENCY_BILL'],
      default: 'DIRECT_BILL'
    },
    currency_code: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      maxlength: 3
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DELINQUENT', 'SUSPENDED', 'CLOSED'],
      default: 'ACTIVE',
      index: true
    },
    carrier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null
    },
    carrier_name: {
      type: String,
      default: null,
      trim: true
    },
    broker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      default: null
    },
    broker_name: {
      type: String,
      default: null,
      trim: true
    },
    dimensions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'billing_accounts'
  }
);

BillingAccountSchema.index({ tenant_id: 1, account_number: 1 }, { unique: true });

// Pre-save hook: Sync billing_plan_id <-> default_billing_plan_id and currency <-> currency_code
BillingAccountSchema.pre('save', function (next) {
  if (this.billing_plan_id && !this.default_billing_plan_id) {
    this.default_billing_plan_id = this.billing_plan_id;
  }
  if (this.default_billing_plan_id && !this.billing_plan_id) {
    this.billing_plan_id = this.default_billing_plan_id;
  }
  if (this.currency_code && !this.currency) {
    this.currency = this.currency_code;
  }
  if (this.currency && !this.currency_code) {
    this.currency_code = this.currency;
  }
  next();
});

BillingAccountSchema.virtual('billing_account_id').get(function () {
  return this._id;
});

BillingAccountSchema.set('toJSON', { virtuals: true });
BillingAccountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BillingAccount', BillingAccountSchema);

