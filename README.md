# Orbit ERP

ERP multiplataforma con una API Express y MongoDB Atlas, contratos Zod compartidos y una aplicacion Expo para Android y web.

## Requisitos

- Node.js 20 o superior (recomendado: Node.js 22 LTS).
- pnpm 9.15.0 mediante Corepack.
- Una cadena de conexion de MongoDB Atlas.
- Para probar en Android: Expo Go desde Google Play y el celular en la misma red Wi-Fi que la computadora.

## Preparacion local

```bash
corepack enable
pnpm install
```

1. Copia `apps/backend/.env.example` a `apps/backend/.env` y completa `MONGODB_URI` y un `JWT_SECRET` de al menos 32 caracteres.
2. Copia `apps/web-mobile/.env.example` a `apps/web-mobile/.env`.
3. En `EXPO_PUBLIC_API_URL`, usa la IP local de la computadora cuando abras la aplicacion desde un celular. `localhost` en el telefono apunta al propio telefono.

## Ejecutar la API

```bash
pnpm --filter @erp/contracts build
pnpm --filter @erp/backend dev
```

La API escucha en `0.0.0.0:3000`. Expone `GET /health` y rutas bajo `/api`. Las rutas protegidas requieren `Authorization: Bearer <jwt>` y `x-tenant-id`.

## Probar en un Android fisico con Expo Go

1. Instala **Expo Go** desde Google Play.
2. Inicia la API como se indica arriba.
3. En otra terminal ejecuta:

```bash
pnpm --filter @erp/web-mobile start
```

4. Escanea el codigo QR con Expo Go.
5. Si Windows solicita acceso al firewall, permite Node.js en redes privadas.

Si el celular no puede alcanzar la computadora, confirma que ambos estan en la misma Wi-Fi, que `EXPO_PUBLIC_API_URL` usa la IP LAN correcta y que el puerto 3000 esta permitido en la red privada. Para abrir solamente la interfaz, la aplicacion incluye datos demostrativos y muestra el estado de la API en el perfil.

## Generar un APK instalable

```bash
cd apps/web-mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

El perfil `preview` genera un APK para pruebas internas. Android puede pedir permiso para instalar aplicaciones desde el navegador. El perfil `production` genera el artefacto para Google Play:

```bash
npx eas-cli@latest build -p android --profile production
```

Para produccion, configura `EXPO_PUBLIC_API_URL` con una URL HTTPS publica de la API. No incrustes `MONGODB_URI` ni `JWT_SECRET` en la aplicacion movil: solo pertenecen al servidor.

## Verificacion

```bash
pnpm --filter @erp/backend test
pnpm --filter @erp/backend typecheck
pnpm --filter @erp/web-mobile typecheck
pnpm --filter @erp/web-mobile build
```

## Estado funcional

La interfaz responsive incluye tablero, ventas, inventario, contactos y perfil. Actualmente usa datos demostrativos para esas vistas y comprueba en vivo la disponibilidad de la API. La persistencia completa de los formularios requerira conectar cada flujo visual con sus endpoints de autenticacion, catalogos, contactos e inventario.
