/**
 * Archivo: encryption.service.js
 * Propósito: Utilidades genéricas de cifrado AES-GCM con clave derivada por PBKDF2.
 * Funcionalidades:
 * - Convierte datos binarios a Base64 para persistencia.
 * - Cifra y descifra texto usando una contraseña del usuario.
 * - No registra ni imprime valores sensibles.
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function base64ToUint8Array(base64Value) {
  const binary = window.atob(base64Value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export async function createEncryptionKeyFromPassphrase(passphrase, salt) {
  // PBKDF2 endurece la contraseña antes de usarla como clave AES-GCM.
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptTextValue(value, passphrase) {
  // Cada cifrado usa sal e IV nuevos para evitar reutilización criptográfica.
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await createEncryptionKeyFromPassphrase(passphrase, salt);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoder.encode(value),
  );

  return {
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    cipherText: arrayBufferToBase64(cipherBuffer),
  };
}

export async function decryptTextValue(payload, passphrase) {
  const decoder = new TextDecoder();
  const iv = base64ToUint8Array(payload.iv);
  const salt = base64ToUint8Array(payload.salt);
  const cipherText = base64ToUint8Array(payload.cipherText);
  const key = await createEncryptionKeyFromPassphrase(passphrase, salt);
  const plainBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    cipherText,
  );

  return decoder.decode(plainBuffer);
}
