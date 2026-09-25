import mongoose from 'mongoose';
const lineSchema=new mongoose.Schema({accountId:{type:String,required:true},debit:{type:Number,required:true,min:0},credit:{type:Number,required:true,min:0}},{_id:false});
const schema=new mongoose.Schema({tenantId:{type:String,required:true,index:true},fecha:{type:Date,required:true},glosa:{type:String,required:true},lines:{type:[lineSchema],required:true}},{timestamps:true});
export const JournalEntryModel=mongoose.model('JournalEntry',schema,'journal_entries');
