/**
 * Archivo: address-validation.js
 * Propósito: Valida direcciones públicas antes de recibir o enviar activos.
 * Funcionalidades:
 * - Diferencia Bitcoin Testnet de mainnet.
 * - Valida formato básico de Solana y BNB.
 * - Evita preparar transacciones para redes equivocadas.
 */
export function isValidSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
}

export function isValidBitcoinTestnetAddress(address) {
  return /^tb1[a-z0-9]{11,71}$/.test(address.trim());
}

export function isBitcoinMainnetAddress(address) {
  return /^bc1[a-z0-9]{11,71}$/.test(address.trim());
}

export function isValidBitcoinAddress(address) {
  return isValidBitcoinTestnetAddress(address);
}

export function isValidBnbAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function isValidAddressForNetwork(networkId, address) {
  // La validación se hace por red para reducir riesgo de enviar fondos a una dirección incompatible.
  const normalizedAddress = address.trim();

  if (!normalizedAddress) {
    return false;
  }

  if (networkId === "solana") {
    return isValidSolanaAddress(normalizedAddress);
  }

  if (networkId === "bitcoin") {
    return isValidBitcoinAddress(normalizedAddress);
  }

  if (networkId === "bnb") {
    return isValidBnbAddress(normalizedAddress);
  }

  return false;
}
