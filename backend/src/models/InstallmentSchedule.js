const mongoose = require('mongoose');

/**
 * Module 12: Installment Schedule
 * Represents payment installments spread over time.
 * In v4.0 ERD (CHG 4.0), billing_transaction_snapshot_id replaces direct policy_transaction_id.
 */
const InstallmentScheduleSchema = new mongoose.Schema(
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
    billing_transaction_snapshot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingTransactionSnapshot',
      default: null,
      index: true // CHG 4.0: replaces policy_transaction_id
    },
    billing_policy_snapshot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingPolicySnapshot',
      default: null,
      index: true
    },
    policy_id: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    policy_number: {
      type: String,
      required: true,
      trim: true
    },
    installment_number: {
      type: Number,
      required: true
    },
    installment_no: {
      type: Number,
      default: function () {
        return this.installment_number;
      }
    },
    due_date: {
      type: Date,
      required: true
    },
    premium_amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    fee_amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    tax_amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    total_amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: function () {
        return this.total_amount;
      }
    },
    paid_amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00')
    },
    balance_amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'BILLED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'installment_schedules'
  }
);

InstallmentScheduleSchema.index({ tenant_id: 1, policy_number: 1, installment_number: 1 });
InstallmentScheduleSchema.index({ tenant_id: 1, billing_account_id: 1, installment_number: 1 });

module.exports = mongoose.model('InstallmentSchedule', InstallmentScheduleSchema);
