/**
 * Archivo: bnb.service.js
 * Propósito: Integra NovaWallet con BNB Smart Chain Testnet para tBNB nativo.
 * Funcionalidades:
 * - Valida RPC y chainId 97.
 * - Consulta balances y estima gas.
 * - Firma localmente transacciones tBNB antes de enviarlas al RPC.
 */
import {
  formatEther,
  HDNodeWallet,
  isAddress,
  JsonRpcProvider,
  parseEther,
} from "ethers";
import { NETWORKS } from "../../constants/networks";
import { awaitBroadcastConfirmation, createBroadcastUnconfirmedError } from "./broadcast-confirmation";

export const BNB_TESTNET_CHAIN_ID = 97;
export const BNB_TESTNET_EXPLORER_URL = "https://testnet.bscscan.com/tx/";
export const BNB_TESTNET_RPC_URL = import.meta.env.VITE_BNB_TESTNET_RPC_URL || "";

let cachedProvider = null;

export function getBnbProvider() {
  if (!BNB_TESTNET_RPC_URL) {
    throw new Error("bnb-rpc-not-configured");
  }

  if (!cachedProvider) {
    cachedProvider = new JsonRpcProvider(BNB_TESTNET_RPC_URL);
  }

  return cachedProvider;
}

export async function assertBnbTestnetProvider(provider) {
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== BNB_TESTNET_CHAIN_ID) {
    throw new Error("bnb-invalid-chain");
  }
}

function assertValidBnbAddress(address, errorCode = "invalid-bnb-address") {
  if (!isAddress(address)) {
    throw new Error(errorCode);
  }
}

export function buildBnbExplorerUrl(txHash) {
  return `${BNB_TESTNET_EXPLORER_URL}${txHash}`;
}

/**
 * Espera el recibo de una transacción ya transmitida.
 * Un revert (CALL_EXCEPTION o status 0) es un rechazo definitivo; un timeout o fallo del RPC
 * se reporta como broadcast-unconfirmed para no habilitar un reenvío duplicado.
 */
export async function waitForBnbReceipt(tx) {
  const receipt = await awaitBroadcastConfirmation(tx.wait(1), {
    txHash: tx.hash,
    explorerUrl: buildBnbExplorerUrl(tx.hash),
    timeoutMs: 45000,
    isDefinitiveFailure: (error) => error?.code === "CALL_EXCEPTION",
  });

  if (!receipt) {
    throw createBroadcastUnconfirmedError({
      txHash: tx.hash,
      explorerUrl: buildBnbExplorerUrl(tx.hash),
    });
  }

  if (receipt.status !== 1) {
    throw new Error("transaction-rejected");
  }

  return receipt;
}

async function getGasPrice(provider) {
  const feeData = await provider.getFeeData();

  if (!feeData.gasPrice) {
    throw new Error("bnb-gas-price-unavailable");
  }

  return feeData.gasPrice;
}

async function estimateBnbTransferCost({ provider, fromAddress, toAddress, amountWei }) {
  const gasLimit = await provider.estimateGas({
    from: fromAddress,
    to: toAddress,
    value: amountWei,
  });
  const gasPrice = await getGasPrice(provider);
  const networkFeeWei = gasLimit * gasPrice;

  return {
    gasLimit,
    gasPrice,
    networkFeeWei,
  };
}

/**
 * Deriva la wallet EVM para BNB Testnet desde la misma frase semilla.
 * La clave derivada solo se usa en memoria durante consultas de firma.
 */
export function deriveBnbWallet(mnemonic) {
  const wallet = HDNodeWallet.fromPhrase(
    mnemonic,
    undefined,
    NETWORKS.bnb.derivationPath,
  );

  return {
    address: wallet.address,
    derivationPath: NETWORKS.bnb.derivationPath,
  };
}

export function parseBnbAmountToWei(amount) {
  try {
    const wei = parseEther(String(amount).trim());

    if (wei <= 0n) {
      throw new Error("invalid-bnb-amount");
    }

    return wei;
  } catch {
    throw new Error("invalid-bnb-amount");
  }
}

export function weiToBnbNumber(wei) {
  return Number(formatEther(wei));
}

export function isValidBnbAddress(address) {
  return isAddress(address);
}

export async function getBnbBalance(address) {
  assertValidBnbAddress(address);

  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  const balanceWei = await provider.getBalance(address);

  return {
    network: "bnb",
    chainId: BNB_TESTNET_CHAIN_ID,
    rpcUrl: BNB_TESTNET_RPC_URL,
    symbol: "tBNB",
    balance: weiToBnbNumber(balanceWei),
    balanceWei: balanceWei.toString(),
    source: "blockchain-real",
  };
}

export async function estimateBnbTransferFee({ fromAddress, toAddress, amountWei }) {
  assertValidBnbAddress(fromAddress);
  assertValidBnbAddress(toAddress);

  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  const { gasLimit, gasPrice, networkFeeWei } = await estimateBnbTransferCost({
    provider,
    fromAddress,
    toAddress,
    amountWei,
  });

  return {
    gasLimit,
    gasPrice,
    networkFeeWei,
    networkFee: weiToBnbNumber(networkFeeWei),
  };
}

/**
 * Envía tBNB en BNB Smart Chain Testnet.
 * La firma se realiza localmente y el RPC solo recibe la transacción firmada.
 */
export async function sendSignedBnbTransfer({ mnemonic, expectedFromAddress, toAddress, amountWei }) {
  assertValidBnbAddress(expectedFromAddress);
  assertValidBnbAddress(toAddress);

  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  const wallet = HDNodeWallet.fromPhrase(
    mnemonic,
    undefined,
    NETWORKS.bnb.derivationPath,
  ).connect(provider);

  if (wallet.address.toLowerCase() !== expectedFromAddress.toLowerCase()) {
    throw new Error("bnb-wallet-mismatch");
  }

  const { gasLimit, gasPrice, networkFeeWei } = await estimateBnbTransferCost({
    provider,
    fromAddress: wallet.address,
    toAddress,
    amountWei,
  });
  const balanceWei = await provider.getBalance(wallet.address);

  if (amountWei + networkFeeWei > balanceWei) {
    throw new Error("insufficient-funds");
  }

  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: amountWei,
    gasLimit,
    gasPrice,
  });
  const receipt = await waitForBnbReceipt(tx);

  const receiptGasPrice = receipt.gasPrice || tx.gasPrice || gasPrice;
  const gasUsed = receipt.gasUsed;
  const actualNetworkFeeWei = gasUsed * receiptGasPrice;

  return {
    txHash: tx.hash,
    explorerUrl: buildBnbExplorerUrl(tx.hash),
    chainId: BNB_TESTNET_CHAIN_ID,
    gasUsed: gasUsed.toString(),
    gasPrice: receiptGasPrice.toString(),
    networkFeeWei: actualNetworkFeeWei.toString(),
    networkFee: weiToBnbNumber(actualNetworkFeeWei),
    confirmationStatus: "confirmed",
    blockNumber: receipt.blockNumber ?? null,
  };
}
