/**
 * Archivo: solana-rpc.service.js
 * Propósito: Integra NovaWallet con Solana Devnet mediante RPC.
 * Funcionalidades:
 * - Consulta balances SOL.
 * - Estima comisiones de red.
 * - Firma y envía transferencias SOL desde el navegador.
 */
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { SOLANA_CLUSTER, SOLANA_RPC_URL } from "../../config/solana";
import { awaitBroadcastConfirmation } from "./broadcast-confirmation";

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

export function buildSolanaExplorerUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
}

/**
 * Espera la confirmación de una firma ya transmitida.
 * Un error on-chain es un rechazo definitivo; un timeout o fallo del RPC deja el envío como pendiente.
 */
export async function confirmSolanaBroadcast(connection, signature, latestBlockhash) {
  const confirmation = await awaitBroadcastConfirmation(
    connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed",
    ),
    {
      txHash: signature,
      explorerUrl: buildSolanaExplorerUrl(signature),
      timeoutMs: 30000,
    },
  );

  if (confirmation.value.err) {
    throw new Error("transaction-rejected");
  }

  return confirmation;
}

/**
 * Lee detalles opcionales (slot, fee, estado) de una transacción ya confirmada.
 * Si el RPC falla aquí, la transferencia sigue siendo válida y se devuelven valores nulos.
 */
export async function readSolanaTransactionDetails(connection, signature) {
  try {
    const [transactionDetails, signatureStatus] = await Promise.all([
      connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }),
      connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      }),
    ]);

    return { transactionDetails, signatureStatus };
  } catch {
    return { transactionDetails: null, signatureStatus: null };
  }
}

/**
 * Envía SOL en Solana Devnet.
 * La transacción se firma localmente con el keypair recibido y luego se transmite al RPC.
 */
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

  const confirmation = await confirmSolanaBroadcast(connection, signature, latestBlockhash);
  const { transactionDetails, signatureStatus } = await readSolanaTransactionDetails(connection, signature);

  return {
    signature,
    explorerUrl: buildSolanaExplorerUrl(signature),
    slot: transactionDetails?.slot ?? null,
    blockTime: transactionDetails?.blockTime ?? null,
    networkFee: transactionDetails?.meta?.fee
      ? transactionDetails.meta.fee / LAMPORTS_PER_SOL
      : null,
    networkFeeLamports: transactionDetails?.meta?.fee ? BigInt(transactionDetails.meta.fee) : null,
    confirmationStatus: signatureStatus?.value?.confirmationStatus || "confirmed",
    confirmation,
  };
}
