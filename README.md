# NovaWallet

Wallet web progresiva (PWA) **multired y no custodial** desarrollada como demo académica. Permite crear o restaurar una wallet con una frase de recuperación BIP39, proteger esa frase en un vault cifrado local del navegador y operar con activos reales de **redes de prueba**: Solana Devnet, BNB Smart Chain Testnet y Bitcoin Testnet.

> [!WARNING]
> NovaWallet **no habilita mainnet**. Todos los activos están en redes de prueba o son tokens demo sin valor comercial. No uses una frase semilla que controle fondos reales.

---

## Tabla de contenido

1. [Funcionalidades](#funcionalidades)
2. [Stack tecnológico](#stack-tecnológico)
3. [Estructura del repositorio](#estructura-del-repositorio)
4. [Arquitectura](#arquitectura)
5. [Modelo de seguridad](#modelo-de-seguridad)
6. [Redes y activos soportados](#redes-y-activos-soportados)
7. [Flujo de envío y comisiones](#flujo-de-envío-y-comisiones)
8. [Modelo de datos en Firestore](#modelo-de-datos-en-firestore)
9. [Instalación y ejecución local](#instalación-y-ejecución-local)
10. [Variables de entorno](#variables-de-entorno)
11. [Scripts disponibles](#scripts-disponibles)
12. [Despliegue en Firebase](#despliegue-en-firebase)
13. [Tokens demo (SPL / BEP20)](#tokens-demo-spl--bep20)
14. [Solución de problemas](#solución-de-problemas)
15. [Limitaciones conocidas y roadmap](#limitaciones-conocidas-y-roadmap)
16. [Documentación adicional](#documentación-adicional)

---

## Funcionalidades

| Área | Qué hace |
| --- | --- |
| **Cuenta** | Inicio de sesión con Google mediante Firebase Authentication. Al primer acceso se crean los documentos `users/{uid}` y `settings/{uid}`. |
| **Crear wallet** | Genera localmente una frase BIP39 de 12 palabras, la muestra para respaldo y exige confirmar 3 palabras aleatorias antes de continuar. El flujo temporal expira a los 15 minutos. |
| **Restaurar wallet** | Valida la frase, previsualiza las direcciones derivadas y, si difieren de la wallet registrada, pide confirmación explícita antes de reemplazarla. |
| **Vault local** | Cifra la frase con una contraseña de wallet (PBKDF2 + AES-GCM) y la guarda en IndexedDB, separada por usuario. |
| **Dashboard** | Balances reales por red, valor estimado en USD de los activos nativos (CoinGecko, con caché de 10 min), distribución del portafolio y actividad reciente. |
| **Recibir** | Muestra la dirección pública y el QR de cada red. |
| **Enviar** | Valida la dirección y el saldo, estima comisiones reales, pide la contraseña de wallet, firma localmente y transmite a la red. |
| **Historial** | Combina los envíos hechos desde la app con la actividad entrante detectada on-chain, sin duplicados (`network + txHash + activo`). |
| **Configuración** | Estado de Firebase, RPCs y tokens demo; bloqueo de wallet, eliminación del vault local y cierre de sesión. |
| **PWA** | Instalable desde navegadores compatibles (`vite-plugin-pwa`, service worker con `autoUpdate`). |

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| UI | React 19, React Router 7 |
| Build | Vite 8 (Rolldown), `vite-plugin-pwa` |
| Autenticación y datos | Firebase Authentication (Google), Cloud Firestore, Firebase Hosting |
| Criptografía de wallet | `bip39`, `ed25519-hd-key`, Web Crypto API (PBKDF2, AES-GCM) |
| Solana | `@solana/web3.js`, `@solana/spl-token` |
| BNB Smart Chain (EVM) | `ethers` v6 |
| Bitcoin | `bitcoinjs-lib` (PSBT, P2WPKH), API de `mempool.space/testnet` |
| Precios | API pública de CoinGecko (solo para el valor estimado en el dashboard) |
| Calidad | ESLint 10 con `eslint-plugin-react-hooks` |

## Estructura del repositorio

El repositorio está organizado como monorepo. Hoy solo `apps/web` contiene código; las demás carpetas están reservadas para fases futuras.

```text
wallet-multired/
├── apps/
│   ├── web/                    # Aplicación PWA (único paquete activo)
│   │   ├── public/             # Manifest, íconos PWA
│   │   ├── scripts/            # Utilidades Node (crear token SPL demo)
│   │   ├── docs/               # Guías de seguridad y pruebas del frontend
│   │   └── src/
│   │       ├── components/     # Layout, dashboard, wallet, transacciones
│   │       ├── config/         # Activos, wallets administrativas, modelo económico, Solana
│   │       ├── constants/      # Redes, rutas, constantes del flujo de wallet
│   │       ├── lib/            # Inicialización de Firebase
│   │       ├── pages/          # Pantallas enrutadas
│   │       ├── services/
│   │       │   ├── blockchain/   # Solana, SPL, BNB, BEP20, Bitcoin, balances
│   │       │   ├── security/     # Mnemónica, derivación, vault cifrado, flujos de wallet
│   │       │   ├── transactions/ # Persistencia, comisiones, sincronización on-chain
│   │       │   ├── market/       # Precios USD
│   │       │   └── dashboard/    # Caché de balances
│   │       ├── utils/          # Validación de direcciones y mnemónicas
│   │       └── validators/     # Validación de formularios de wallet
│   ├── api/                    # Reservado (vacío)
│   └── mobile/                 # Reservado (vacío)
├── packages/                   # Reservado: blockchain, config, core, shared (vacíos)
├── docs/                       # Manual de usuario, arquitectura de seguridad, flujos, viabilidad económica
├── firebase.json               # Hosting + reglas e índices de Firestore
├── firestore.rules             # Reglas de seguridad de Firestore
└── firestore.indexes.json
```

## Arquitectura

```text
┌──────────────────────────── Navegador del usuario ────────────────────────────┐
│                                                                               │
│  React (pages/components)                                                     │
│        │                                                                      │
│        ├── services/security ── frase BIP39 ──► derivación de claves por red  │
│        │          │                                                           │
│        │          └── IndexedDB "novawallet-vault" (frase cifrada por uid)    │
│        │                                                                      │
│        ├── services/blockchain ── firma local ──► RPC / APIs de redes test    │
│        │                                          · Solana Devnet RPC         │
│        │                                          · BNB Testnet RPC (chain 97)│
│        │                                          · mempool.space/testnet     │
│        │                                                                      │
│        └── services/transactions ── metadatos públicos ──► Firestore          │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                    │                                   │
            Firebase Auth (Google)          Firestore (solo datos públicos)
```

- **No hay backend propio.** Toda la lógica corre en el navegador; Firebase solo autentica y guarda datos públicos.
- **La frase semilla nunca sale del dispositivo.** Las transacciones se firman en memoria y solo se transmite la transacción firmada.
- **Las rutas privadas** (`/dashboard`, `/wallet/*`) están protegidas por `ProtectedRoute`, que espera a que Firebase resuelva la sesión.

### Rutas principales

| Ruta | Pantalla |
| --- | --- |
| `/` | Splash / redirección |
| `/login`, `/register`, `/forgot-password` | Acceso (solo sin sesión) |
| `/dashboard` | Resumen de portafolio |
| `/wallet` | Mi wallet |
| `/wallet/create` → `/wallet/backup` → `/wallet/confirm` | Onboarding de creación |
| `/wallet/restore` | Restauración desde frase |
| `/wallet/send`, `/wallet/receive` | Enviar / Recibir |
| `/wallet/transactions` | Historial |
| `/wallet/settings` | Configuración |

## Modelo de seguridad

### Qué se guarda y dónde

| Dato | Dónde | Formato |
| --- | --- | --- |
| Frase semilla | IndexedDB local (`novawallet-vault`, registro por `uid`) | Cifrada con AES-GCM 256; clave PBKDF2-SHA256 de 250 000 iteraciones; sal (16 B) e IV (12 B) aleatorios |
| Contraseña de wallet | En ningún sitio | Solo se usa en memoria para derivar la clave |
| Claves privadas | En ningún sitio | Se derivan en memoria al firmar y se descartan |
| Frase durante el onboarding | Memoria (`Map` en JS), expira a los 15 min | Texto plano, nunca en `localStorage`/`sessionStorage` |
| Direcciones públicas | Firestore `users/{uid}/wallets/main` | Texto |
| Historial de movimientos | Firestore `users/{uid}/transactions` | Metadatos públicos (hash, montos, comisiones, estado) |
| Caché de balances y precios | `localStorage` | Datos públicos no sensibles |

### Garantías implementadas

- **Reglas de Firestore estrictas:** cada colección tiene lista blanca de campos y tipos, se rechaza cualquier campo sensible (`mnemonic`, `seed`, `privateKey`, `password`, etc.), solo el dueño (`request.auth.uid`) puede leer o escribir, y no se permite borrar documentos. En transacciones solo se pueden actualizar `status`, `confirmationStatus`, `explorerUrl` y `updatedAt`.
- **Vault separado por usuario:** cada cuenta tiene su propio registro en IndexedDB. Crear una wallet nunca sobrescribe silenciosamente un vault existente, y restaurar una frase distinta a la wallet registrada exige confirmación explícita.
- **Verificación de origen antes de firmar:** en todas las redes se comprueba que la dirección derivada del vault coincida con la dirección de origen registrada; si no coincide, el envío se aborta.
- **Aritmética entera:** montos y saldos se validan en unidades base (lamports, wei, satoshis, unidades de token) con `BigInt`.
- **Protección contra doble envío:** el botón de confirmar tiene un bloqueo síncrono, y si una transacción ya se transmitió pero su confirmación no llega a tiempo, se registra como `pending` con su hash y se cierra el resumen para evitar reenviarla (ver [Flujo de envío](#flujo-de-envío-y-comisiones)).
- **Limpieza de secretos:** la frase descifrada se borra de la variable local en el bloque `finally` del envío.

### Responsabilidad del usuario

- **Google no recupera la wallet.** Si se pierde la frase semilla, NovaWallet no puede restaurar los fondos.
- Si se olvida la contraseña de wallet, hay que restaurar con la frase semilla para crear un vault nuevo.
- El vault vive en el navegador: borrar los datos del sitio elimina el vault (la frase sigue siendo la copia de seguridad).

> **Compatibilidad:** las versiones anteriores guardaban el vault en un registro único `main`. Si un usuario no tiene vault propio, la app usa ese registro legado; la verificación de dirección impide firmar con la frase de otra cuenta. Al crear o restaurar, se genera el vault propio del usuario.

## Redes y activos soportados

| Red | Activo | Ruta de derivación | Dirección | Envío | Explorer |
| --- | --- | --- | --- | --- | --- |
| Solana Devnet | `SOL` | `m/44'/501'/0'/0'` | Base58 | Real | explorer.solana.com (`?cluster=devnet`) |
| Solana Devnet | `USDT-DEMO` (SPL) | misma que SOL | ATA del mint | Real, si `VITE_SOLANA_SPL_DEMO_MINT` está definido | explorer.solana.com |
| BNB Smart Chain Testnet (chainId 97) | `tBNB` | `m/44'/60'/0'/0/0` | `0x…` | Real, requiere `VITE_BNB_TESTNET_RPC_URL` | testnet.bscscan.com |
| BNB Smart Chain Testnet | `USDT-DEMO` (BEP20) | misma que tBNB | `0x…` | Real, si `VITE_BNB_BEP20_DEMO_CONTRACT` está definido | testnet.bscscan.com |
| Bitcoin Testnet | `BTC` | `m/84'/1'/0'/0/0` (Native SegWit) | `tb1…` | Real (UTXO + PSBT + broadcast) | mempool.space/testnet |

Las tres direcciones se derivan de la **misma frase semilla**. Los tokens demo que no están configurados no aparecen en Dashboard, Mi Wallet, Enviar ni Recibir; su estado técnico se ve en Configuración.

### Detalles por red

- **Solana:** balance y comisión por RPC (`getFeeForMessage`); la comisión NovaWallet se cobra on-chain como una segunda instrucción `SystemProgram.transfer` en la misma transacción. Los envíos SPL crean la cuenta asociada del destinatario si no existe (el alquiler lo paga el emisor).
- **BNB:** se valida que el RPC apunte a chainId 97 antes de cada operación; el gas se estima con `ethers` y se verifica el saldo antes de firmar.
- **Bitcoin:** selección de UTXOs de mayor a menor valor, fee rate `halfHourFee` de mempool.space (mínimo 1 sat/vB), salida de cambio si supera el umbral de dust (546 sats) y firma P2WPKH local. El txid se calcula localmente antes del broadcast.

## Flujo de envío y comisiones

1. El usuario elige red, activo, destino y monto.
2. La app valida el formato de la dirección según la red, consulta el saldo real y estima la comisión de red.
3. Se muestra un **resumen** con monto, comisión de red, comisión NovaWallet y débito total.
4. El usuario confirma con su **contraseña de wallet**: se descifra el vault, se deriva la clave de la red, se verifica la dirección de origen y se firma localmente.
5. La transacción firmada se transmite y se espera su confirmación:
   - **Confirmada:** se guarda en Firestore con `status: success` y el enlace al explorer.
   - **Rechazada por la red:** se muestra el error y no se registra nada.
   - **Transmitida pero sin confirmación a tiempo** (timeout o fallo del RPC después del broadcast): se registra con `status: pending` y `confirmationStatus: broadcast`, se muestra el hash con el enlace al explorer y se limpia el formulario para que el usuario **no la reenvíe**. La sincronización on-chain actualiza el estado cuando se confirma.
6. Si Firestore falla después de una transacción confirmada, la app avisa y muestra el hash igualmente.

### Comisión NovaWallet (1 %)

| Activo | Modo (`appFeeMode`) | Comportamiento |
| --- | --- | --- |
| SOL | `on-chain` | Se transfiere a `VITE_ADMIN_WALLET_SOLANA` en la misma transacción (redondeo hacia arriba en lamports) |
| tBNB, SPL demo, BEP20 demo | `documented` | Se calcula y registra, no se cobra on-chain |
| BTC | `pending` | Se calcula y registra, no se cobra on-chain |

El modelo económico está en [`docs/economic-feasibility.md`](docs/economic-feasibility.md) y la configuración en `apps/web/src/config/economic-model.js`.

## Modelo de datos en Firestore

```text
users/{uid}
  uid, name, email, createdAt, updatedAt

users/{uid}/wallets/main
  solanaAddress, bitcoinAddress, bnbAddress, createdAt, updatedAt, restoredAt?

users/{uid}/transactions/{id}
  network            solana | bitcoin | bnb
  assetType          native | token
  tokenStandard?     SPL | BEP20
  tokenSymbol?, tokenMint?, tokenAddress?
  direction          incoming | outgoing
  source             app-send | blockchain-sync
  fromAddress, toAddress
  amount, networkFee, appFee, appFeeRate, totalDebit, adminWallet
  status             simulated | success | confirmed | pending | failed
  mode               simulated | real-devnet | real-testnet
  txHash?, signature?, explorerUrl?, confirmationStatus?
  slot?, blockTime?, chainId?, gasUsed?, gasPrice?, feeRate?, appFeeMode?
  createdAt, updatedAt

settings/{uid}
  uid, theme, language, currency, createdAt, updatedAt
```

Las reglas completas están en [`firestore.rules`](firestore.rules).

## Instalación y ejecución local

### Requisitos

- Node.js 20.19+ o 22.12+ (requisito de Vite 8) y npm.
- Un proyecto de Firebase con **Authentication → Google** habilitado y **Cloud Firestore** creado.
- `localhost` debe estar en *Authentication → Settings → Authorized domains* (viene por defecto).
- Opcional: un RPC de BNB Smart Chain Testnet (p. ej. `https://data-seed-prebsc-1-s1.bnbchain.org:8545`).

### Pasos

```bash
cd apps/web
npm install
```

Crea el archivo de entorno local a partir de la plantilla (Windows: `copy`, macOS/Linux: `cp`):

```bash
cp .env.example .env.local
```

Completa las variables (ver la tabla siguiente) y arranca el servidor de desarrollo:

```bash
npm run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`). La generación de frases necesita Web Crypto, disponible en `localhost` y HTTPS.

### Obtener fondos de prueba

- **SOL Devnet:** faucet oficial de Solana (`faucet.solana.com`) o `solana airdrop`.
- **tBNB:** faucet de BNB Chain Testnet.
- **BTC Testnet:** cualquier faucet de Bitcoin Testnet que envíe a direcciones `tb1…`.

## Variables de entorno

Todas las variables `VITE_*` se incrustan en el bundle y **son públicas** en el navegador. No pongas secretos aquí.

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Sí | Configuración web de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Sí | |
| `VITE_FIREBASE_PROJECT_ID` | Sí | |
| `VITE_FIREBASE_STORAGE_BUCKET` | Sí | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sí | |
| `VITE_FIREBASE_APP_ID` | Sí | |
| `VITE_SOLANA_RPC_URL` | No | RPC de Solana Devnet. Por defecto `clusterApiUrl("devnet")` |
| `VITE_BNB_TESTNET_RPC_URL` | Para BNB | RPC de BNB Smart Chain Testnet (chainId 97). Sin él, BNB queda deshabilitado |
| `VITE_BSCSCAN_TESTNET_API_KEY` | No | Mejora la sincronización de tBNB entrante. Sin ella se escanean bloques recientes. Es visible en el cliente |
| `VITE_BITCOIN_TESTNET_API_URL` | No | API compatible con Esplora. Por defecto `https://mempool.space/testnet/api` |
| `VITE_SOLANA_SPL_DEMO_MINT` | No | Mint del token SPL demo. Si falta, el token se oculta |
| `VITE_SOLANA_SPL_DEMO_SYMBOL` / `_DECIMALS` | No | Por defecto `USDT-DEMO` / `6` |
| `VITE_BNB_BEP20_DEMO_CONTRACT` | No | Contrato del token BEP20 demo. Si falta, el token se oculta |
| `VITE_BNB_BEP20_DEMO_SYMBOL` / `_DECIMALS` | No | Por defecto `USDT-DEMO` / `18` |
| `VITE_ADMIN_WALLET_SOLANA` | Para enviar SOL | Dirección que recibe la comisión on-chain. Sin una dirección válida, los envíos de SOL fallan |
| `VITE_ADMIN_WALLET_BNB` | No | Dirección administrativa documental |
| `VITE_ADMIN_WALLET_BTC` | No | Dirección administrativa documental |

Los archivos `.env` y `.env.*` (salvo `.env.example`) están ignorados por git.

## Scripts disponibles

Desde `apps/web`:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `apps/web/dist` (incluye service worker) |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint sobre todo el proyecto |
| `node scripts/create-spl-demo-token.js <dirección> [monto]` | Crea un mint SPL demo en Devnet y acuña tokens a una dirección |

## Despliegue en Firebase

`firebase.json` despliega el hosting (`apps/web/dist` con rewrite SPA a `index.html`) y las **reglas e índices de Firestore**. El proyecto por defecto está en `.firebaserc`.

```bash
cd apps/web
npm run build
```

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Para publicar solo las reglas después de modificarlas:

```bash
firebase deploy --only firestore:rules
```

Después del primer despliegue, añade el dominio de hosting a *Authorized domains* en Firebase Authentication.

## Tokens demo (SPL / BEP20)

**SPL (Solana Devnet):**

1. Ejecuta `node scripts/create-spl-demo-token.js <tu-dirección-solana> 100` desde `apps/web`. El script crea un pagador temporal, le pide un airdrop, crea el mint y acuña tokens a tu dirección.
2. Copia el mint que imprime en `VITE_SOLANA_SPL_DEMO_MINT` y reinicia `npm run dev`.

**BEP20 (BNB Testnet):** despliega un contrato ERC-20 estándar en chainId 97 (por ejemplo con Remix) y define `VITE_BNB_BEP20_DEMO_CONTRACT`.

Guía detallada: [`apps/web/docs/token-deposit-testing.md`](apps/web/docs/token-deposit-testing.md).

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| "Tu navegador no permite generar frases semilla seguras" | La app se abrió por HTTP en una IP o dominio no seguro | Usa `localhost` o HTTPS |
| `auth/unauthorized-domain` al iniciar sesión | El dominio no está autorizado en Firebase | Añádelo en *Authentication → Settings* |
| "No existe vault local en este dispositivo" | Cambio de navegador o datos del sitio borrados | Restaura la wallet con la frase semilla |
| "El vault local no corresponde a la Wallet…" | El vault del navegador pertenece a otra frase | Restaura con la frase de la wallet registrada |
| "Configura VITE_BNB_TESTNET_RPC_URL…" | Falta el RPC de BNB | Define la variable y reinicia Vite |
| "El RPC configurado no apunta a … chainId 97" | RPC de otra red | Usa un RPC de BNB Smart Chain **Testnet** |
| Envío de SOL falla con wallet administrativa | `VITE_ADMIN_WALLET_SOLANA` vacía o inválida | Define una dirección Solana válida |
| "La transacción se transmitió … pero aún no está confirmada" | El RPC tardó o falló después del broadcast | **No reenvíes.** Revisa el enlace del explorer; el historial se actualizará al sincronizar |
| `permission-denied` en Firestore | Reglas no desplegadas o campo no permitido | `firebase deploy --only firestore:rules` |

## Limitaciones conocidas y roadmap

**Limitaciones actuales**

- Solo redes de prueba; mainnet no está habilitado.
- El valor en USD es estimado (CoinGecko) y solo para activos nativos; los activos testnet no tienen valor real.
- La comisión NovaWallet se cobra on-chain solo en SOL; en el resto es documental o pendiente.
- La sincronización de tBNB entrante sin API key de BscScan cubre solo bloques recientes.
- Depende de faucets, RPCs y APIs públicas (mempool.space, CoinGecko) que pueden limitar peticiones.
- La validación de direcciones Bitcoin en el formulario es de formato; el checksum se valida al construir la transacción.
- No hay tests automatizados ni CI todavía.

**Roadmap (no implementado)**

- Tests unitarios (Vitest) para conversiones de unidades, selección de UTXOs, comisiones y vault.
- Cabeceras de seguridad en hosting (CSP, `frame-ancestors`, `Referrer-Policy`).
- División de código por red para reducir el bundle inicial (~1,5 MB).
- WalletConnect, NFTs, swaps, staking, biometría y hardware wallets.
- Mainnet, con auditoría de seguridad previa.

## Documentación adicional

- [Manual de usuario](docs/user-manual.md)
- [Arquitectura de seguridad](docs/security-architecture.md)
- [Flujo de transacciones](docs/transaction-flow.md)
- [Viabilidad económica](docs/economic-feasibility.md)
- [Seguridad del frontend y manejo de la frase semilla](apps/web/docs/security.md)
- [Pruebas de depósitos de tokens demo](apps/web/docs/token-deposit-testing.md)
- [Checklist final](apps/web/docs/final-checklist.md)
