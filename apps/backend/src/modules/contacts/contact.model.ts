import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Cliente', 'Proveedor'], default: 'Cliente', required: true },
    taxId: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true }
  },
  { timestamps: true }
);

schema.index({ tenantId: 1, name: 1 });
schema.index({ tenantId: 1, email: 1 }, { sparse: true });

export const ContactModel = mongoose.model('Contact', schema, 'contacts');
