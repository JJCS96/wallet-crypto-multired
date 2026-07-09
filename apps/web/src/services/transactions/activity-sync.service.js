import { getAssociatedTokenAddress } from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { formatEther, formatUnits, id, Interface, zeroPadValue } from "ethers";
import { ASSETS, ASSET_IDS } from "../../config/assets";
import { isValidBitcoinTestnetAddress } from "../../utils/address-validation";
import { getSolanaConnection, buildSolanaExplorerUrl, isValidSolanaPublicKey } from "../blockchain/solana-rpc.service";
import { buildBnbExplorerUrl, BNB_TESTNET_CHAIN_ID, BNB_TESTNET_RPC_URL, getBnbProvider, assertBnbTestnetProvider, weiToBnbNumber } from "../blockchain/bnb.service";
import { createSyncedTransactionIfMissing } from "./transactions.service";

const SOLANA_SIGNATURE_LIMIT = 12;
const BITCOIN_TX_LIMIT = 12;
const BNB_BLOCK_SCAN_LOOKBACK = 120;
const BEP20_EVENT_LOOKBACK = 5000;
const SATOSHIS_PER_BTC = 100_000_000;
const BITCOIN_TESTNET_API_URL = (import.meta.env.VITE_BITCOIN_TESTNET_API_URL || "https://mempool.space/testnet/api").replace(/\/$/, "");
const BITCOIN_TESTNET_EXPLORER_TX_URL = "https://blockstream.info/testnet/tx/";
const BSCSCAN_TESTNET_API_KEY = import.meta.env.VITE_BSCSCAN_TESTNET_API_KEY || "";
const BSCSCAN_TESTNET_API_URL = "https://api-testnet.bscscan.com/api";

const ERC20_TRANSFER_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

function toNumberFromBaseUnits(value, decimals) {
  return Number(value) / (10 ** decimals);
}

function satoshisToBtcNumber(value) {
  return Number(value) / SATOSHIS_PER_BTC;
}

function getShortError(error) {
  return error?.message || "activity-sync-failed";
}

function successResult(createdCount = 0) {
  return {
    status: "success",
    createdCount,
  };
}

function skippedResult(message) {
  return {
    status: "skipped",
    createdCount: 0,
    message,
  };
}

async function runActivityJob(job) {
  try {
    const result = await job.run();

    return {
      network: job.network,
      asset: job.asset,
      ...(typeof result === "number" ? successResult(result) : result),
    };
  } catch (error) {
    return {
      network: job.network,
      asset: job.asset,
      status: "error",
      createdCount: 0,
      message: getShortError(error),
    };
  }
}

function buildBitcoinTxExplorerUrl(txid) {
  return `${BITCOIN_TESTNET_EXPLORER_TX_URL}${txid}`;
}

function isValidBnbTestnetAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(address || "").trim());
}

function getSolanaAccountKeyString(accountKey) {
  return accountKey?.pubkey?.toBase58?.()
    || accountKey?.pubkey?.toString?.()
    || accountKey?.toBase58?.()
    || accountKey?.toString?.()
    || "";
}

function getSolanaInstructionParties(parsedTransaction, solanaAddress, direction) {
  let fromAddress = direction === "outgoing" ? solanaAddress : "No disponible";
  let toAddress = direction === "incoming" ? solanaAddress : "No disponible";

  for (const instruction of parsedTransaction.transaction.message.instructions) {
    if (instruction.program !== "system" || instruction.parsed?.type !== "transfer") {
      continue;
    }

    const info = instruction.parsed.info;

    if (direction === "incoming" && info.destination === solanaAddress) {
      fromAddress = info.source || fromAddress;
      toAddress = solanaAddress;
      break;
    }

    if (direction === "outgoing" && info.source === solanaAddress) {
      fromAddress = solanaAddress;
      toAddress = info.destination || toAddress;
      break;
    }
  }

  return { fromAddress, toAddress };
}

