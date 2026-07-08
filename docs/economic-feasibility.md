# Factibilidad Economica

## Resumen

NovaWallet es viable como prototipo academico porque funciona como PWA, usa Firebase para acceso y Firestore para datos publicos, y opera redes de prueba sin custodiar fondos reales de produccion.

## Modelo De Comision

- `networkFee`: costo propio de la blockchain.
- `appFee`: Comision NovaWallet del 1% sobre el monto.
- `adminWallet`: wallet administrativa asociada a la red cuando aplica.

## Estado Por Red

### Solana Devnet

- Envio real de SOL en Devnet.
- Fee de red real estimado por RPC.
- Comision NovaWallet cobrada on-chain como segunda instruccion para SOL nativo.
- SPL Demo disponible si hay mint configurado.
- En tokens SPL Demo, la comision NovaWallet queda documentada y no se cobra on-chain.

### BNB Smart Chain Testnet

- Envio real de tBNB implementado tecnicamente.
- Gas real estimado por RPC.
- Requiere `VITE_BNB_TESTNET_RPC_URL` y fondos tBNB de faucet.
- BEP20 Demo disponible si hay contrato configurado.
- Comision NovaWallet calculada y documentada, pero no cobrada on-chain.

### Bitcoin Testnet

- Direccion, recepcion, balance y envio tecnico real con UTXO/PSBT.
- Requiere UTXOs BTC Testnet y disponibilidad de mempool.space testnet o API compatible.
- No hay cobro on-chain de Comision NovaWallet en Bitcoin; queda pendiente/documental.

## Actividad E Historial

- El historial registra envios desde la app.
- La actividad entrante se sincroniza desde blockchain usando direcciones publicas.
- El sync depende de RPCs, APIs publicas e indexadores opcionales.
- BNB nativo entrante puede requerir BscScan API para historial mas amplio; sin API se usa busqueda limitada por bloques recientes.

## Valor En USD

- Valor estimado en USD no esta implementado aun.
- No se usan precios hardcodeados ni APIs de precios.
- Si se implementa a futuro, debe usar API de precios y aclarar que los activos testnet no tienen valor comercial real.

## Costos Operativos

- Hosting estatico/PWA: bajo.
- Firebase Auth/Firestore en demo: bajo.
- RPC Solana/BNB: depende del proveedor usado.
- Bitcoin Testnet por API publica: bajo, sujeto a disponibilidad del servicio.
- BscScan API: opcional para mejorar sincronizacion BNB.

## Limitaciones Economicas

- No hay mainnet habilitado.
- Los activos de testnet no tienen valor comercial real.
- La comision genera demostracion on-chain completa solo en SOL nativo.
- BNB, tokens y Bitcoin documentan o dejan pendiente la comision de plataforma.
- La demo depende de faucets y disponibilidad de servicios externos.
- WalletConnect, NFT, swaps, staking y biometria quedan como roadmap.

## Conclusion

El modelo economico esta demostrado de forma mas completa en Solana Devnet. BNB, tokens demo y Bitcoin Testnet amplian la sustentacion multired con limitaciones claras, sin asumir riesgos de produccion ni presentar valores comerciales falsos.
