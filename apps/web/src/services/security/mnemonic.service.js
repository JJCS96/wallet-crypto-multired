import bip39 from "bip39";
import { WALLET_CONFIRMATION_WORDS_COUNT } from "../../constants/wallet";
import { normalizeMnemonicValue } from "../../validators/wallet.validators";

const WEB_CRYPTO_ERROR_MESSAGE =
  "Tu navegador o entorno actual no permite generar frases semilla seguras. Abre la aplicación en localhost, HTTPS o un navegador compatible.";

export function isWebCryptoSupported() {
  return Boolean(globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function");
}

export function generateMnemonicPhrase() {
  if (!isWebCryptoSupported()) {
    throw new Error(WEB_CRYPTO_ERROR_MESSAGE);
  }

  return bip39.generateMnemonic(128);
}

export function validateMnemonicPhrase(mnemonic) {
  return bip39.validateMnemonic(normalizeMnemonicValue(mnemonic));
}

export function normalizeMnemonicPhrase(mnemonic) {
  return normalizeMnemonicValue(mnemonic);
}

export function getMnemonicWords(mnemonic) {
  return normalizeMnemonicPhrase(mnemonic).split(" ").filter(Boolean);
}

export function getMnemonicWordCount(mnemonic) {
  return getMnemonicWords(mnemonic).length;
}

function getSecureRandomIndex(maxExclusive) {
  if (!isWebCryptoSupported()) {
    throw new Error(WEB_CRYPTO_ERROR_MESSAGE);
  }

  const randomValues = new Uint32Array(1);
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % maxExclusive);

  do {
    globalThis.crypto.getRandomValues(randomValues);
  } while (randomValues[0] >= limit);

  return randomValues[0] % maxExclusive;
}

export function pickConfirmationPositions(wordCount, count = WALLET_CONFIRMATION_WORDS_COUNT) {
  const positions = new Set();

  while (positions.size < count) {
    positions.add(getSecureRandomIndex(wordCount));
  }

  return Array.from(positions).sort((left, right) => left - right);
}

export { WEB_CRYPTO_ERROR_MESSAGE };
