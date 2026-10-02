/**
 * Archivo: wallet-recovery.service.js
 * Propósito: Previsualiza y confirma restauración de wallet desde una frase BIP39 del usuario.
 * Funcionalidades:
 * - Valida la frase antes de derivar direcciones.
 * - Cifra la frase restaurada en el vault local.
 * - Guarda en Firestore solo direcciones públicas y metadatos de restauración.
 */
import { deriveWalletAddresses } from "./address-derivation.service";
import { normalizeMnemonicPhrase } from "./mnemonic.service";
import { getUserWallet, saveUserWallet } from "../user-wallets.service";
import { getMnemonicValidationResult } from "../../utils/mnemonic-validation";
import { createEncryptedVault, hasOwnEncryptedVault } from "./encrypted-vault.service";

export function previewWalletRecovery(mnemonic) {
  // La previsualización permite confirmar direcciones sin escribir aún en Firestore.
  const validation = getMnemonicValidationResult(mnemonic);

  if (!validation.isValid) {
    return {
      ok: false,
      message: validation.message,
      wallet: null,
    };
  }

  const normalizedMnemonic = normalizeMnemonicPhrase(mnemonic);
  const derivedWallet = deriveWalletAddresses(normalizedMnemonic);

  return {
    ok: true,
    message: "",
    wallet: derivedWallet,
  };
}

function isSameWallet(currentWallet, derivedWallet) {
  return Boolean(currentWallet)
    && currentWallet.solanaAddress === derivedWallet.solanaAddress
    && currentWallet.bitcoinAddress === derivedWallet.bitcoinAddress
    && currentWallet.bnbAddress === derivedWallet.bnbAddress;
}

export async function confirmWalletRecovery(uid, mnemonic, walletPassword, { confirmReplacement = false } = {}) {
  // Al confirmar, la frase se cifra localmente y no se envía como dato sensible a la nube.
  const preview = previewWalletRecovery(mnemonic);

  if (!preview.ok) {
    return preview;
  }

  // Restaurar la misma wallet solo renueva el vault; una frase distinta reemplazaría la wallet
  // registrada y el vault local, así que exige confirmación explícita.
  const [currentWallet, hasOwnVault] = await Promise.all([
    getUserWallet(uid),
    hasOwnEncryptedVault(uid),
  ]);
  const sameWallet = isSameWallet(currentWallet, preview.wallet);
  const replacesDifferentWallet = Boolean(currentWallet) && !sameWallet;
  const replacesUnknownVault = hasOwnVault && !sameWallet;

  if (!confirmReplacement && (replacesDifferentWallet || replacesUnknownVault)) {
    return {
      ok: false,
      requiresReplacementConfirmation: true,
      message: replacesDifferentWallet
        ? "Esta frase genera direcciones distintas a la wallet registrada en tu cuenta. Si continúas, la wallet actual y su vault local serán reemplazados."
        : "Ya existe un vault local para tu cuenta en este dispositivo. Si continúas, será reemplazado por el de esta frase.",
      wallet: preview.wallet,
    };
  }

  await createEncryptedVault(uid, mnemonic, walletPassword, { replaceExisting: true });
  const savedWallet = await saveUserWallet(uid, preview.wallet, {
    markAsRestored: true,
  });

  return {
    ok: true,
    message: "Wallet restaurada correctamente.",
    wallet: savedWallet,
  };
}
