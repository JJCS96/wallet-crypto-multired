/**
 * Archivo: solana-token.service.js
 * Propósito: Soporta tokens SPL demo configurables en Solana Devnet.
 * Funcionalidades:
 * - Lee el mint demo desde variables públicas Vite.
 * - Consulta balances SPL y crea ATA destino cuando aplica.
 * - Firma localmente transferencias SPL demo sin usar USDT real ni mainnet.
 */
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  ACCOUNT_SIZE,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { ASSETS, ASSET_IDS } from "../../config/assets";
import { deriveSolanaKeypair } from "./solana.service";
import {
  buildSolanaExplorerUrl,
  confirmSolanaBroadcast,
  getSolanaConnection,
  isValidSolanaPublicKey,
  readSolanaTransactionDetails,
} from "./solana-rpc.service";

function getSplAsset() {
  return ASSETS[ASSET_IDS.solanaSplDemo];
}

function assertSplConfigured() {
  const asset = getSplAsset();

  if (!asset.configured || !isValidSolanaPublicKey(asset.tokenMint)) {
    throw new Error("spl-token-not-configured");
  }

  return asset;
}

function unitsToTokenNumber(units, decimals) {
  return Number(units) / (10 ** decimals);
}

async function getTokenAccountOrNull(connection, ata) {
  try {
    return await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID);
  } catch {
    return null;
  }
}

async function buildSplTransferTransaction({ fromPublicKey, toAddress, amountUnits }) {
  const asset = assertSplConfigured();
  const connection = getSolanaConnection();
  const mintPublicKey = new PublicKey(asset.tokenMint);
  const toPublicKey = new PublicKey(toAddress);
  const sourceAta = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
  const destinationAta = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);
  const sourceAccount = await getTokenAccountOrNull(connection, sourceAta);

  if (!sourceAccount) {
    throw new Error("spl-source-token-account-missing");
  }

  if (amountUnits > sourceAccount.amount) {
    throw new Error("insufficient-token-funds");
  }

  const destinationAccount = await getTokenAccountOrNull(connection, destinationAta);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: fromPublicKey,
    recentBlockhash: blockhash,
  });

  if (!destinationAccount) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPublicKey,
        destinationAta,
        toPublicKey,
        mintPublicKey,
      ),
    );
  }

  transaction.add(
    createTransferInstruction(
      sourceAta,
      destinationAta,
      fromPublicKey,
      amountUnits,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  return {
    transaction,
    sourceAta,
    destinationAta,
    createsDestinationAta: !destinationAccount,
  };
}

export function parseSplTokenAmountToUnits(amount) {
  const asset = assertSplConfigured();
  const normalizedValue = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) {
    throw new Error("invalid-spl-amount");
  }

  const [wholePart, decimalPart = ""] = normalizedValue.split(".");

  if (decimalPart.length > asset.decimals) {
    throw new Error("invalid-spl-amount");
  }

  const units = (BigInt(wholePart) * (10n ** BigInt(asset.decimals)))
    + BigInt(decimalPart.padEnd(asset.decimals, "0") || "0");

  if (units <= 0n) {
    throw new Error("invalid-spl-amount");
  }

  return units;
}

export async function getSplDemoTokenBalance(address) {
  if (!isValidSolanaPublicKey(address)) {
    throw new Error("invalid-solana-address");
  }

  const asset = assertSplConfigured();
  const connection = getSolanaConnection();
  const ownerPublicKey = new PublicKey(address);
  const mintPublicKey = new PublicKey(asset.tokenMint);
  const ata = await getAssociatedTokenAddress(mintPublicKey, ownerPublicKey);
  const account = await getTokenAccountOrNull(connection, ata);
  const balanceUnits = account?.amount || 0n;

  return {
    network: "solana",
    assetId: asset.id,
    assetType: "token",
    tokenStandard: "SPL",
    tokenMint: asset.tokenMint,
    tokenAddress: ata.toBase58(),
    symbol: asset.symbol,
    decimals: asset.decimals,
    balance: unitsToTokenNumber(balanceUnits, asset.decimals),
    balanceUnits: balanceUnits.toString(),
    source: "blockchain-real",
  };
}

export async function estimateSplDemoTransferFee({ fromAddress, toAddress, amountUnits }) {
  if (!isValidSolanaPublicKey(fromAddress) || !isValidSolanaPublicKey(toAddress)) {
    throw new Error("invalid-solana-address");
  }

  const connection = getSolanaConnection();
  const fromPublicKey = new PublicKey(fromAddress);
  const { transaction, createsDestinationAta } = await buildSplTransferTransaction({
    fromPublicKey,
    toAddress,
    amountUnits,
  });
  const feeResult = await connection.getFeeForMessage(transaction.compileMessage(), "confirmed");
  const networkFeeLamports = BigInt(feeResult.value ?? 0);
  const destinationAtaRentLamports = createsDestinationAta
    ? BigInt(await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE))
    : 0n;
  const solBalanceLamports = BigInt(await connection.getBalance(fromPublicKey));

  if (networkFeeLamports + destinationAtaRentLamports > solBalanceLamports) {
    throw new Error("insufficient-gas-funds");
  }

  return {
    networkFeeLamports,
    networkFee: Number(networkFeeLamports) / LAMPORTS_PER_SOL,
    destinationAtaRentLamports,
    createsDestinationAta,
  };
}

/**
 * Envía el token SPL demo configurado.
 * Si el mint no existe en variables de entorno, el token no debe mostrarse como activo enviable.
 */
export async function sendSignedSplDemoTransfer({ mnemonic, expectedFromAddress, toAddress, amountUnits }) {
  if (!isValidSolanaPublicKey(expectedFromAddress) || !isValidSolanaPublicKey(toAddress)) {
    throw new Error("invalid-solana-address");
  }

  const asset = assertSplConfigured();
  const connection = getSolanaConnection();
  const keypair = deriveSolanaKeypair(mnemonic);

  if (keypair.publicKey.toBase58() !== expectedFromAddress) {
    throw new Error("solana-wallet-mismatch");
  }

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const { transaction } = await buildSplTransferTransaction({
    fromPublicKey: keypair.publicKey,
    toAddress,
    amountUnits,
  });
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.sign(keypair);

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    preflightCommitment: "confirmed",
  });
  await confirmSolanaBroadcast(connection, signature, latestBlockhash);
  const { transactionDetails } = await readSolanaTransactionDetails(connection, signature);

  return {
    signature,
    txHash: signature,
    explorerUrl: buildSolanaExplorerUrl(signature),
    tokenMint: asset.tokenMint,
    tokenSymbol: asset.symbol,
    networkFee: transactionDetails?.meta?.fee
      ? transactionDetails.meta.fee / LAMPORTS_PER_SOL
      : null,
    networkFeeLamports: transactionDetails?.meta?.fee ? BigInt(transactionDetails.meta.fee).toString() : null,
    confirmationStatus: "confirmed",
  };
}
