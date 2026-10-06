import mongoose from 'mongoose';
const schema=new mongoose.Schema({tenantId:{type:String,required:true,index:true},sku:{type:String,required:true},barcode:{type:String,required:true},name:{type:String,required:true},imageUrl:{type:String,trim:true},hasImage:{type:Boolean,default:false},imageData:{type:String,select:false},imageMime:{type:String,select:false},costo:{type:Number,required:true,min:0},precio:{type:Number,required:true,min:0},stockMinimo:{type:Number,required:true,min:0}},{timestamps:true});
schema.index({tenantId:1,sku:1},{unique:true});
export const ProductModel=mongoose.model('Product',schema,'products');
