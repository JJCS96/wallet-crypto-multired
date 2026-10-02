/**
 * Archivo: transactions.service.js
 * Propósito: Persiste y combina movimientos de NovaWallet en Firestore.
 * Funcionalidades:
 * - Guarda envíos reales, simulados y tokens demo con datos públicos.
 * - Evita duplicados por hash/red/activo.
 * - Fusiona registros creados por la app con actividad detectada on-chain.
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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

async function findTransactionWithHash(uid, transaction) {
  if (!transaction.txHash) {
    return null;
  }

  const snapshot = await getDocs(
    query(
      getTransactionsCollection(uid),
      where("txHash", "==", transaction.txHash),
      limit(20),
    ),
  );
  const nextAssetKey = getTransactionAssetKey(transaction);
  const matchingDocument = snapshot.docs.find((document) => {
    const current = document.data();

    return current.network === transaction.network
      && getTransactionAssetKey(current) === nextAssetKey;
  });

  return matchingDocument || null;
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
  // Guarda solo metadatos públicos de Solana: direcciones, monto, firma, estado y explorer.
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
  // Guarda datos públicos de BNB Testnet; nunca se persisten seed, privateKey ni password.
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
  // Registra BTC Testnet con hash y explorer, manteniendo fuera de Firestore cualquier dato de firma.
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
  // Los tokens demo se registran como metadatos públicos del contrato/mint y la transferencia.
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

/**
 * Registra un envío que ya se transmitió a la red pero cuya confirmación no llegó a tiempo.
 * Queda como "pending" con su hash; la sincronización on-chain lo actualiza al confirmarse.
 */
export async function createPendingBroadcastTransaction(uid, transaction, { txHash, explorerUrl }) {
  const isToken = transaction.assetType === "token";
  const payload = {
    network: transaction.network,
    assetType: isToken ? "token" : "native",
    fromAddress: transaction.fromAddress,
    toAddress: transaction.toAddress,
    amount: transaction.amount,
    networkFee: transaction.networkFee,
    appFee: transaction.appFee,
    appFeeRate: transaction.appFeeRate,
    totalDebit: transaction.totalDebit,
    adminWallet: transaction.adminWallet,
    direction: "outgoing",
    source: "app-send",
    status: "pending",
    confirmationStatus: "broadcast",
    txHash,
    explorerUrl,
    mode: transaction.network === "solana" ? "real-devnet" : "real-testnet",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (transaction.appFeeMode) {
    payload.appFeeMode = transaction.appFeeMode;
  }

  if (transaction.network === "solana") {
    payload.signature = txHash;
  }

  if (transaction.chainId != null) {
    payload.chainId = transaction.chainId;
  }

  if (isToken) {
    payload.tokenStandard = transaction.tokenStandard;
    payload.tokenSymbol = transaction.tokenSymbol;

    if (transaction.tokenMint) {
      payload.tokenMint = transaction.tokenMint;
    }

    if (transaction.tokenAddress) {
      payload.tokenAddress = transaction.tokenAddress;
    }
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

function getTransactionSortTime(transaction) {
  if (typeof transaction.blockTime === "number") {
    return transaction.blockTime * 1000;
  }

  if (transaction.createdAt?.toMillis) {
    return transaction.createdAt.toMillis();
  }

  if (transaction.createdAt instanceof Date) {
    return transaction.createdAt.getTime();
  }

  if (transaction.createdAt) {
    const parsed = new Date(transaction.createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function getTransactionMergeKey(transaction) {
  if (transaction.txHash || transaction.signature) {
    return `${transaction.network}:${transaction.txHash || transaction.signature}`;
  }

  return transaction.id || `${transaction.network}:${transaction.direction}:${transaction.amount}:${getTransactionSortTime(transaction)}`;
}

const BLOCKCHAIN_CONFIRMATION_FIELDS = [
  "status",
  "confirmationStatus",
  "explorerUrl",
  "blockTime",
  "slot",
  "chainId",
  "gasUsed",
  "gasPrice",
  "feeRate",
  "updatedAt",
];

function isAppSendTransaction(transaction) {
  return transaction?.source === "app-send";
}

function isBlockchainTransaction(transaction) {
  return transaction?.source === "blockchain-rpc" || transaction?.source === "blockchain-sync";
}

function hasMergeValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function getBlockchainConfirmationPatch(transaction) {
  return BLOCKCHAIN_CONFIRMATION_FIELDS.reduce((patch, field) => {
    if (hasMergeValue(transaction?.[field])) {
      patch[field] = transaction[field];
    }

    return patch;
  }, {});
}

function mergeAppSendWithBlockchain(appTransaction, blockchainTransaction) {
  return {
    ...appTransaction,
    ...getBlockchainConfirmationPatch(blockchainTransaction),
    source: "app-send",
  };
}

function mergeDuplicateTransaction(existing, transaction) {
  if (isAppSendTransaction(existing) && isBlockchainTransaction(transaction)) {
    return mergeAppSendWithBlockchain(existing, transaction);
  }

  if (isAppSendTransaction(transaction) && isBlockchainTransaction(existing)) {
    return mergeAppSendWithBlockchain(transaction, existing);
  }

  if (isAppSendTransaction(existing)) {
    return existing;
  }

  if (isAppSendTransaction(transaction)) {
    return transaction;
  }

  return {
    ...existing,
    ...transaction,
  };
}

export function mergeTransactions(...transactionLists) {
  const mergedByKey = new Map();

  transactionLists.flat().filter(Boolean).forEach((transaction) => {
    const key = getTransactionMergeKey(transaction);
    const existing = mergedByKey.get(key);

    if (!existing) {
      mergedByKey.set(key, transaction);
      return;
    }

    mergedByKey.set(key, mergeDuplicateTransaction(existing, transaction));
  });

  return Array.from(mergedByKey.values())
    .sort((left, right) => getTransactionSortTime(right) - getTransactionSortTime(left));
}

export async function createSyncedTransactionIfMissing(uid, transaction) {
  const existingDocument = await findTransactionWithHash(uid, transaction);

  if (existingDocument) {
    const current = existingDocument.data();
    const nextStatus = transaction.status || current.status;
    const nextConfirmationStatus = transaction.confirmationStatus || current.confirmationStatus;

    if (current.status !== nextStatus || current.confirmationStatus !== nextConfirmationStatus) {
      await updateDoc(doc(db, "users", uid, "transactions", existingDocument.id), {
        status: nextStatus,
        confirmationStatus: nextConfirmationStatus,
        explorerUrl: transaction.explorerUrl || current.explorerUrl,
        updatedAt: serverTimestamp(),
      });
    }

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

  if (transaction.assetType !== "token" && transaction.tokenSymbol) {
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