export async function getSolanaNativeOnChainActivity(solanaAddress, limit = SOLANA_SIGNATURE_LIMIT) {
  if (!isValidSolanaPublicKey(solanaAddress)) {
    throw new Error("Dirección Solana no disponible para consultar actividad.");
  }

  const connection = getSolanaConnection();
  const publicKey = new PublicKey(solanaAddress);
  const signatures = await connection.getSignaturesForAddress(publicKey, { limit }, "confirmed");
  const transactions = [];

  for (const signatureInfo of signatures) {
    if (signatureInfo.err) {
      continue;
    }

    const parsedTransaction = await connection.getParsedTransaction(signatureInfo.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!parsedTransaction || parsedTransaction.meta?.err) {
      continue;
    }

    const accountKeys = parsedTransaction.transaction.message.accountKeys || [];
    const walletIndex = accountKeys.findIndex((accountKey) => getSolanaAccountKeyString(accountKey) === solanaAddress);

    if (walletIndex < 0) {
      continue;
    }

    const preBalance = BigInt(parsedTransaction.meta?.preBalances?.[walletIndex] ?? 0);
    const postBalance = BigInt(parsedTransaction.meta?.postBalances?.[walletIndex] ?? 0);
    const deltaLamports = postBalance - preBalance;

    if (deltaLamports === 0n) {
      continue;
    }

    const direction = deltaLamports > 0n ? "incoming" : "outgoing";
    const amountLamports = deltaLamports > 0n ? deltaLamports : -deltaLamports;
    const parties = getSolanaInstructionParties(parsedTransaction, solanaAddress, direction);
    const blockTime = parsedTransaction.blockTime || signatureInfo.blockTime || null;

    transactions.push({
      id: `solana-${signatureInfo.signature}`,
      network: "solana",
      assetType: "native",
      tokenSymbol: "SOL",
      direction,
      fromAddress: parties.fromAddress,
      toAddress: parties.toAddress,
      amount: Number(amountLamports) / LAMPORTS_PER_SOL,
      networkFee: direction === "outgoing" ? (parsedTransaction.meta?.fee || 0) / LAMPORTS_PER_SOL : 0,
      txHash: signatureInfo.signature,
      signature: signatureInfo.signature,
      explorerUrl: buildSolanaExplorerUrl(signatureInfo.signature),
      status: "confirmed",
      confirmationStatus: signatureInfo.confirmationStatus || "confirmed",
      mode: "real-devnet",
      source: "blockchain-rpc",
      slot: parsedTransaction.slot,
      blockTime,
      createdAt: blockTime ? new Date(blockTime * 1000) : null,
    });
  }

  return transactions;
}

async function fetchBitcoinJson(path) {
  const response = await fetch(`${BITCOIN_TESTNET_API_URL}${path}`);

  if (!response.ok) {
    throw new Error("No se pudo actualizar Bitcoin Testnet en este momento.");
  }

  return response.json();
}

async function createSynced(uid, transaction) {
  return createSyncedTransactionIfMissing(uid, transaction);
}

async function syncSolanaNativeActivity(uid, solanaAddress) {
  if (!isValidSolanaPublicKey(solanaAddress)) {
    return skippedResult("Dirección Solana no disponible, se omitió la sincronización.");
  }

  const transactions = await getSolanaNativeOnChainActivity(solanaAddress, SOLANA_SIGNATURE_LIMIT);
  let createdCount = 0;

  for (const transaction of transactions) {
    const createdId = await createSynced(uid, transaction);

    if (createdId) {
      createdCount += 1;
    }
  }

  return successResult(createdCount);
}

