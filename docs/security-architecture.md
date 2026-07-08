# Arquitectura De Seguridad

## Objetivo

Separar autenticacion de cuenta, datos publicos y material sensible de wallet.

## Principios Aplicados

- `Firebase Auth` solo gestiona acceso a la cuenta del usuario.
- Google no recupera la wallet.
- La wallet se crea o restaura con frase semilla localmente en el navegador.
- La frase semilla no se guarda en Firebase.
- La frase semilla no se guarda en `localStorage`.
- La frase semilla no se guarda en `sessionStorage`.
- Las claves privadas y secret keys no se guardan en Firebase.
- Firestore solo guarda datos publicos y metadata.
- El vault local cifra la frase en IndexedDB usando PBKDF2 y AES-GCM.
- La contrasena de wallet no se persiste.
- Las firmas se realizan localmente en memoria tras desbloquear el vault.

## Datos Guardados

- `users/{uid}`: uid, nombre, correo y timestamps.
- `settings/{uid}`: idioma, tema, moneda y timestamps.
- `users/{uid}/wallets/main`: direcciones publicas Solana, Bitcoin Testnet y BNB.
- `users/{uid}/transactions/{id}`: historial publico de operaciones reales, demo o sincronizadas.
- IndexedDB local: vault cifrado, salt, iv, ciphertext y metadata criptografica.

## Datos Prohibidos En Firebase/Firestore

Firestore Rules bloquean campos como:

- `mnemonic`
- `seed`
- `seedPhrase`
- `privateKey`
- `privateKeys`
- `secretKey`
- `secretKeys`
- `encryptedSeed`
- `password`
- `authorizationMnemonic`
- `mnemonicSource`

## Recuperacion De Cuenta Vs Wallet

- Google/Firebase recupera acceso a la cuenta.
- La frase de recuperacion recupera la wallet.
- Si el usuario pierde sus 12 palabras, NovaWallet no puede restaurar la wallet.
- Si el usuario elimina el vault local, debe restaurar la wallet con su frase para volver a firmar en ese dispositivo.

## Flujo De Creacion

1. Usuario accede con Google.
2. La app genera frase BIP39 de 12 palabras localmente.
3. La frase se muestra para respaldo.
4. El usuario confirma palabras solicitadas.
5. El usuario crea contrasena de wallet.
6. La app crea vault cifrado local.
7. Se derivan direcciones publicas.
8. Firestore guarda solo direcciones publicas.

## Flujo De Restauracion

1. Usuario ingresa 12 palabras.
2. La app valida y previsualiza direcciones publicas.
3. El usuario crea contrasena de wallet.
4. La app crea vault cifrado local.
5. Firestore guarda solo direcciones publicas y metadata.

## Flujo De Firma

- El usuario ingresa su contrasena de wallet.
- La app desbloquea el vault local temporalmente en memoria.
- La app valida que la direccion derivada coincida con la direccion origen.
- La app firma localmente SOL, SPL Demo, tBNB, BEP20 Demo o BTC Testnet.
- La frase descifrada se limpia de referencias locales al finalizar el intento.

## Limitaciones Actuales

- No hay PIN dedicado.
- No hay biometria.
- No hay Secure Storage nativo.
- No hay WalletConnect, DApps ni NFT.
- El navegador y el dispositivo siguen siendo parte del modelo de confianza del usuario.
