import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const TenantModel = mongoose.model('Tenant', tenantSchema);