async function syncSolanaSplDemoActivity(uid, solanaAddress) {
  const asset = ASSETS[ASSET_IDS.solanaSplDemo];

  if (!asset.configured || !isValidSolanaPublicKey(asset.tokenMint)) {
    return skippedResult("Token demo SPL requiere configuración técnica; se omitió su sincronización.");
  }

  if (!isValidSolanaPublicKey(solanaAddress)) {
    return skippedResult("Dirección Solana no disponible, se omitió la sincronización SPL.");
  }

  const connection = getSolanaConnection();
  const ownerPublicKey = new PublicKey(solanaAddress);
  const mintPublicKey = new PublicKey(asset.tokenMint);
  const ata = await getAssociatedTokenAddress(mintPublicKey, ownerPublicKey);
  const ataAddress = ata.toBase58();
  const signatures = await connection.getSignaturesForAddress(ata, {
    limit: SOLANA_SIGNATURE_LIMIT,
  });
  let createdCount = 0;

  for (const signatureInfo of signatures) {
    const parsedTransaction = await connection.getParsedTransaction(signatureInfo.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!parsedTransaction || parsedTransaction.meta?.err) {
      continue;
    }

    let netUnits = 0n;
    let fromAddress = "No disponible";
    let toAddress = "No disponible";

    for (const instruction of parsedTransaction.transaction.message.instructions) {
      if (instruction.program !== "spl-token" || !["transfer", "transferChecked"].includes(instruction.parsed?.type)) {
        continue;
      }

      const info = instruction.parsed.info;
      const instructionMint = info.mint || asset.tokenMint;

      if (instructionMint !== asset.tokenMint) {
        continue;
      }

      const rawAmount = info.tokenAmount?.amount || info.amount || "0";
      const amountUnits = BigInt(rawAmount);

      if (info.destination === ataAddress) {
        netUnits += amountUnits;
        fromAddress = info.source || fromAddress;
        toAddress = solanaAddress;
      }

      if (info.source === ataAddress) {
        netUnits -= amountUnits;
        fromAddress = solanaAddress;
        toAddress = info.destination || toAddress;
      }
    }

    if (netUnits === 0n) {
      continue;
    }

    const direction = netUnits > 0n ? "incoming" : "outgoing";
    const createdId = await createSynced(uid, {
      network: "solana",
      assetType: "token",
      tokenStandard: "SPL",
      tokenSymbol: asset.symbol,
      tokenMint: asset.tokenMint,
      tokenAddress: ataAddress,
      direction,
      fromAddress,
      toAddress,
      amount: toNumberFromBaseUnits(netUnits > 0n ? netUnits : -netUnits, asset.decimals),
      networkFee: direction === "outgoing" ? (parsedTransaction.meta?.fee || 0) / LAMPORTS_PER_SOL : 0,
      txHash: signatureInfo.signature,
      signature: signatureInfo.signature,
      explorerUrl: buildSolanaExplorerUrl(signatureInfo.signature),
      status: "success",
      confirmationStatus: signatureInfo.confirmationStatus || "confirmed",
      mode: "real-devnet",
      slot: parsedTransaction.slot,
      blockTime: parsedTransaction.blockTime,
    });

    if (createdId) {
      createdCount += 1;
    }
  }

  return successResult(createdCount);
}

async function fetchBscScanTransactions(address) {
  if (!BSCSCAN_TESTNET_API_KEY) {
    return [];
  }

  const url = new URL(BSCSCAN_TESTNET_API_URL);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", address);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "99999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "12");
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", BSCSCAN_TESTNET_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("bscscan-activity-unavailable");
  }

  const data = await response.json();

  return Array.isArray(data.result) ? data.result : [];
}

function mapBscScanNativeTransaction(transaction, bnbAddress) {
  const lowerAddress = bnbAddress.toLowerCase();
  const fromAddress = transaction.from || "No disponible";
  const toAddress = transaction.to || "No disponible";
  const isIncoming = toAddress.toLowerCase() === lowerAddress;
  const isOutgoing = fromAddress.toLowerCase() === lowerAddress;
  const valueWei = BigInt(transaction.value || "0");

  if ((!isIncoming && !isOutgoing) || valueWei <= 0n) {
    return null;
  }

  const direction = isIncoming ? "incoming" : "outgoing";
  const networkFeeWei = direction === "outgoing"
    ? BigInt(transaction.gasUsed || "0") * BigInt(transaction.gasPrice || "0")
    : 0n;
  const blockTime = transaction.timeStamp ? Number(transaction.timeStamp) : null;
  const isFailed = transaction.isError === "1" || transaction.txreceipt_status === "0";

  return {
    id: `bnb-${transaction.hash}`,
    network: "bnb",
    assetType: "native",
    tokenSymbol: "tBNB",
    direction,
    fromAddress,
    toAddress,
    amount: Number(formatEther(valueWei)),
    networkFee: weiToBnbNumber(networkFeeWei),
    txHash: transaction.hash,
    explorerUrl: buildBnbExplorerUrl(transaction.hash),
    status: isFailed ? "failed" : "confirmed",
    confirmationStatus: isFailed ? "failed" : "confirmed",
    mode: "real-testnet",
    source: "blockchain-rpc",
    chainId: BNB_TESTNET_CHAIN_ID,
    gasUsed: Number(transaction.gasUsed || 0),
    gasPrice: transaction.gasPrice || "0",
    blockTime,
    createdAt: blockTime ? new Date(blockTime * 1000) : null,
  };
}

