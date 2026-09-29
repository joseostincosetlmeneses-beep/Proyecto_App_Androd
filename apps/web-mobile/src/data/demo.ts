export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

export const metrics = [
  { label: 'Ventas del día', value: '$48,290', delta: '+12.4%', tone: 'info' as StatusTone, icon: '↗' },
  { label: 'Facturas pendientes', value: '18', delta: '4 vencen hoy', tone: 'warning' as StatusTone, icon: '▤' },
  { label: 'Stock saludable', value: '97%', delta: '1,284 productos', tone: 'success' as StatusTone, icon: '◫' },
  { label: 'Alertas críticas', value: '3', delta: 'Requieren atención', tone: 'danger' as StatusTone, icon: '!' }
];

export const activityBars = [34, 52, 41, 67, 48, 76, 62, 88, 56, 71, 91, 79];

export const recentActivity = [
  { title: 'Factura F-2026-0842', detail: 'Distribuidora Nova · $8,450', status: 'Pagada', tone: 'success' as StatusTone, time: 'Hace 8 min' },
  { title: 'Stock bajo: Monitor 24”', detail: 'SKU MON-024 · 4 unidades', status: 'Atención', tone: 'warning' as StatusTone, time: 'Hace 21 min' },
  { title: 'Movimiento de entrada', detail: 'Bodega principal · +120 unidades', status: 'Completado', tone: 'success' as StatusTone, time: 'Hace 34 min' },
  { title: 'Factura F-2026-0839', detail: 'Grupo Central · $12,900', status: 'Pendiente', tone: 'info' as StatusTone, time: 'Hace 1 h' }
];

export const inventory = [
  { id: '1', name: 'Laptop Pro 14', sku: 'LAP-P14', stock: 28, price: '$24,990', status: 'Disponible', tone: 'success' as StatusTone },
  { id: '2', name: 'Monitor 24” IPS', sku: 'MON-024', stock: 4, price: '$4,890', status: 'Bajo stock', tone: 'warning' as StatusTone },
  { id: '3', name: 'Teclado inalámbrico', sku: 'TEC-WL2', stock: 86, price: '$1,290', status: 'Disponible', tone: 'success' as StatusTone },
  { id: '4', name: 'Dock USB-C', sku: 'DOC-USC', stock: 0, price: '$2,150', status: 'Agotado', tone: 'danger' as StatusTone },
  { id: '5', name: 'Mouse ergonómico', sku: 'MOU-ERG', stock: 13, price: '$980', status: 'Disponible', tone: 'success' as StatusTone }
];

export const invoices = [
  { number: 'F-2026-0842', customer: 'Distribuidora Nova', amount: '$8,450', date: '29 Sep', status: 'Pagada', tone: 'success' as StatusTone },
  { number: 'F-2026-0841', customer: 'Comercial Delta', amount: '$5,280', date: '29 Sep', status: 'Pendiente', tone: 'warning' as StatusTone },
  { number: 'F-2026-0840', customer: 'Tecnología Norte', amount: '$21,800', date: '28 Sep', status: 'Pagada', tone: 'success' as StatusTone },
  { number: 'F-2026-0839', customer: 'Grupo Central', amount: '$12,900', date: '28 Sep', status: 'Pendiente', tone: 'info' as StatusTone },
  { number: 'F-2026-0838', customer: 'Servicios Luna', amount: '$3,420', date: '27 Sep', status: 'Cancelada', tone: 'danger' as StatusTone }
];

export const contacts = [
  { initials: 'DN', name: 'Distribuidora Nova', type: 'Cliente', detail: 'ventas@nova.mx', activity: '$84,500 este mes' },
  { initials: 'GC', name: 'Grupo Central', type: 'Cliente', detail: 'compras@central.mx', activity: '$62,300 este mes' },
  { initials: 'TN', name: 'Tecnología Norte', type: 'Proveedor', detail: 'pedidos@tecnorte.mx', activity: '12 órdenes activas' },
  { initials: 'SL', name: 'Servicios Luna', type: 'Cliente', detail: 'admin@luna.mx', activity: '$18,900 este mes' }
];

