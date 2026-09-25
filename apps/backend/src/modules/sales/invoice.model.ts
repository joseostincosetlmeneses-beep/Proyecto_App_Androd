import mongoose from 'mongoose';
const itemSchema=new mongoose.Schema({productId:String,sku:String,description:String,quantity:Number,unitPrice:Number,taxRate:Number},{_id:false});
const customerSchema=new mongoose.Schema({id:String,name:String,taxId:String},{_id:false});
const schema=new mongoose.Schema({tenantId:{type:String,required:true,index:true},number:{type:String,required:true},customer:{type:customerSchema,required:true},items:{type:[itemSchema],required:true},subtotal:{type:Number,required:true},impuestos:{type:Number,required:true},total:{type:Number,required:true},issuedAt:{type:Date,required:true}},{timestamps:true});
export const InvoiceModel=mongoose.model('Invoice',schema,'invoices');
