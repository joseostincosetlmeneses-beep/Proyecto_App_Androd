import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDatabase():Promise<void>{ await mongoose.connect(env.MONGODB_URI,{serverSelectionTimeoutMS:10000, retryWrites:true}); }
export async function disconnectDatabase():Promise<void>{ await mongoose.disconnect(); }