async function getBnbNativeFromBscScanActivity(bnbAddress, limit = 12) {
  const transactions = await fetchBscScanTransactions(bnbAddress);

  return transactions
    .map((transaction) => mapBscScanNativeTransaction(transaction, bnbAddress))
    .filter(Boolean)
    .slice(0, limit);
}

async function getBnbNativeFromRecentBlocksActivity(bnbAddress, limit = 12) {
  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  const lowerAddress = bnbAddress.toLowerCase();
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latestBlock - BNB_BLOCK_SCAN_LOOKBACK);
  const results = [];

  for (let blockNumber = latestBlock; blockNumber >= fromBlock && results.length < limit; blockNumber -= 1) {
    const block = await provider.getBlock(blockNumber, true);
    const transactions = await getBnbBlockTransactions(provider, block);

    for (const transaction of transactions) {
      if (!transaction.to || transaction.value <= 0n) {
        continue;
      }

      const isIncoming = transaction.to.toLowerCase() === lowerAddress;
      const isOutgoing = transaction.from.toLowerCase() === lowerAddress;

      if (!isIncoming && !isOutgoing) {
        continue;
      }

      const receipt = isOutgoing ? await provider.getTransactionReceipt(transaction.hash) : null;
      const networkFeeWei = receipt ? receipt.gasUsed * (receipt.gasPrice || transaction.gasPrice || 0n) : 0n;
      const blockTime = block?.timestamp || null;

      results.push({
        id: `bnb-${transaction.hash}`,
        network: "bnb",
        assetType: "native",
        tokenSymbol: "tBNB",
        direction: isIncoming ? "incoming" : "outgoing",
        fromAddress: transaction.from,
        toAddress: transaction.to,
        amount: Number(formatEther(transaction.value)),
        networkFee: weiToBnbNumber(networkFeeWei),
        txHash: transaction.hash,
        explorerUrl: buildBnbExplorerUrl(transaction.hash),
        status: "confirmed",
        confirmationStatus: "confirmed",
        mode: "real-testnet",
        source: "blockchain-rpc",
        chainId: BNB_TESTNET_CHAIN_ID,
        gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : 0,
        gasPrice: (receipt?.gasPrice || transaction.gasPrice || 0n).toString(),
        blockTime,
        createdAt: blockTime ? new Date(blockTime * 1000) : null,
      });

      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}

export async function getBnbNativeOnChainActivity(bnbAddress, limit = 12) {
  if (!isValidBnbTestnetAddress(bnbAddress)) {
    throw new Error("Dirección BNB Testnet no disponible para consultar actividad.");
  }

  if (BSCSCAN_TESTNET_API_KEY) {
    return getBnbNativeFromBscScanActivity(bnbAddress, limit);
  }

  if (!BNB_TESTNET_RPC_URL) {
    throw new Error("BNB Testnet requiere API key de explorador o RPC configurado para consultar actividad.");
  }

  return getBnbNativeFromRecentBlocksActivity(bnbAddress, limit);
}

async function syncBnbNativeFromBscScan(uid, bnbAddress) {
  const lowerAddress = bnbAddress.toLowerCase();
  const transactions = await fetchBscScanTransactions(bnbAddress);
  let createdCount = 0;

  for (const transaction of transactions) {
    if (transaction.isError === "1" || transaction.txreceipt_status === "0") {
      continue;
    }

    const valueWei = BigInt(transaction.value || "0");

    if (valueWei <= 0n) {
      continue;
    }

    const direction = transaction.to?.toLowerCase() === lowerAddress ? "incoming" : "outgoing";
    const networkFeeWei = direction === "outgoing"
      ? BigInt(transaction.gasUsed || "0") * BigInt(transaction.gasPrice || "0")
      : 0n;
    const createdId = await createSynced(uid, {
      network: "bnb",
      assetType: "native",
      direction,
      fromAddress: transaction.from,
      toAddress: transaction.to,
      amount: Number(formatEther(valueWei)),
      networkFee: weiToBnbNumber(networkFeeWei),
      txHash: transaction.hash,
      explorerUrl: buildBnbExplorerUrl(transaction.hash),
      status: "success",
      confirmationStatus: "confirmed",
      mode: "real-testnet",
      chainId: BNB_TESTNET_CHAIN_ID,
      gasUsed: Number(transaction.gasUsed || 0),
      gasPrice: transaction.gasPrice || "0",
    });

    if (createdId) {
      createdCount += 1;
    }
  }

  return createdCount;
}

async function getBnbBlockTransactions(provider, block) {
  if (!block) {
    return [];
  }

  if (block.prefetchedTransactions?.length > 0) {
    return block.prefetchedTransactions;
  }

  if (!Array.isArray(block.transactions) || block.transactions.length === 0) {
    return [];
  }

  if (typeof block.transactions[0] !== "string") {
    return block.transactions;
  }

  const transactions = await Promise.all(
    block.transactions.map((txHash) => provider.getTransaction(txHash)),
  );

  return transactions.filter(Boolean);
}

async function syncBnbNativeFromRecentBlocks(uid, bnbAddress) {
  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  const lowerAddress = bnbAddress.toLowerCase();
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latestBlock - BNB_BLOCK_SCAN_LOOKBACK);
  let createdCount = 0;

  for (let blockNumber = latestBlock; blockNumber >= fromBlock; blockNumber -= 1) {
    const block = await provider.getBlock(blockNumber, true);
    const transactions = await getBnbBlockTransactions(provider, block);

    for (const transaction of transactions) {
      if (!transaction.to || transaction.value <= 0n) {
        continue;
      }

      const isIncoming = transaction.to.toLowerCase() === lowerAddress;
      const isOutgoing = transaction.from.toLowerCase() === lowerAddress;

      if (!isIncoming && !isOutgoing) {
        continue;
      }

      const receipt = isOutgoing ? await provider.getTransactionReceipt(transaction.hash) : null;
      const networkFeeWei = receipt ? receipt.gasUsed * (receipt.gasPrice || transaction.gasPrice || 0n) : 0n;
      const createdId = await createSynced(uid, {
        network: "bnb",
        assetType: "native",
        direction: isIncoming ? "incoming" : "outgoing",
        fromAddress: transaction.from,
        toAddress: transaction.to,
        amount: Number(formatEther(transaction.value)),
        networkFee: weiToBnbNumber(networkFeeWei),
        txHash: transaction.hash,
        explorerUrl: buildBnbExplorerUrl(transaction.hash),
        status: "success",
        confirmationStatus: "confirmed",
        mode: "real-testnet",
        chainId: BNB_TESTNET_CHAIN_ID,
        gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : 0,
        gasPrice: (receipt?.gasPrice || transaction.gasPrice || 0n).toString(),
      });

      if (createdId) {
        createdCount += 1;
      }
    }
  }

  return createdCount;
}

