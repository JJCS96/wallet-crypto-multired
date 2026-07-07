import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { WALLET_COLLECTION_NAME, WALLET_DOCUMENT_ID } from "../constants/wallet";

function getWalletDocumentReference(uid) {
  return doc(db, "users", uid, WALLET_COLLECTION_NAME, WALLET_DOCUMENT_ID);
}

export async function getUserWallet(uid) {
  if (!uid) {
    throw new Error("No existe un uid válido para consultar la Wallet del usuario.");
  }

  const snapshot = await getDoc(getWalletDocumentReference(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function saveUserWallet(uid, walletAddresses, options = {}) {
  const reference = getWalletDocumentReference(uid);
  const existingSnapshot = await getDoc(reference);
  const existingData = existingSnapshot.exists() ? existingSnapshot.data() : null;
  const nextWalletData = {
    solanaAddress: walletAddresses.solanaAddress,
    bitcoinAddress: walletAddresses.bitcoinAddress,
    bnbAddress: walletAddresses.bnbAddress,
    createdAt: existingData?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (options.markAsRestored) {
    nextWalletData.restoredAt = serverTimestamp();
  } else if (existingData?.restoredAt) {
    nextWalletData.restoredAt = existingData.restoredAt;
  }

  await setDoc(reference, nextWalletData);

  return getUserWallet(uid);
}
