# Seguridad de NovaWallet

NovaWallet separa la cuenta de acceso de la wallet criptografica. Firebase Auth
identifica al usuario, pero no custodia la frase semilla ni claves privadas.

## Datos sensibles

NovaWallet no guarda en Firebase, Firestore, `localStorage` ni `sessionStorage`:

- Frase semilla o seed phrase.
- Claves privadas.
- `secretKey`.
- Password del vault.
- Wallet descifrada.

Firestore guarda unicamente datos publicos y operativos:

- UID, nombre, correo y preferencias basicas.
- Direcciones publicas de Solana, BNB y Bitcoin Testnet.
- Historial de transacciones con hashes, redes, montos y estados publicos.

## Vault local cifrado

La frase semilla se protege en un vault local cifrado dentro de IndexedDB.

El vault usa:

- PBKDF2 con SHA-256 para derivar una llave desde la contrasena local.
- AES-GCM 256 para cifrar la frase semilla.
- Salt aleatorio.
- IV aleatorio.

El registro persistido contiene solo:

- `ciphertext`
- `iv`
- `salt`
- `iterations`
- metadata tecnica del esquema de cifrado

El texto plano solo existe temporalmente en memoria mientras se crea, restaura o
firma una transaccion. Al cerrar sesion se limpian flujos temporales en memoria.

## Creacion de wallet

Durante la creacion:

1. La frase BIP39 se genera localmente con Web Crypto.
2. La frase se muestra solo en los pasos de respaldo.
3. El flujo pendiente vive en memoria y expira.
4. Si la pagina se recarga, el flujo se pierde y debe iniciarse de nuevo.
5. Al confirmar el respaldo, se crea el vault cifrado local.
6. Firestore recibe solo las direcciones publicas derivadas.

La frase semilla no se muestra desde Dashboard, Mi Wallet, Configuracion ni
otras pantallas internas.

## Restauracion de wallet

Durante la restauracion:

1. El usuario ingresa la frase semilla manualmente.
2. La frase se valida localmente.
3. Se derivan las mismas direcciones publicas para Solana, BNB y Bitcoin.
4. El usuario crea una contrasena local del vault.
5. La frase se cifra en IndexedDB.
6. Firestore se actualiza solo con direcciones publicas.

Si la frase esta incompleta, tiene un numero invalido de palabras o no pasa la
validacion BIP39, la interfaz muestra un mensaje amigable.

## Firma de transacciones

Para enviar fondos, NovaWallet desbloquea el vault con la contrasena local,
deriva la llave necesaria en memoria, verifica que corresponda a la direccion de
origen y firma la transaccion localmente.

La frase descifrada no se guarda como sesion global persistente.

## Logout y bloqueo

Al cerrar sesion:

- Se limpian flujos pendientes de creacion de wallet.
- Se limpia cualquier estado sensible temporal del vault.
- Se cierra la sesion de Firebase.
- Se redirige a Login reemplazando la ruta actual.

El vault cifrado local no se elimina automaticamente. Puede eliminarse desde
Configuracion si el usuario quiere retirar el vault de ese dispositivo.

## Redes y tokens

NovaWallet trabaja solo en redes de prueba:

- Solana Devnet.
- BNB Smart Chain Testnet.
- Bitcoin Testnet.

No se usa mainnet ni USDT real. USDT-DEMO SPL y USDT-DEMO BEP20 son ejemplos
academicos configurables. Si no hay mint SPL o contrato BEP20 configurado, esos
tokens no aparecen como activos disponibles en Dashboard, Mi Wallet, Enviar ni
Recibir. El estado tecnico se revisa en Configuracion.

