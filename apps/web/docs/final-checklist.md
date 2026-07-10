# Checklist final de NovaWallet

Usa esta lista para preparar capturas de la sustentación y validar el flujo principal del MVP académico multired.

## Capturas recomendadas

- Login: mostrar acceso con Google sin exponer tokens del navegador.
- Crear wallet: mostrar el inicio del flujo, no la frase semilla completa.
- Confirmar seed phrase: capturar solo el estado de confirmación, evitando palabras sensibles visibles.
- Restaurar wallet: mostrar el formulario vacío o con datos ficticios.
- Dashboard: mostrar balance, distribución, activos y actividad reciente.
- Mi Wallet: mostrar activos disponibles y direcciones abreviadas.
- Recibir sin QR: mostrar red seleccionada, dirección pública, botón copiar y advertencia.
- Enviar SOL: mostrar red, activo, destino, monto y resumen antes de confirmar.
- Enviar BTC Testnet: mostrar el flujo de envío real en testnet y enlace al explorer.
- Historial multired: mostrar movimientos sincronizados de Solana, BNB y Bitcoin Testnet.
- Configuración: mostrar cuenta, seguridad, redes, preferencias y detalles técnicos colapsados.
- Seguridad: mostrar avisos de frase semilla, vault local y Firestore solo con datos públicos.
- Logout: mostrar cierre de sesión desde sidebar o Configuración.

## Datos que no deben aparecer

- Frase semilla completa.
- Private keys.
- Tokens de acceso.
- `accessToken`.
- `refreshToken`.
- UID completo.
- Correos completos si no son necesarios para la explicación.
- Direcciones completas si no son necesarias.

## Formato seguro para capturas

- Solana: `C3ZD...adT1`
- BTC: `tb1q...abcd`
- BNB: `0xcC26...3a5`

## Validaciones de cierre

- La pantalla Recibir mantiene el QR oculto temporalmente.
- La pantalla Enviar no conserva errores antiguos después de una transacción exitosa.
- El balance se refresca después de enviar.
- Historial conserva los detalles de envíos hechos desde la app y complementa confirmaciones on-chain.
- Firestore acepta estados reales: `confirmed`, `pending` y `failed`.
- BNB muestra un mensaje claro si no hay tBNB para gas.
- Configuración no muestra detalles técnicos de entrada; quedan en el bloque colapsable.
- No se muestran ni se guardan seed phrase ni claves privadas en Firebase.
