import mongoose from 'mongoose';
export async function withTransaction<T>(operation:(session:mongoose.ClientSession)=>Promise<T>):Promise<T>{ const session=await mongoose.startSession(); try{ let result!:T; await session.withTransaction(async()=>{ result=await operation(session); }); return result; }catch(error){ if(session.inTransaction()) await session.abortTransaction(); throw error; }finally{ await session.endSession(); } }
export const runInTransaction=withTransaction;
