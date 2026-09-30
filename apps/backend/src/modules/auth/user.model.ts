import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  roles: { type: [String], default: ['admin'] },
  isActive: { type: Boolean, default: true },
  emailVerifiedAt: { type: Date, default: null },
  verificationTokenHash: { type: String, default: null, index: true, select: false },
  verificationExpiresAt: { type: Date, default: null, select: false },
  verificationSentAt: { type: Date, default: null, select: false }
}, { timestamps: true });

export const UserModel = mongoose.model('User', userSchema);