async function syncBnbNativeActivity(uid, bnbAddress) {
  if (!BSCSCAN_TESTNET_API_KEY && !BNB_TESTNET_RPC_URL) {
    return skippedResult("Sincronización BNB entrante requiere API/indexador o RPC configurado.");
  }

  try {
    const bscScanCreatedCount = await syncBnbNativeFromBscScan(uid, bnbAddress);

    if (bscScanCreatedCount > 0 || BSCSCAN_TESTNET_API_KEY) {
      return successResult(bscScanCreatedCount);
    }
  } catch {
    // Fall back to RPC block scanning when the explorer API is unavailable.
  }

  return successResult(await syncBnbNativeFromRecentBlocks(uid, bnbAddress));
}

async function syncBep20DemoActivity(uid, bnbAddress) {
  const asset = ASSETS[ASSET_IDS.bnbBep20Demo];

  if (!asset.configured) {
    return skippedResult("Token demo BEP20 requiere configuración técnica; se omitió su sincronización.");
  }

  if (!BNB_TESTNET_RPC_URL) {
    return skippedResult("BEP20 requiere BNB RPC configurado, se omitió la sincronización.");
  }

  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latestBlock - BEP20_EVENT_LOOKBACK);
  const lowerAddress = bnbAddress.toLowerCase();
  const paddedAddress = zeroPadValue(bnbAddress, 32);
  const transferTopic = id("Transfer(address,address,uint256)");
  const logs = await Promise.all([
    provider.getLogs({
      address: asset.tokenAddress,
      fromBlock,
      toBlock: latestBlock,
      topics: [transferTopic, paddedAddress],
    }),
    provider.getLogs({
      address: asset.tokenAddress,
      fromBlock,
      toBlock: latestBlock,
      topics: [transferTopic, null, paddedAddress],
    }),
  ]);
  const transferInterface = new Interface(ERC20_TRANSFER_ABI);
  const transfersByHash = new Map();

  logs.flat().forEach((log) => {
    const parsed = transferInterface.parseLog(log);
    const fromAddress = parsed.args.from;
    const toAddress = parsed.args.to;
    const value = parsed.args.value;
    const current = transfersByHash.get(log.transactionHash) || {
      netUnits: 0n,
      fromAddress,
      toAddress,
      log,
    };

    if (toAddress.toLowerCase() === lowerAddress) {
      current.netUnits += value;
      current.toAddress = bnbAddress;
      current.fromAddress = fromAddress;
    }

    if (fromAddress.toLowerCase() === lowerAddress) {
      current.netUnits -= value;
      current.fromAddress = bnbAddress;
      current.toAddress = toAddress;
    }

    transfersByHash.set(log.transactionHash, current);
  });

  let createdCount = 0;

  for (const [txHash, transfer] of transfersByHash.entries()) {
    if (transfer.netUnits === 0n) {
      continue;
    }

    const direction = transfer.netUnits > 0n ? "incoming" : "outgoing";
    const receipt = direction === "outgoing" ? await provider.getTransactionReceipt(txHash) : null;
    const networkFeeWei = receipt ? receipt.gasUsed * (receipt.gasPrice || 0n) : 0n;
    const createdId = await createSynced(uid, {
      network: "bnb",
      assetType: "token",
      tokenStandard: "BEP20",
      tokenSymbol: asset.symbol,
      tokenAddress: asset.tokenAddress,
      direction,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      amount: Number(formatUnits(transfer.netUnits > 0n ? transfer.netUnits : -transfer.netUnits, asset.decimals)),
      networkFee: weiToBnbNumber(networkFeeWei),
      txHash,
      explorerUrl: buildBnbExplorerUrl(txHash),
      status: "success",
      confirmationStatus: "confirmed",
      mode: "real-testnet",
      chainId: BNB_TESTNET_CHAIN_ID,
      gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : 0,
      gasPrice: (receipt?.gasPrice || 0n).toString(),
    });

    if (createdId) {
      createdCount += 1;
    }
  }

  return successResult(createdCount);
}

