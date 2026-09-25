import axios from 'axios';
export const apiClient=axios.create({baseURL:process.env.EXPO_PUBLIC_API_URL??'http://localhost:3000/api'});
apiClient.interceptors.request.use(config=>{const tenantId=localStorage.getItem('tenantId'); const token=localStorage.getItem('token'); if(tenantId)config.headers['x-tenant-id']=tenantId; if(token)config.headers.Authorization=`Bearer ${token}`; return config;});
