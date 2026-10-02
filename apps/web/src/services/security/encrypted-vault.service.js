/**
 * Archivo: encrypted-vault.service.js
 * Propósito: Administra el vault cifrado local donde se guarda la frase semilla.
 * Funcionalidades:
 * - Usa IndexedDB como almacenamiento local.
 * - Deriva una clave con PBKDF2 y cifra con AES-GCM.
 * - Nunca guarda la contraseña ni mantiene una sesión global con la frase descifrada.
 */
import { normalizeMnemonicPhrase } from "./mnemonic.service";

const VAULT_DB_NAME = "novawallet-vault";
const VAULT_DB_VERSION = 1;
const VAULT_STORE_NAME = "vaults";
// Registro único usado por versiones anteriores, cuando el vault no estaba separado por usuario.
const LEGACY_VAULT_RECORD_ID = "main";
const VAULT_VERSION = 1;
const VAULT_ITERATIONS = 250000;

function assertIndexedDbSupported() {
  if (!globalThis.indexedDB) {
    throw new Error("vault-storage-unavailable");
  }
}

function assertWebCryptoSupported() {
  if (!globalThis.crypto?.subtle || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new Error("vault-crypto-unavailable");
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa(binary);
}

function base64ToBytes(base64Value) {
  const binary = globalThis.atob(base64Value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function openVaultDb() {
  assertIndexedDbSupported();

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(VAULT_DB_NAME, VAULT_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(VAULT_STORE_NAME)) {
        database.createObjectStore(VAULT_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("vault-storage-unavailable"));
  });
}

function assertVaultOwner(uid) {
  if (!uid || typeof uid !== "string") {
    throw new Error("vault-owner-required");
  }
}

async function readVaultRecordById(recordId) {
  const database = await openVaultDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VAULT_STORE_NAME, "readonly");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.get(recordId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error("vault-read-failed"));
    transaction.oncomplete = () => database.close();
  });
}

/**
 * Devuelve el vault del usuario. Si aún no tiene uno propio, usa el registro legado "main"
 * para no bloquear wallets creadas antes de separar el vault por uid; la firma igualmente
 * verifica que la dirección derivada coincida con la wallet de origen.
 */
async function readVaultRecord(uid) {
  assertVaultOwner(uid);
  const ownRecord = await readVaultRecordById(uid);

  if (ownRecord) {
    return ownRecord;
  }

  return readVaultRecordById(LEGACY_VAULT_RECORD_ID);
}

async function writeVaultRecord(uid, record) {
  assertVaultOwner(uid);
  const database = await openVaultDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VAULT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.put({ ...record, id: uid, ownerUid: uid });

    request.onerror = () => reject(new Error("vault-write-failed"));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(new Error("vault-write-failed"));
  });
}

async function deriveVaultKey(password, salt, iterations) {
  // La clave se deriva en el navegador y no se almacena; se recrea solo al desbloquear.
  assertWebCryptoSupported();
  const encoder = new TextEncoder();
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
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

/**
 * Cifra la frase normalizada con sal e IV únicos y la guarda en el registro del usuario.
 * Si el usuario ya tiene un vault propio, exige replaceExisting para no destruir una frase
 * cifrada sin confirmación explícita.
 */
export async function createEncryptedVault(uid, mnemonic, password, { replaceExisting = false } = {}) {
  assertWebCryptoSupported();
  assertVaultOwner(uid);

  if (!replaceExisting && await hasOwnEncryptedVault(uid)) {
    throw new Error("vault-already-exists");
  }

  const normalizedMnemonic = normalizeMnemonicPhrase(mnemonic);
  const encoder = new TextEncoder();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(password, salt, VAULT_ITERATIONS);
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoder.encode(normalizedMnemonic),
  );
  const now = new Date().toISOString();
  const vault = {
    version: VAULT_VERSION,
    kdf: "PBKDF2",
    cipher: "AES-GCM",
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    iterations: VAULT_ITERATIONS,
    createdAt: now,
    updatedAt: now,
  };

  await writeVaultRecord(uid, vault);
  return vault;
}

export async function unlockEncryptedVault(uid, password) {
  // Devuelve la frase descifrada solo al llamador que necesita firmar o restaurar.
  assertWebCryptoSupported();
  const vault = await readVaultRecord(uid);

  if (!vault) {
    throw new Error("vault-not-found");
  }

  try {
    const decoder = new TextDecoder();
    const salt = base64ToBytes(vault.salt);
    const iv = base64ToBytes(vault.iv);
    const ciphertext = base64ToBytes(vault.ciphertext);
    const key = await deriveVaultKey(password, salt, vault.iterations || VAULT_ITERATIONS);
    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      ciphertext,
    );

    return normalizeMnemonicPhrase(decoder.decode(decryptedBuffer));
  } catch {
    throw new Error("vault-unlock-failed");
  }
}

export async function hasEncryptedVault(uid) {
  return Boolean(await readVaultRecord(uid));
}

/**
 * Indica si el usuario tiene un vault propio (sin contar el registro legado compartido).
 */
export async function hasOwnEncryptedVault(uid) {
  assertVaultOwner(uid);
  return Boolean(await readVaultRecordById(uid));
}

export async function isVaultAvailable(uid) {
  try {
    return await hasEncryptedVault(uid);
  } catch {
    return false;
  }
}

export async function deleteEncryptedVault(uid) {
  // Elimina el vault que el usuario está usando: el propio o, si no existe, el registro legado.
  const vault = await readVaultRecord(uid);

  if (!vault) {
    return;
  }

  const database = await openVaultDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VAULT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.delete(vault.id);

    request.onerror = () => reject(new Error("vault-delete-failed"));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(new Error("vault-delete-failed"));
  });
}

export function clearVaultSession() {
  // The vault never keeps a global decrypted mnemonic session.
}
