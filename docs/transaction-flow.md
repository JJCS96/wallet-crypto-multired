# Flujo De Transacciones

## Estado Actual

NovaWallet maneja transacciones reales en redes de prueba para Solana, BNB Smart Chain y Bitcoin Testnet. Tambien soporta tokens demo SPL/BEP20 cuando sus variables de entorno estan configuradas.

## Solana Devnet

1. Usuario selecciona Solana Devnet y activo `SOL`.
2. Ingresa direccion destino y monto.
3. La app valida direccion, monto y wallet administrativa.
4. La app estima fee real por RPC.
5. La app calcula Comision NovaWallet del 1% en lamports.
6. El usuario autoriza con contrasena de wallet.
7. La app desbloquea el vault en memoria y reconstruye el keypair.
8. Se firma localmente una transaccion con transferencia al destinatario y comision on-chain a wallet administrativa.
9. Se envia a Solana Devnet.
10. Se obtiene `signature`, explorer, slot y confirmacion.
11. Se guarda historial publico con `mode: real-devnet` y `appFeeMode: on-chain`.

## SPL Demo

1. Requiere `VITE_SOLANA_SPL_DEMO_MINT` configurado.
2. La app consulta balance del token asociado a la direccion Solana.
3. El envio usa ATA, fee real de Solana y firma local.
4. La Comision NovaWallet queda documentada, no cobrada on-chain para tokens.

## BNB Smart Chain Testnet

1. Usuario selecciona BNB Smart Chain Testnet y activo `tBNB`.
2. Ingresa direccion destino y monto.
3. La app valida direccion, monto y balance.
4. La app estima gas real con `ethers` y RPC configurado.
5. El usuario autoriza con contrasena de wallet.
6. La app desbloquea el vault en memoria y reconstruye la wallet BNB.
7. Se firma y envia una transaccion real de tBNB.
8. Se obtiene `txHash`, gas usado, gas price y explorer BscScan Testnet.
9. Se guarda historial publico con `mode: real-testnet`.
10. La Comision NovaWallet queda documentada con `appFeeMode: documented`, no cobrada on-chain.

## BEP20 Demo

1. Requiere `VITE_BNB_BEP20_DEMO_CONTRACT` configurado.
2. La app valida contrato, balance token y tBNB para gas.
3. El envio usa `transfer` del contrato BEP20 y firma local.
4. La Comision NovaWallet queda documentada, no cobrada on-chain para tokens.

## Bitcoin Testnet

1. Usuario obtiene direccion `tb1...` derivada desde su frase semilla.
2. La app permite recibir BTC Testnet y consultar balance por mempool.space testnet.
3. La app calcula UTXOs, fee rate, cambio y PSBT para envio.
4. El usuario autoriza con contrasena de wallet.
5. La app desbloquea el vault en memoria y firma localmente.
6. La app transmite la transaccion a Bitcoin Testnet.
7. La Comision NovaWallet queda pendiente/documental y no se cobra on-chain.

## Gestion Visual De Activos

- El dashboard muestra resumen multired y cinco activos: SOL, SPL Demo, tBNB, BEP20 Demo y BTC Testnet.
- Los tokens demo no configurados se muestran como estado neutral `No configurado`.
- La interfaz no muestra mainnet, Ethereum, precios USD ni totales simulados como informacion real.
- Todos los activos estan en redes de prueba o son tokens demo sin valor comercial real.

## Historial Y Actividad

- Los envios desde NovaWallet se guardan en Firestore como datos publicos.
- La app sincroniza actividad recibida desde blockchain usando direcciones publicas.
- Solana: firmas recientes por direccion.
- SPL Demo: actividad por ATA si hay mint configurado.
- BNB: BscScan opcional o busqueda limitada por bloques recientes.
- BEP20 Demo: eventos `Transfer` si hay contrato configurado.
- Bitcoin: transacciones recientes de direccion `tb1` por mempool.space testnet.
- El sync evita duplicados por `network + txHash + asset/token`.

## Datos Guardados En Firestore

- Red.
- Direccion origen.
- Direccion destino.
- Direccion del movimiento (`incoming` o `outgoing`).
- Fuente (`app-send` o `blockchain-sync`).
- Monto.
- Fee de red.
- Comision NovaWallet.
- Wallet administrativa cuando aplica.
- Estado.
- Modo (`real-devnet`, `real-testnet` o `simulated`).
- Explorer/hash cuando la red entrega uno real.

Nunca se guarda frase semilla, mnemonic, contrasena ni claves privadas.
