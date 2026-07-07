import { getAssociatedTokenAddress } from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { formatEther, formatUnits, id, Interface, zeroPadValue } from "ethers";
import { ASSETS, ASSET_IDS } from "../../config/assets";
import { NETWORKS } from "../../constants/networks";
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
  return `${NETWORKS.bitcoin.explorerTxBaseUrl}${txid}`;
}

async function fetchBitcoinJson(path) {
  const response = await fetch(`${BITCOIN_TESTNET_API_URL}${path}`);

  if (!response.ok) {
    throw new Error("bitcoin-activity-unavailable");
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

  const connection = getSolanaConnection();
  const publicKey = new PublicKey(solanaAddress);
  const signatures = await connection.getSignaturesForAddress(publicKey, {
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

    let netLamports = 0n;
    let fromAddress = "No disponible";
    let toAddress = "No disponible";

    for (const instruction of parsedTransaction.transaction.message.instructions) {
      if (instruction.program !== "system" || instruction.parsed?.type !== "transfer") {
        continue;
      }

      const info = instruction.parsed.info;
      const lamports = BigInt(info.lamports || 0);

      if (info.destination === solanaAddress) {
        netLamports += lamports;
        fromAddress = info.source || fromAddress;
        toAddress = solanaAddress;
      }

      if (info.source === solanaAddress) {
        netLamports -= lamports;
        fromAddress = solanaAddress;
        toAddress = info.destination || toAddress;
      }
    }

    if (netLamports === 0n) {
      continue;
    }

    const direction = netLamports > 0n ? "incoming" : "outgoing";
    const createdId = await createSynced(uid, {
      network: "solana",
      assetType: "native",
      direction,
      fromAddress,
      toAddress,
      amount: Number(netLamports > 0n ? netLamports : -netLamports) / LAMPORTS_PER_SOL,
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

async function syncSolanaSplDemoActivity(uid, solanaAddress) {
  const asset = ASSETS[ASSET_IDS.solanaSplDemo];

  if (!asset.configured || !isValidSolanaPublicKey(asset.tokenMint)) {
    return skippedResult("Token demo no configurado, se omitió la sincronización SPL.");
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
    return skippedResult("Token demo no configurado, se omitió la sincronización BEP20.");
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

async function syncBitcoinTestnetActivity(uid, bitcoinAddress) {
  if (!isValidBitcoinTestnetAddress(bitcoinAddress)) {
    return skippedResult("Dirección Bitcoin Testnet no disponible, se omitió la sincronización.");
  }

  const transactions = await fetchBitcoinJson(`/address/${bitcoinAddress}/txs`);
  let createdCount = 0;

  for (const transaction of transactions.slice(0, BITCOIN_TX_LIMIT)) {
    const receivedSatoshis = transaction.vout.reduce((total, output) => (
      output.scriptpubkey_address === bitcoinAddress ? total + BigInt(output.value || 0) : total
    ), 0n);
    const sentSatoshis = transaction.vin.reduce((total, input) => (
      input.prevout?.scriptpubkey_address === bitcoinAddress ? total + BigInt(input.prevout.value || 0) : total
    ), 0n);
    const netSatoshis = receivedSatoshis - sentSatoshis;

    if (netSatoshis === 0n) {
      continue;
    }

    const feeSatoshis = BigInt(transaction.fee || 0);
    const direction = netSatoshis > 0n ? "incoming" : "outgoing";
    const outgoingAmountSatoshis = sentSatoshis > receivedSatoshis
      ? sentSatoshis - receivedSatoshis - feeSatoshis
      : 0n;
    const amountSatoshis = direction === "incoming"
      ? netSatoshis
      : outgoingAmountSatoshis > 0n ? outgoingAmountSatoshis : -netSatoshis;
    const fromAddress = direction === "incoming"
      ? transaction.vin.find((input) => input.prevout?.scriptpubkey_address !== bitcoinAddress)?.prevout?.scriptpubkey_address || "No disponible"
      : bitcoinAddress;
    const toAddress = direction === "incoming"
      ? bitcoinAddress
      : transaction.vout.find((output) => output.scriptpubkey_address && output.scriptpubkey_address !== bitcoinAddress)?.scriptpubkey_address || "No disponible";
    const createdId = await createSynced(uid, {
      network: "bitcoin",
      assetType: "native",
      direction,
      fromAddress,
      toAddress,
      amount: satoshisToBtcNumber(amountSatoshis),
      networkFee: direction === "outgoing" ? satoshisToBtcNumber(feeSatoshis) : 0,
      txHash: transaction.txid,
      explorerUrl: buildBitcoinTxExplorerUrl(transaction.txid),
      status: "success",
      confirmationStatus: transaction.status?.confirmed ? "confirmed" : "broadcast",
      mode: "real-testnet",
    });

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
  const message = hasOnlyFailures
    ? "No se pudo actualizar actividad en este momento."
    : hasPartialFailures
      ? "Actividad actualizada parcialmente. Algunas redes no respondieron."
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
