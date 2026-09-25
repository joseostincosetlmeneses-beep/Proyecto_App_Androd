import mongoose from 'mongoose';
const schema=new mongoose.Schema({tenantId:{type:String,required:true,index:true},name:{type:String,required:true},taxId:String,email:String,phone:String},{timestamps:true});
export const ContactModel=mongoose.model('Contact',schema,'contacts');
