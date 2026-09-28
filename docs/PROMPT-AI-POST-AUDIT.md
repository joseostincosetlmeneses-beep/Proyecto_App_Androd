# Prompt maestro para Antigravity / VS Code AI — continuación controlada

Actúa como Senior Software Engineer, QA y Security Reviewer sobre el ERP de este repositorio.

## Regla principal

No asumas que una funcionalidad existe porque una respuesta anterior de una IA diga que está terminada. Verifica el código, las rutas, los modelos, los contratos y las pruebas.

No avances a módulos nuevos hasta cerrar los hallazgos críticos y demostrarlo con typecheck y pruebas.

## Estado de referencia

La auditoría inicial ya fue aplicada en la rama `audit/fix-core-security-and-integrity`.

Cambios realizados:
- tenant del JWT como contexto autoritativo;
- rechazo de cambio de tenant mediante `x-tenant-id`;
- pruebas de aislamiento tenant;
- modelo `stock_balances`;
- actualización atómica de stock para salidas;
- validación de producto/tenant durante la venta;
- precio y descripción derivados del catálogo;
- número de factura único por tenant;
- documento de auditoría técnica.

## Fase obligatoria siguiente

1. Ejecuta `pnpm --filter @erp/contracts build`.
2. Ejecuta `pnpm --filter @erp/backend typecheck`.
3. Ejecuta `pnpm --filter @erp/backend test`.
4. Corrige cualquier fallo antes de modificar funcionalidad.
5. Implementa Auth real: Tenant, User, Register, Login, hash de contraseñas, expiración/validación JWT y RBAC. No guardes contraseñas en texto plano.
6. Implementa CRUD de Productos y Contactos, siempre con tenant obtenido del contexto autenticado.
7. Implementa entradas/ajustes de inventario que creen `stock_movements` y actualicen `stock_balances` en la misma transacción.
8. Añade pruebas de aislamiento tenant, rollback ACID, stock insuficiente, folio duplicado y cuadre contable.
9. Mejora `audit_logs` para registrar actor, acción, colección/recurso, documento, before, after, IP, timestamp y resultado cuando sea técnicamente posible.
10. Añade CI para contracts build, backend typecheck y tests.

## Restricciones

- No confiar en `tenantId` enviado por body.
- No confiar en precios/descripciones enviados por el cliente para operaciones financieras.
- No permitir stock negativo.
- No actualizar ni borrar movimientos históricos de inventario.
- No crear asientos contables descuadrados.
- Toda operación que modifique factura + inventario + contabilidad debe usar una misma sesión transaccional.
- No marcar una fase como completada sin evidencia de pruebas.
- No crear placeholders `TODO` en funcionalidad crítica.
- No hacer push directo a `main`; trabaja en una rama y genera un Pull Request con resumen y pruebas.

## Criterio de terminado

Una fase está terminada solo cuando:

- el código compila;
- los tests pasan;
- existe aislamiento por tenant verificable;
- las rutas reales están montadas;
- los contratos y modelos coinciden;
- la documentación describe el comportamiento real;
- no hay afirmaciones de "completo" sin evidencia.
