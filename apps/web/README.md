# NovaWallet Web

Frontend PWA de NovaWallet construido con React, Vite, Firebase y servicios de prueba multired.

## Alcance Actual

- Autenticacion visible con Google/Firebase.
- Creacion y restauracion de wallet con frase BIP39 local.
- Vault cifrado local en IndexedDB con PBKDF2 y AES-GCM.
- Envio con contrasena de wallet; la frase solo se descifra temporalmente en memoria.
- Firestore guarda solo direcciones publicas, metadata e historial publico.
- Solana Devnet: balance, recepcion, envio SOL real y token SPL Demo si hay mint configurado.
- BNB Smart Chain Testnet: balance, recepcion, envio tBNB real y token BEP20 Demo si hay contrato configurado.
- Bitcoin Testnet: direccion `tb1...`, recepcion, balance, historial y envio tecnico real con UTXO/PSBT.
- Dashboard con resumen multired, activos, actividad reciente y estados explicitos de configuracion.
- Historial con envios desde la app y sincronizacion de actividad recibida desde blockchain.

## Red De Prueba

NovaWallet no habilita mainnet. Los activos se encuentran en redes de prueba o son tokens demo, por lo que no tienen valor comercial real. No se muestra USD ni valor estimado en esta version.

## Variables Relevantes

- `VITE_SOLANA_RPC_URL`
- `VITE_BNB_TESTNET_RPC_URL`
- `VITE_BSCSCAN_TESTNET_API_KEY` opcional
- `VITE_BITCOIN_TESTNET_API_URL`
- `VITE_SOLANA_SPL_DEMO_MINT`
- `VITE_BNB_BEP20_DEMO_CONTRACT`
- `VITE_ADMIN_WALLET_SOLANA`
- `VITE_ADMIN_WALLET_BNB`
- `VITE_ADMIN_WALLET_BTC`

## Roadmap No Implementado

- Valor estimado en USD mediante API de precios, aclarando que testnet no tiene valor comercial real.
- Mainnet.
- WalletConnect.
- NFT.
- Swaps.
- Biometria.

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm run preview
```
