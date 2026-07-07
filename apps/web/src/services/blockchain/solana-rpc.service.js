import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { SOLANA_CLUSTER, SOLANA_RPC_URL } from "../../config/solana";

let cachedConnection = null;

export function getSolanaConnection() {
  if (!cachedConnection) {
    cachedConnection = new Connection(SOLANA_RPC_URL, "confirmed");
  }

  return cachedConnection;
}

export function isValidSolanaPublicKey(address) {
  try {
    const publicKey = new PublicKey(address);
    return Boolean(publicKey);
  } catch {
    return false;
  }
}

function getSolanaPublicKey(address, errorCode = "invalid-solana-address") {
  try {
    return new PublicKey(address);
  } catch {
    throw new Error(errorCode);
  }
}

function lamportsToSafeNumber(lamports) {
  const lamportsNumber = Number(lamports);

  if (!Number.isSafeInteger(lamportsNumber) || lamportsNumber < 0) {
    throw new Error("invalid-solana-lamports");
  }

  return lamportsNumber;
}

function buildSolanaTransferTransaction({
  feePayer,
  toPublicKey,
  amountLamports,
  adminPublicKey,
  appFeeLamports,
  blockhash,
}) {
  return new Transaction({
    feePayer,
    recentBlockhash: blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: feePayer,
      toPubkey: toPublicKey,
      lamports: lamportsToSafeNumber(amountLamports),
    }),
    SystemProgram.transfer({
      fromPubkey: feePayer,
      toPubkey: adminPublicKey,
      lamports: lamportsToSafeNumber(appFeeLamports),
    }),
  );
}

export async function getSolanaBalance(address) {
  if (!isValidSolanaPublicKey(address)) {
    throw new Error("La direccion de Solana no es valida.");
  }

  const connection = getSolanaConnection();
  const publicKey = new PublicKey(address);
  const lamports = await connection.getBalance(publicKey);

  return {
    network: "solana",
    cluster: SOLANA_CLUSTER,
    rpcUrl: SOLANA_RPC_URL,
    symbol: "SOL",
    balance: lamports / LAMPORTS_PER_SOL,
    balanceLamports: lamports,
    source: "blockchain-real",
  };
}

export async function estimateSolanaTransferFee({
  fromAddress,
  toAddress,
  amountLamports,
  adminWalletAddress,
  appFeeLamports,
}) {
  const connection = getSolanaConnection();
  const fromPublicKey = getSolanaPublicKey(fromAddress);
  const toPublicKey = getSolanaPublicKey(toAddress);
  const adminPublicKey = getSolanaPublicKey(adminWalletAddress, "invalid-admin-wallet");
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const transaction = buildSolanaTransferTransaction({
    feePayer: fromPublicKey,
    toPublicKey,
    amountLamports,
    adminPublicKey,
    appFeeLamports,
    blockhash,
  });
  const feeResult = await connection.getFeeForMessage(transaction.compileMessage(), "confirmed");
  const lamports = feeResult.value ?? 0;

  return BigInt(lamports);
}

function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error("timeout"));
      }, timeoutMs);
    }),
  ]);
}

export function buildSolanaExplorerUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
}

export async function sendSignedSolanaTransfer({
  fromKeypair,
  toAddress,
  amountLamports,
  adminWalletAddress,
  appFeeLamports,
}) {
  const connection = getSolanaConnection();
  const toPublicKey = getSolanaPublicKey(toAddress);
  const adminPublicKey = getSolanaPublicKey(adminWalletAddress, "invalid-admin-wallet");
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = buildSolanaTransferTransaction({
    feePayer: fromKeypair.publicKey,
    toPublicKey,
    amountLamports,
    adminPublicKey,
    appFeeLamports,
    blockhash: latestBlockhash.blockhash,
  });

  transaction.sign(fromKeypair);

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    preflightCommitment: "confirmed",
  });

  const confirmation = await withTimeout(
    connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed",
    ),
  );

  if (confirmation.value.err) {
    throw new Error("transaction-rejected");
  }

  const transactionDetails = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const signatureStatus = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true,
  });

  return {
    signature,
    explorerUrl: buildSolanaExplorerUrl(signature),
    slot: transactionDetails?.slot ?? null,
    blockTime: transactionDetails?.blockTime ?? null,
    networkFee: transactionDetails?.meta?.fee
      ? transactionDetails.meta.fee / LAMPORTS_PER_SOL
      : null,
    networkFeeLamports: transactionDetails?.meta?.fee ? BigInt(transactionDetails.meta.fee) : null,
    confirmationStatus: signatureStatus.value?.confirmationStatus || "confirmed",
    confirmation,
  };
}
