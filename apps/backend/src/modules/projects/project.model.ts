import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  client: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['planned', 'active', 'completed', 'paused'], default: 'planned' },
  budget: { type: Number, default: 0, min: 0 },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  dueAt: { type: Date, default: null }
}, { timestamps: true });

export const ProjectModel = mongoose.model('Project', schema);
