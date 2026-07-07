import { WALLET_FLOW_STAGES, WALLET_FLOW_TTL_MS } from "../../constants/wallet";
import { buildSeedConfirmationErrors } from "../../validators/wallet.validators";
import { saveUserWallet } from "../user-wallets.service";
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

export async function confirmWalletBackup(uid, walletPassword) {
  const flow = getWalletCreationFlow(uid);

  if (!flow) {
    return {
      ok: false,
      formErrors: {},
      message: "La sesion de creacion expiro. Genera una nueva wallet para continuar.",
    };
  }

  const derivedWallet = deriveWalletAddresses(flow.mnemonic);
  await createEncryptedVault(flow.mnemonic, walletPassword);
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
