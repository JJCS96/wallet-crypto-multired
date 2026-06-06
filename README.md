# Wallet Multired

Base inicial del proyecto para una wallet multired con soporte para:

- Web
- Android
- iOS

## Stack

- Web: Next.js + TypeScript
- Mobile: Expo React Native + TypeScript
- Backend: NestJS
- Auth y DB: Firebase Authentication + Firestore

## Fase actual

Primera fase: autenticación.

Incluye:
- Login
- Registro
- Recuperar contraseña
- Persistencia de sesión
- Logout
- Dashboard protegido

## Estructura

```text
wallet-multired/
  apps/
    web/
    mobile/
    api/
  packages/
    core/
    blockchain/
    shared/
    config/
  docs/
  .github/
Carpetas principales
- apps/web: aplicación web
- apps/mobile: aplicación móvil
- apps/api: backend
- packages/shared: tipos y validaciones compartidas
- docs: documentación del proyecto
Flujo de autenticación
1. La app abre
2. Se muestra Splash
3. Se revisa si hay sesión activa
4. Si hay sesión, entra al Dashboard
5. Si no hay sesión, va a Login
Seguridad
Nunca guardar en Firebase:
- Seed phrase
- Private keys
- Datos críticos sin cifrado