export async function getBitcoinTestnetOnChainActivity(bitcoinAddress, limit = BITCOIN_TX_LIMIT) {
  if (!isValidBitcoinTestnetAddress(bitcoinAddress)) {
    throw new Error("Dirección Bitcoin Testnet no disponible para consultar actividad.");
  }

  const transactions = await fetchBitcoinJson(`/address/${bitcoinAddress}/txs`);
  const results = [];

  for (const transaction of transactions.slice(0, limit)) {
    const receivedOutputs = transaction.vout.filter((output) => output.scriptpubkey_address === bitcoinAddress);
    const sentInputs = transaction.vin.filter((input) => input.prevout?.scriptpubkey_address === bitcoinAddress);
    const incomingSatoshis = receivedOutputs.reduce((total, output) => total + BigInt(output.value || 0), 0n);
    const outgoingSatoshis = sentInputs.reduce((total, input) => total + BigInt(input.prevout?.value || 0), 0n);
    const netSatoshis = incomingSatoshis - outgoingSatoshis;

    if (netSatoshis === 0n) {
      continue;
    }

    const feeSatoshis = BigInt(transaction.fee || 0);
    const direction = netSatoshis > 0n ? "incoming" : "outgoing";
    const amountSatoshis = netSatoshis > 0n ? netSatoshis : -netSatoshis;
    const fromAddress = direction === "incoming"
      ? transaction.vin.find((input) => input.prevout?.scriptpubkey_address)?.prevout?.scriptpubkey_address || "No disponible"
      : bitcoinAddress;
    const toAddress = direction === "incoming"
      ? bitcoinAddress
      : transaction.vout.find((output) => output.scriptpubkey_address && output.scriptpubkey_address !== bitcoinAddress)?.scriptpubkey_address || "No disponible";
    const isConfirmed = transaction.status?.confirmed === true;
    const blockTime = transaction.status?.block_time || null;

    results.push({
      id: `bitcoin-${transaction.txid}`,
      network: "bitcoin",
      assetType: "native",
      tokenSymbol: "BTC",
      direction,
      fromAddress,
      toAddress,
      amount: satoshisToBtcNumber(amountSatoshis),
      networkFee: direction === "outgoing" ? satoshisToBtcNumber(feeSatoshis) : 0,
      txHash: transaction.txid,
      explorerUrl: buildBitcoinTxExplorerUrl(transaction.txid),
      status: isConfirmed ? "confirmed" : "pending",
      confirmationStatus: isConfirmed ? "confirmed" : "pending",
      mode: "real-testnet",
      source: "blockchain-rpc",
      blockTime,
      createdAt: blockTime ? new Date(blockTime * 1000) : null,
    });
  }

  return results;
}

