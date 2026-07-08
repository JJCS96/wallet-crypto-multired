import process from "node:process";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const DEFAULT_DECIMALS = 6;
const DEFAULT_AMOUNT = "100";

function printUsage() {
  console.log("Uso: node scripts/create-spl-demo-token.js <direccion-solana-destino> [monto]");
  console.log("Ejemplo: node scripts/create-spl-demo-token.js C3Z... 100");
}

function parseTokenAmount(value, decimals) {
  const normalizedValue = String(value || "").trim();

  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) {
    throw new Error("Monto invalido. Usa un numero positivo, por ejemplo 100 o 12.5.");
  }

  const [wholePart, decimalPart = ""] = normalizedValue.split(".");

  if (decimalPart.length > decimals) {
    throw new Error(`Monto invalido. Maximo ${decimals} decimales.`);
  }

  const units = (BigInt(wholePart) * (10n ** BigInt(decimals)))
    + BigInt(decimalPart.padEnd(decimals, "0") || "0");

  if (units <= 0n) {
    throw new Error("Monto invalido. Debe ser mayor a cero.");
  }

  return units;
}

async function requestAndConfirmAirdrop(connection, payer) {
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const signature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );

  return signature;
}

async function main() {
  const recipientAddress = process.argv[2];
  const amount = process.argv[3] || DEFAULT_AMOUNT;

  if (!recipientAddress) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const recipientPublicKey = new PublicKey(recipientAddress);
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");
  const payer = Keypair.generate();
  const mintAmount = parseTokenAmount(amount, DEFAULT_DECIMALS);

  console.log("Red: Solana Devnet");
  console.log("Destino NovaWallet:", recipientPublicKey.toBase58());
  console.log("Wallet temporal:", payer.publicKey.toBase58());
  console.log("Solicitando airdrop devnet para pagar fees...");

  const airdropSignature = await requestAndConfirmAirdrop(connection, payer);
  console.log("Airdrop:", `https://explorer.solana.com/tx/${airdropSignature}?cluster=devnet`);

  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    DEFAULT_DECIMALS,
  );
  const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipientPublicKey,
  );
  const mintSignature = await mintTo(
    connection,
    payer,
    mint,
    destinationTokenAccount.address,
    payer.publicKey,
    mintAmount,
  );

  console.log("");
  console.log("USDT-DEMO SPL creado y enviado.");
  console.log("Mint address:", mint.toBase58());
  console.log("Recipient ATA:", destinationTokenAccount.address.toBase58());
  console.log("Monto:", amount);
  console.log("Firma:", mintSignature);
  console.log("Explorer:", `https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
  console.log("");
  console.log("Configura en apps/web/.env.local:");
  console.log(`VITE_SOLANA_SPL_DEMO_MINT=${mint.toBase58()}`);
  console.log("VITE_SOLANA_SPL_DEMO_SYMBOL=USDT-DEMO");
  console.log(`VITE_SOLANA_SPL_DEMO_DECIMALS=${DEFAULT_DECIMALS}`);
  console.log("");
  console.log("Nota: la autoridad del mint fue una wallet temporal de devnet y no se guardo.");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
