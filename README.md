# NovaWallet

Wallet web progresiva multired para demo academica. NovaWallet permite crear o restaurar una wallet con frase de recuperacion, guardar solo datos publicos en Firestore, proteger la frase en un vault local cifrado y operar redes de prueba con activos nativos y tokens demo.

## Estado Real Actual

- Frontend: `React + Vite`.
- PWA: `vite-plugin-pwa`, manifest e instalacion desde navegador compatible.
- Auth: `Firebase Authentication` con Google como acceso visible.
- Base de datos: `Firestore` para datos publicos.
- Wallet: frase BIP39 de 12 palabras generada o restaurada localmente.
- Vault local: IndexedDB + PBKDF2 + AES-GCM para cifrar la frase en este dispositivo.
- Redes: `Solana Devnet`, `BNB Smart Chain Testnet` y `Bitcoin Testnet`.
- Activos: `SOL`, `SPL Demo`, `tBNB`, `BEP20 Demo` y `BTC Testnet`.
- Actividad: historial publico de envios desde la app y sync de movimientos recibidos desde blockchain.

## Autenticacion

- Google Auth protege el acceso a la cuenta Firebase.
- Google no recupera la wallet.
- Si el usuario pierde la frase de recuperacion, NovaWallet no puede restaurar sus direcciones.
- En el primer acceso se crean documentos publicos `users/{uid}` y `settings/{uid}`.

## Wallet Y Seguridad

- La frase de recuperacion se genera localmente en el navegador.
- La frase se muestra en 12 cards numeradas durante la creacion.
- La restauracion usa 12 inputs separados.
- Al crear o restaurar, el usuario define una contrasena de wallet.
- La contrasena desbloquea un vault cifrado local en IndexedDB.
- Los envios se autorizan con contrasena; la frase se descifra solo temporalmente en memoria para firmar.
- No se guarda seed, mnemonic, privateKey, secretKey ni password en Firebase.
- No se guarda seed en `localStorage` ni `sessionStorage`.
- Firestore solo guarda direcciones publicas, metadata e historial publico.

Ruta principal de wallet:

- `users/{uid}/wallets/main`

Campos publicos:

- `solanaAddress`
- `bitcoinAddress`
- `bnbAddress`
- `createdAt`
- `updatedAt`
- `restoredAt` cuando aplica

## Gestion Visual De Activos

- El dashboard comunica NovaWallet como wallet multired de redes de prueba.
- Activos visibles: `SOL`, `SPL Demo`, `tBNB`, `BEP20 Demo` y `BTC Testnet`.
- Los balances se consultan con las integraciones disponibles para cada red.
- Los tokens demo se muestran aunque falte configuracion, como `No configurado`.
- No se muestran precios USD ni valor comercial real.
- Todos los activos operan en redes de prueba o como tokens demo.

## Estado Por Red

### Solana Devnet

- Direccion publica derivada desde la frase semilla.
- Balance real por RPC.
- Envio real de SOL en Devnet.
- Envio SPL Demo si `VITE_SOLANA_SPL_DEMO_MINT` esta configurado.
- Firma local en memoria tras desbloquear el vault.
- Comision NovaWallet del 1% on-chain para SOL nativo.
- Comision NovaWallet documental para SPL Demo.
- Explorer de Solana.

### BNB Smart Chain Testnet

- Direccion publica derivada desde la frase semilla.
- Balance real si `VITE_BNB_TESTNET_RPC_URL` esta configurado.
- Envio real de tBNB con `ethers`.
- Envio BEP20 Demo si `VITE_BNB_BEP20_DEMO_CONTRACT` esta configurado.
- Gas real estimado por RPC.
- Explorer BscScan Testnet.
- Comision NovaWallet calculada/documentada, no cobrada on-chain.
- Sync entrante tBNB mejora si `VITE_BSCSCAN_TESTNET_API_KEY` esta configurado; sin indexador usa busqueda limitada por bloques recientes.

### Bitcoin Testnet

- Direccion Native SegWit Testnet `tb1...` derivada localmente.
- Path: `m/84'/1'/0'/0/0`.
- Recepcion con direccion publica y QR.
- Balance y actividad por API publica `mempool.space/testnet` si responde.
- Envio tecnico real con UTXO, PSBT, fee rate, change output, firma local y broadcast.
- Comision NovaWallet pendiente/documental, no cobrada on-chain.

## Actividad E Historial

- Los envios hechos desde NovaWallet se guardan en Firestore como datos publicos.
- La app sincroniza actividad recibida desde blockchain usando direcciones publicas.
- El sync evita duplicados por `network + txHash + asset/token`.
- Si una API falla, la pantalla no debe quedar negra.
- Los limites de sync son conservadores para demo y dependen de RPC/API disponibles.

## Variables De Entorno

Ver `apps/web/.env.example`:

- `VITE_FIREBASE_*`
- `VITE_SOLANA_RPC_URL`
- `VITE_BNB_TESTNET_RPC_URL`
- `VITE_BSCSCAN_TESTNET_API_KEY` opcional
- `VITE_BITCOIN_TESTNET_API_URL`
- `VITE_SOLANA_SPL_DEMO_MINT`
- `VITE_BNB_BEP20_DEMO_CONTRACT`
- `VITE_ADMIN_WALLET_SOLANA`
- `VITE_ADMIN_WALLET_BTC`
- `VITE_ADMIN_WALLET_BNB`

## Limitaciones Declaradas

- No hay mainnet habilitado.
- No hay valor estimado USD implementado todavia.
- No se usan precios hardcodeados ni servicios de precios.
- Los activos testnet no tienen valor comercial real.
- La comision NovaWallet en tokens, BNB y Bitcoin es documental o pendiente segun red.
- El sync tBNB entrante puede requerir indexador/API para historial amplio.
- La demo depende de faucets, RPCs y APIs publicas.
- No hay WalletConnect, NFT, swaps, staking, biometria ni hardware wallets.

## Comandos

```bash
cd apps/web
npm run lint
npm run build
```
