# ERP Universal

Monorepo pnpm/Turborepo para API Express, contratos Zod compartidos y cliente React Native/Web.

## Desarrollo

1. Copia `apps/backend/.env.example` a `apps/backend/.env` y configura MongoDB Atlas y `JWT_SECRET`.
2. Ejecuta `pnpm install`.
3. Ejecuta `pnpm dev`.

La API expone `GET /health` y `POST /api/sales/invoices`. Las rutas protegidas requieren `Authorization: Bearer <jwt>` y `x-tenant-id`.

## Verificacion

- `pnpm --filter @erp/backend test`
- `pnpm --filter @erp/backend typecheck`
- `pnpm --filter @erp/web-mobile typecheck`
