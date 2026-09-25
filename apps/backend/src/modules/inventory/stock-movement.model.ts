import mongoose from 'mongoose';
const schema=new mongoose.Schema({tenantId:{type:String,required:true,index:true},productId:{type:String,required:true},type:{type:String,enum:['ENTRADA','SALIDA','AJUSTE','TRANSFERENCIA'],required:true},quantity:{type:Number,required:true,min:0},referenceId:{type:String,required:true},occurredAt:{type:Date,required:true}},{versionKey:false});
export const StockMovementModel=mongoose.model('StockMovement',schema,'stock_movements');
