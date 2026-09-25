import mongoose from 'mongoose';
const schema=new mongoose.Schema({tenantId:{type:String,required:true,index:true},userId:{type:String,required:true},action:{type:String,required:true},resource:{type:String,required:true},ip:String,timestamp:{type:Date,required:true},statusCode:Number,changes:mongoose.Schema.Types.Mixed},{versionKey:false});
export const AuditLogModel=mongoose.model('AuditLog',schema,'audit_logs');
