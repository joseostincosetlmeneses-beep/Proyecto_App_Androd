import type { User } from '@erp/contracts';
declare global { namespace Express { interface Request { tenantId?:string; tenantContext?:{tenantId:string}; user?:Pick<User,'id'|'roles'>; } } }
export {};
