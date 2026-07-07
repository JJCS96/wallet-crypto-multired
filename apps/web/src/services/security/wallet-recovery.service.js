import { deriveWalletAddresses } from "./address-derivation.service";
import { normalizeMnemonicPhrase } from "./mnemonic.service";
import { saveUserWallet } from "../user-wallets.service";
import { getMnemonicValidationResult } from "../../utils/mnemonic-validation";
import { createEncryptedVault } from "./encrypted-vault.service";

export function previewWalletRecovery(mnemonic) {
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

export async function confirmWalletRecovery(uid, mnemonic, walletPassword) {
  const preview = previewWalletRecovery(mnemonic);

  if (!preview.ok) {
    return preview;
  }

  await createEncryptedVault(mnemonic, walletPassword);
  const savedWallet = await saveUserWallet(uid, preview.wallet, {
    markAsRestored: true,
  });

  return {
    ok: true,
    message: "Wallet restaurada correctamente.",
    wallet: savedWallet,
  };
}
