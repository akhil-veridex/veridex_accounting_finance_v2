const mongoose = require('mongoose');

/**
 * Module 35: External System
 * Connectors and registry for upstream Policy Administration Systems (PAS), Rating, Claims, CRM
 */
const ExternalSystemSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    system_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    system_name: {
      type: String,
      required: true,
      trim: true
    },
    system_type: {
      type: String,
      enum: ['pas', 'billing', 'claims', 'gl', 'rater', 'crm', 'ams'],
      required: true,
      default: 'pas'
    },
    vendor: {
      type: String,
      default: 'VERIDEX'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'integration_external_systems'
  }
);

ExternalSystemSchema.index({ tenant_id: 1, system_code: 1 }, { unique: true });

module.exports = mongoose.model('ExternalSystem', ExternalSystemSchema);
