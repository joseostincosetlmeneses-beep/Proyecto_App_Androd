import { useEffect,useState } from 'react';
export function useTenant(){const [tenantId,setTenantId]=useState(()=>localStorage.getItem('tenantId')??''); useEffect(()=>{if(tenantId)localStorage.setItem('tenantId',tenantId);},[tenantId]); return {tenantId,setTenantId};}
