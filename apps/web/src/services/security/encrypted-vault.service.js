import { normalizeMnemonicPhrase } from "./mnemonic.service";

const VAULT_DB_NAME = "novawallet-vault";
const VAULT_DB_VERSION = 1;
const VAULT_STORE_NAME = "vaults";
const VAULT_RECORD_ID = "main";
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

async function readVaultRecord() {
  const database = await openVaultDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VAULT_STORE_NAME, "readonly");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.get(VAULT_RECORD_ID);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error("vault-read-failed"));
    transaction.oncomplete = () => database.close();
  });
}

async function writeVaultRecord(record) {
  const database = await openVaultDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VAULT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.put({ id: VAULT_RECORD_ID, ...record });

    request.onerror = () => reject(new Error("vault-write-failed"));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(new Error("vault-write-failed"));
  });
}

async function deriveVaultKey(password, salt, iterations) {
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

export async function createEncryptedVault(mnemonic, password) {
  assertWebCryptoSupported();
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

  await writeVaultRecord(vault);
  return vault;
}

export async function unlockEncryptedVault(password) {
  assertWebCryptoSupported();
  const vault = await readVaultRecord();

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

export async function hasEncryptedVault() {
  return Boolean(await readVaultRecord());
}

export async function isVaultAvailable() {
  try {
    return await hasEncryptedVault();
  } catch {
    return false;
  }
}

export async function deleteEncryptedVault() {
  const database = await openVaultDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VAULT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.delete(VAULT_RECORD_ID);

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
