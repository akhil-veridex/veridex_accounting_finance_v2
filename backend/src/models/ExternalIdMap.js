const mongoose = require('mongoose');

/**
 * Module 35: External ID Map
 * Maintains cross-system identifier resolution between Veridex Finance and external systems
 */
const ExternalIdMapSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    entity_type: {
      type: String,
      enum: ['POLICY', 'TRANSACTION', 'CLAIM', 'PARTY', 'ACCOUNT'],
      required: true,
      uppercase: true
    },
    entity_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    external_id: {
      type: String,
      required: true,
      trim: true
    },
    external_version: {
      type: String,
      default: '1.0'
    },
    last_synced_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'integration_external_id_maps'
  }
);

ExternalIdMapSchema.index({ tenant_id: 1, external_system_id: 1, entity_type: 1, external_id: 1 }, { unique: true });

module.exports = mongoose.model('ExternalIdMap', ExternalIdMapSchema);