async function syncBitcoinTestnetActivity(uid, bitcoinAddress) {
  if (!isValidBitcoinTestnetAddress(bitcoinAddress)) {
    return skippedResult("Dirección Bitcoin Testnet no disponible, se omitió la sincronización.");
  }

  const transactions = await getBitcoinTestnetOnChainActivity(bitcoinAddress, BITCOIN_TX_LIMIT);
  let createdCount = 0;

  for (const transaction of transactions) {
    const createdId = await createSynced(uid, transaction);

    if (createdId) {
      createdCount += 1;
    }
  }

  return successResult(createdCount);
}

export async function syncWalletActivity(uid, wallet) {
  if (!uid || !wallet) {
    return {
      createdCount: 0,
      errors: [],
      skipped: [],
      successful: [],
      hasOnlyFailures: false,
      hasPartialFailures: false,
      message: "No hay movimientos recientes.",
    };
  }

  const jobs = [];

  if (wallet.solanaAddress) {
    jobs.push({ network: "solana", asset: "SOL", run: () => syncSolanaNativeActivity(uid, wallet.solanaAddress) });
    jobs.push({ network: "solana", asset: "SPL", run: () => syncSolanaSplDemoActivity(uid, wallet.solanaAddress) });
  }

  if (wallet.bnbAddress) {
    jobs.push({ network: "bnb", asset: "tBNB", run: () => syncBnbNativeActivity(uid, wallet.bnbAddress) });
    jobs.push({ network: "bnb", asset: "BEP20", run: () => syncBep20DemoActivity(uid, wallet.bnbAddress) });
  }

  if (wallet.bitcoinAddress) {
    jobs.push({ network: "bitcoin", asset: "BTC", run: () => syncBitcoinTestnetActivity(uid, wallet.bitcoinAddress) });
  }

  const results = await Promise.all(jobs.map((job) => runActivityJob(job)));
  const successful = results.filter((result) => result.status === "success");
  const skipped = results.filter((result) => result.status === "skipped");
  const errors = results.filter((result) => result.status === "error");
  const createdCount = successful.reduce((total, result) => total + result.createdCount, 0);
  const hasOnlyFailures = errors.length > 0 && successful.length === 0;
  const hasPartialFailures = errors.length > 0 && successful.length > 0;
  const skippedMessage = skipped.find((result) => result.asset === "tBNB")?.message || skipped[0]?.message || "";
  const errorMessage = errors.find((result) => result.network === "bitcoin")?.message || errors[0]?.message || "";
  const message = hasOnlyFailures
    ? errorMessage || "No se pudo actualizar actividad en este momento."
    : hasPartialFailures
      ? `Actividad actualizada parcialmente. ${errorMessage || "Algunas redes no respondieron."}`
      : createdCount > 0
        ? "Actividad actualizada."
        : skippedMessage || "No hay movimientos recientes.";

  return {
    createdCount,
    errors,
    skipped,
    successful,
    hasOnlyFailures,
    hasPartialFailures,
    message,
  };
}
