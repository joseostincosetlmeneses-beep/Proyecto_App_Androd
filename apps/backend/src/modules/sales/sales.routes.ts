import { Router } from 'express';
import { createInvoice } from './sales.service.js';
import { AppError } from '../../core/errors/app-error.js';
const router:ReturnType<typeof Router>=Router();
router.post('/invoices',async(req,res,next)=>{try{if(!req.tenantId)throw new AppError(400,'Tenant requerido'); const invoice=await createInvoice({...req.body,tenantId:req.tenantId}); res.status(201).json({success:true,data:invoice});}catch(error){next(error);}});
export default router;
