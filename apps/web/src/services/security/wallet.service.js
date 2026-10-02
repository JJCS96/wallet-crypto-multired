/**
 * Archivo: wallet.service.js
 * Propósito: Controla el flujo local de creación, respaldo y confirmación de wallet.
 * Funcionalidades:
 * - Mantiene la frase semilla temporal en memoria durante el onboarding.
 * - Valida palabras de respaldo antes de crear direcciones.
 * - Cifra la frase en el vault local y guarda solo direcciones públicas en Firestore.
 */
import { WALLET_FLOW_STAGES, WALLET_FLOW_TTL_MS } from "../../constants/wallet";
import { buildSeedConfirmationErrors } from "../../validators/wallet.validators";
import { getUserWallet, saveUserWallet } from "../user-wallets.service";
import {
  clearPendingWalletFlow,
  getPendingWalletFlow,
  setPendingWalletFlow,
  updatePendingWalletFlow,
} from "./local-wallet-storage.service";
import {
  generateMnemonicPhrase,
  getMnemonicWords,
  pickConfirmationPositions,
} from "./mnemonic.service";
import { deriveWalletAddresses } from "./address-derivation.service";
import { createEncryptedVault } from "./encrypted-vault.service";

function isExpired(flow) {
  return Date.now() - flow.createdAt > WALLET_FLOW_TTL_MS;
}

function normalizeWalletFlow(flow) {
  if (!flow) {
    return null;
  }

  if (isExpired(flow)) {
    return null;
  }

  return flow;
}

export function startWalletCreation(uid) {
  // La frase queda asociada a un flujo temporal por usuario y expira por seguridad.
  const existingFlow = normalizeWalletFlow(getPendingWalletFlow(uid));

  if (existingFlow) {
    return existingFlow;
  }

  const mnemonic = generateMnemonicPhrase();
  const words = getMnemonicWords(mnemonic);
  const flow = {
    mnemonic,
    words,
    confirmationPositions: pickConfirmationPositions(words.length),
    stage: WALLET_FLOW_STAGES.seedVisible,
    createdAt: Date.now(),
  };

  setPendingWalletFlow(uid, flow);
  return flow;
}

export function getWalletCreationFlow(uid) {
  const flow = normalizeWalletFlow(getPendingWalletFlow(uid));

  if (!flow) {
    clearPendingWalletFlow(uid);
    return null;
  }

  return flow;
}

export function moveWalletFlowToBackup(uid) {
  return updatePendingWalletFlow(uid, (flow) => ({
    ...flow,
    stage: WALLET_FLOW_STAGES.backupReview,
  }));
}

export function discardWalletCreation(uid) {
  clearPendingWalletFlow(uid);
}

export function validateWalletBackupAnswers(uid, answersByPosition) {
  // Solo se comparan palabras en memoria; no se consulta ni persiste la frase semilla.
  const flow = getWalletCreationFlow(uid);

  if (!flow) {
    return {
      ok: false,
      formErrors: {},
      message: "La sesion de creacion expiro. Genera una nueva wallet para continuar.",
    };
  }

  const formErrors = buildSeedConfirmationErrors(
    flow.confirmationPositions,
    answersByPosition,
    flow.words,
  );

  if (Object.keys(formErrors).length > 0) {
    return {
      ok: false,
      formErrors,
      message: "Algunas palabras no coinciden. Revisa el respaldo antes de continuar.",
    };
  }

  return {
    ok: true,
    formErrors: {},
    message: "Respaldo confirmado.",
  };
}

export async function confirmWalletBackup(uid, walletPassword, { replaceExistingVault = false } = {}) {
  // El cierre del flujo cifra la frase localmente y guarda en Firestore únicamente direcciones públicas.
  const flow = getWalletCreationFlow(uid);

  if (!flow) {
    return {
      ok: false,
      formErrors: {},
      message: "La sesion de creacion expiro. Genera una nueva wallet para continuar.",
    };
  }

  // Crear una wallet nueva nunca reemplaza silenciosamente una ya registrada en la cuenta.
  const existingWallet = await getUserWallet(uid);

  if (existingWallet) {
    return {
      ok: false,
      formErrors: {},
      message: "Tu cuenta ya tiene una wallet registrada. Si quieres reemplazarla, usa Restaurar wallet con su frase semilla.",
    };
  }

  const derivedWallet = deriveWalletAddresses(flow.mnemonic);

  try {
    await createEncryptedVault(uid, flow.mnemonic, walletPassword, {
      replaceExisting: replaceExistingVault,
    });
  } catch (error) {
    if (error?.message === "vault-already-exists") {
      return {
        ok: false,
        formErrors: {},
        requiresVaultReplacement: true,
        message: "Ya existe un vault local para tu cuenta en este dispositivo.",
      };
    }

    throw error;
  }

  const savedWallet = await saveUserWallet(uid, derivedWallet);
  clearPendingWalletFlow(uid);

  return {
    ok: true,
    formErrors: {},
    message: "Wallet creada correctamente.",
    wallet: savedWallet,
    derivationMeta: derivedWallet.derivationMeta,
  };
}
