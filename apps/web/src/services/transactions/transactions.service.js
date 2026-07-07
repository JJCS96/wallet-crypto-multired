import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

function getTransactionsCollection(uid) {
  return collection(db, "users", uid, "transactions");
}

function getTransactionAssetKey(transaction) {
  if (transaction.assetType === "token") {
    return `${transaction.tokenStandard || "token"}:${transaction.tokenMint || transaction.tokenAddress || transaction.tokenSymbol || "unknown"}`;
  }

  return "native";
}

async function hasTransactionWithHash(uid, transaction) {
  if (!transaction.txHash) {
    return false;
  }

  const snapshot = await getDocs(
    query(
      getTransactionsCollection(uid),
      where("txHash", "==", transaction.txHash),
      limit(20),
    ),
  );
  const nextAssetKey = getTransactionAssetKey(transaction);

  return snapshot.docs.some((document) => {
    const current = document.data();

    return current.network === transaction.network
      && getTransactionAssetKey(current) === nextAssetKey;
  });
}

export async function createSimulatedTransaction(uid, transaction) {
  const reference = await addDoc(getTransactionsCollection(uid), {
    network: transaction.network,
    fromAddress: transaction.fromAddress,
    toAddress: transaction.toAddress,
    amount: transaction.amount,
    sentAmount: transaction.amount,
    networkFee: transaction.networkFee,
    appFee: transaction.appFee,
    appFeeRate: transaction.appFeeRate,
    totalDebit: transaction.totalDebit,
    adminWallet: transaction.adminWallet,
    direction: "outgoing",
    source: "app-send",
    status: "simulated",
    mode: "simulated",
    txHash: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reference.id;
}

export async function createRealDevnetTransaction(uid, transaction) {
  const reference = await addDoc(getTransactionsCollection(uid), {
    network: transaction.network,
    fromAddress: transaction.fromAddress,
    toAddress: transaction.toAddress,
    amount: transaction.amount,
    networkFee: transaction.networkFee,
    appFee: transaction.appFee,
    appFeeRate: transaction.appFeeRate,
    totalDebit: transaction.totalDebit,
    adminWallet: transaction.adminWallet,
    assetType: "native",
    direction: "outgoing",
    source: "app-send",
    status: transaction.status,
    signature: transaction.signature,
    txHash: transaction.signature,
    slot: transaction.slot,
    blockTime: transaction.blockTime,
    explorerUrl: transaction.explorerUrl,
    confirmationStatus: transaction.confirmationStatus,
    appFeeMode: transaction.appFeeMode,
    mode: "real-devnet",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reference.id;
}

export async function createRealBnbTestnetTransaction(uid, transaction) {
  const reference = await addDoc(getTransactionsCollection(uid), {
    network: "bnb",
    chainId: transaction.chainId,
    fromAddress: transaction.fromAddress,
    toAddress: transaction.toAddress,
    amount: transaction.amount,
    networkFee: transaction.networkFee,
    appFee: transaction.appFee,
    appFeeRate: transaction.appFeeRate,
    appFeeMode: transaction.appFeeMode,
    totalDebit: transaction.totalDebit,
    adminWallet: transaction.adminWallet,
    assetType: "native",
    direction: "outgoing",
    source: "app-send",
    status: transaction.status,
    txHash: transaction.txHash,
    gasUsed: transaction.gasUsed,
    gasPrice: transaction.gasPrice,
    explorerUrl: transaction.explorerUrl,
    confirmationStatus: transaction.confirmationStatus,
    mode: "real-testnet",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reference.id;
}

export async function createRealBitcoinTestnetTransaction(uid, transaction) {
  const reference = await addDoc(getTransactionsCollection(uid), {
    network: "bitcoin",
    fromAddress: transaction.fromAddress,
    toAddress: transaction.toAddress,
    amount: transaction.amount,
    networkFee: transaction.networkFee,
    feeRate: transaction.feeRate,
    appFee: transaction.appFee,
    appFeeRate: transaction.appFeeRate,
    appFeeMode: transaction.appFeeMode,
    totalDebit: transaction.totalDebit,
    adminWallet: transaction.adminWallet,
    assetType: "native",
    direction: "outgoing",
    source: "app-send",
    status: transaction.status,
    txHash: transaction.txHash,
    explorerUrl: transaction.explorerUrl,
    confirmationStatus: transaction.confirmationStatus,
    mode: "real-testnet",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reference.id;
}

export async function createRealTokenTransaction(uid, transaction) {
  const payload = {
    network: transaction.network,
    assetType: "token",
    tokenStandard: transaction.tokenStandard,
    tokenSymbol: transaction.tokenSymbol,
    fromAddress: transaction.fromAddress,
    toAddress: transaction.toAddress,
    amount: transaction.amount,
    networkFee: transaction.networkFee,
    appFee: transaction.appFee,
    appFeeRate: transaction.appFeeRate,
    appFeeMode: transaction.appFeeMode,
    totalDebit: transaction.totalDebit,
    adminWallet: transaction.adminWallet,
    direction: "outgoing",
    source: "app-send",
    status: transaction.status,
    txHash: transaction.txHash,
    explorerUrl: transaction.explorerUrl,
    confirmationStatus: transaction.confirmationStatus,
    mode: transaction.mode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (transaction.tokenMint) {
    payload.tokenMint = transaction.tokenMint;
  }

  if (transaction.tokenAddress) {
    payload.tokenAddress = transaction.tokenAddress;
  }

  if (transaction.signature) {
    payload.signature = transaction.signature;
  }

  if (transaction.gasUsed) {
    payload.gasUsed = transaction.gasUsed;
  }

  if (transaction.gasPrice) {
    payload.gasPrice = transaction.gasPrice;
  }

  const reference = await addDoc(getTransactionsCollection(uid), payload);

  return reference.id;
}

export async function getSimulatedTransactions(uid) {
  const snapshot = await getDocs(
    query(getTransactionsCollection(uid), orderBy("createdAt", "desc")),
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function getTransactions(uid) {
  return getSimulatedTransactions(uid);
}

export async function createSyncedTransactionIfMissing(uid, transaction) {
  const exists = await hasTransactionWithHash(uid, transaction);

  if (exists) {
    return null;
  }

  const payload = {
    network: transaction.network,
    assetType: transaction.assetType || "native",
    fromAddress: transaction.fromAddress || "No disponible",
    toAddress: transaction.toAddress || "No disponible",
    amount: transaction.amount,
    networkFee: transaction.networkFee || 0,
    appFee: 0,
    appFeeRate: 0,
    appFeeMode: "documented",
    totalDebit: transaction.direction === "outgoing"
      ? transaction.amount + (transaction.networkFee || 0)
      : transaction.amount,
    adminWallet: "No aplica",
    direction: transaction.direction,
    source: "blockchain-sync",
    status: transaction.status || "success",
    mode: transaction.mode,
    txHash: transaction.txHash,
    explorerUrl: transaction.explorerUrl,
    confirmationStatus: transaction.confirmationStatus || "confirmed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (transaction.assetType === "token") {
    payload.tokenStandard = transaction.tokenStandard;
    payload.tokenSymbol = transaction.tokenSymbol;
  }

  if (transaction.tokenMint) {
    payload.tokenMint = transaction.tokenMint;
  }

  if (transaction.tokenAddress) {
    payload.tokenAddress = transaction.tokenAddress;
  }

  if (transaction.signature) {
    payload.signature = transaction.signature;
  }

  if (transaction.slot != null) {
    payload.slot = transaction.slot;
  }

  if (transaction.blockTime != null) {
    payload.blockTime = transaction.blockTime;
  }

  if (transaction.chainId != null) {
    payload.chainId = transaction.chainId;
  }

  if (transaction.gasUsed != null) {
    payload.gasUsed = transaction.gasUsed;
  }

  if (transaction.gasPrice != null) {
    payload.gasPrice = transaction.gasPrice;
  }

  if (transaction.feeRate != null) {
    payload.feeRate = transaction.feeRate;
  }

  const reference = await addDoc(getTransactionsCollection(uid), payload);
  return reference.id;
}
