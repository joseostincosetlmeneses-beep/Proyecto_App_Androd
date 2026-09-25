import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
export const authMiddleware:RequestHandler=(req,res,next)=>{ const token=req.header('authorization')?.replace(/^Bearer\s+/i,''); if(!token){res.status(401).json({success:false,error:'Autenticacion requerida'});return;} try{ const payload=jwt.verify(token,env.JWT_SECRET) as {sub?:string;roles?:string[];tenantId?:string}; if(!payload.sub){res.status(401).json({success:false,error:'Token invalido'});return;} req.user={id:payload.sub,roles:payload.roles??[]}; if(payload.tenantId) req.tenantId=payload.tenantId; next(); }catch{res.status(401).json({success:false,error:'Token invalido'});} };
