/**
 * Archivo: bitcoin.service.js
 * Propósito: Integra NovaWallet con Bitcoin Testnet para BTC nativo.
 * Funcionalidades:
 * - Deriva direcciones testnet y valida formato tb1.
 * - Consulta UTXOs y fee rate desde API pública testnet.
 * - Construye, firma y transmite PSBTs sin tocar mainnet ni fondos reales.
 */
import { Buffer } from "buffer";
import { HDNodeWallet, SigningKey } from "ethers";
import { networks, payments, Psbt } from "bitcoinjs-lib";
import { NETWORKS } from "../../constants/networks";
import { createBroadcastUnconfirmedError } from "./broadcast-confirmation";

const SATOSHIS_PER_BTC = 100_000_000;
const BITCOIN_TESTNET_API_URL = (import.meta.env.VITE_BITCOIN_TESTNET_API_URL || "https://mempool.space/testnet/api").replace(/\/$/, "");
const BITCOIN_TESTNET_DUST_SATOSHIS = 546n;
const P2WPKH_INPUT_VBYTES = 68n;
const P2WPKH_OUTPUT_VBYTES = 31n;
const TX_OVERHEAD_VBYTES = 10n;

function hexToBuffer(hex) {
  return Buffer.from(hex.replace(/^0x/, ""), "hex");
}

function satoshisToBtcNumber(satoshis) {
  return Number(satoshis) / SATOSHIS_PER_BTC;
}

function buildBitcoinTestnetTxExplorerUrl(txid) {
  return `${NETWORKS.bitcoin.explorerTxBaseUrl}${txid}`;
}

function getBitcoinSigningWallet(mnemonic) {
  const wallet = HDNodeWallet.fromPhrase(
    mnemonic,
    undefined,
    NETWORKS.bitcoin.derivationPath,
  );
  const publicKey = Buffer.from(SigningKey.computePublicKey(wallet.privateKey, true).replace(/^0x/, ""), "hex");
  const signingKey = new SigningKey(wallet.privateKey);
  const payment = payments.p2wpkh({
    pubkey: publicKey,
    network: networks.testnet,
  });

  if (!payment.address || !payment.output) {
    throw new Error("bitcoin-wallet-derivation-failed");
  }

  return {
    address: payment.address,
    derivationPath: NETWORKS.bitcoin.derivationPath,
    publicKey,
    signingKey,
    payment,
  };
}

function assertValidBitcoinTestnetAddress(address) {
  if (!isValidBitcoinTestnetAddress(address)) {
    throw new Error("invalid-bitcoin-testnet-address");
  }
}

function estimateP2wpkhVsize(inputCount, outputCount) {
  return TX_OVERHEAD_VBYTES
    + (BigInt(inputCount) * P2WPKH_INPUT_VBYTES)
    + (BigInt(outputCount) * P2WPKH_OUTPUT_VBYTES);
}

function estimateFeeSatoshis(inputCount, outputCount, feeRate) {
  return estimateP2wpkhVsize(inputCount, outputCount) * BigInt(feeRate);
}

/**
 * Selecciona UTXOs suficientes para cubrir monto, comisión y posible cambio.
 * Evita crear salidas dust que la red podría rechazar.
 */
function selectBitcoinUtxos({ utxos, amountSatoshis, feeRate }) {
  if (amountSatoshis < BITCOIN_TESTNET_DUST_SATOSHIS) {
    throw new Error("bitcoin-amount-below-dust");
  }

  const selected = [];
  let selectedValue = 0n;
  let hasDustChangeCandidate = false;
  const sortedUtxos = [...utxos].sort((left, right) => {
    const leftValue = BigInt(left.value);
    const rightValue = BigInt(right.value);

    if (rightValue > leftValue) {
      return 1;
    }

    if (rightValue < leftValue) {
      return -1;
    }

    return 0;
  });

  for (const utxo of sortedUtxos) {
    selected.push(utxo);
    selectedValue += BigInt(utxo.value);

    const feeWithChange = estimateFeeSatoshis(selected.length, 2, feeRate);
    const changeWithChange = selectedValue - amountSatoshis - feeWithChange;

    if (changeWithChange >= BITCOIN_TESTNET_DUST_SATOSHIS) {
      return {
        selectedUtxos: selected,
        inputSatoshis: selectedValue,
        feeSatoshis: feeWithChange,
        changeSatoshis: changeWithChange,
        outputCount: 2,
        vsize: estimateP2wpkhVsize(selected.length, 2),
      };
    }

    const feeWithoutChange = estimateFeeSatoshis(selected.length, 1, feeRate);
    const remainderWithoutChange = selectedValue - amountSatoshis - feeWithoutChange;

    if (remainderWithoutChange === 0n) {
      return {
        selectedUtxos: selected,
        inputSatoshis: selectedValue,
        feeSatoshis: feeWithoutChange,
        changeSatoshis: 0n,
        outputCount: 1,
        vsize: estimateP2wpkhVsize(selected.length, 1),
      };
    }

    if (remainderWithoutChange > 0n && remainderWithoutChange < BITCOIN_TESTNET_DUST_SATOSHIS) {
      hasDustChangeCandidate = true;
    }
  }

  if (hasDustChangeCandidate) {
    throw new Error("bitcoin-change-below-dust");
  }

  throw new Error("insufficient-funds");
}

async function fetchBitcoinJson(path, errorCode) {
  const response = await fetch(`${BITCOIN_TESTNET_API_URL}${path}`);

  if (!response.ok) {
    throw new Error(errorCode);
  }

  return response.json();
}

export function buildBitcoinTestnetAddressExplorerUrl(address) {
  return `${NETWORKS.bitcoin.explorerAddressBaseUrl}${address}`;
}

export function isValidBitcoinTestnetAddress(address) {
  return /^tb1[a-z0-9]{11,71}$/.test(address.trim());
}

export function parseBtcAmountToSatoshis(value) {
  const normalizedValue = String(value).trim();

  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) {
    throw new Error("invalid-bitcoin-amount");
  }

  const [wholePart, decimalPart = ""] = normalizedValue.split(".");

  if (decimalPart.length > 8) {
    throw new Error("invalid-bitcoin-amount");
  }

  const satoshis = (BigInt(wholePart) * BigInt(SATOSHIS_PER_BTC)) + BigInt(decimalPart.padEnd(8, "0") || "0");

  if (satoshis <= 0n) {
    throw new Error("invalid-bitcoin-amount");
  }

  return satoshis;
}

export function deriveBitcoinWallet(mnemonic) {
  const wallet = getBitcoinSigningWallet(mnemonic);

  return {
    address: wallet.address,
    derivationPath: wallet.derivationPath,
    network: "bitcoin-testnet",
    implementationNote: "Direccion nativa SegWit Testnet derivada localmente desde la misma seed phrase.",
  };
}

export async function getBitcoinTestnetBalance(address) {
  assertValidBitcoinTestnetAddress(address);

  const data = await fetchBitcoinJson(`/address/${address}`, "bitcoin-testnet-balance-unavailable");
  const fundedSatoshis = BigInt(data?.chain_stats?.funded_txo_sum || 0);
  const spentSatoshis = BigInt(data?.chain_stats?.spent_txo_sum || 0);
  const mempoolFundedSatoshis = BigInt(data?.mempool_stats?.funded_txo_sum || 0);
  const mempoolSpentSatoshis = BigInt(data?.mempool_stats?.spent_txo_sum || 0);
  const balanceSatoshis = fundedSatoshis - spentSatoshis + mempoolFundedSatoshis - mempoolSpentSatoshis;

  return {
    network: "bitcoin",
    cluster: "testnet",
    symbol: "BTC",
    balance: satoshisToBtcNumber(balanceSatoshis),
    balanceSatoshis: Number(balanceSatoshis),
    source: "blockchain-real",
    explorerUrl: buildBitcoinTestnetAddressExplorerUrl(address),
  };
}

export async function getBitcoinTestnetUtxos(address) {
  assertValidBitcoinTestnetAddress(address);

  const utxos = await fetchBitcoinJson(`/address/${address}/utxo`, "bitcoin-testnet-utxo-unavailable");

  return utxos.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout,
    value: Number(utxo.value),
    status: utxo.status,
  }));
}

export async function getBitcoinTestnetFeeRate() {
  try {
    const fees = await fetchBitcoinJson("/v1/fees/recommended", "bitcoin-testnet-fee-unavailable");
    return Math.max(1, Math.ceil(Number(fees?.halfHourFee || fees?.fastestFee || fees?.economyFee || 1)));
  } catch {
    return 1;
  }
}

export async function estimateBitcoinTestnetTransfer({ fromAddress, toAddress, amountSatoshis }) {
  assertValidBitcoinTestnetAddress(fromAddress);
  assertValidBitcoinTestnetAddress(toAddress);

  const [utxos, feeRate] = await Promise.all([
    getBitcoinTestnetUtxos(fromAddress),
    getBitcoinTestnetFeeRate(),
  ]);
  const spendableUtxos = utxos.filter((utxo) => Number(utxo.value) > 0);
  const selection = selectBitcoinUtxos({
    utxos: spendableUtxos,
    amountSatoshis,
    feeRate,
  });

  return {
    ...selection,
    feeRate,
    networkFee: satoshisToBtcNumber(selection.feeSatoshis),
    amount: satoshisToBtcNumber(amountSatoshis),
    totalDebit: satoshisToBtcNumber(amountSatoshis + selection.feeSatoshis),
  };
}

/**
 * Construye y firma una transacción BTC Testnet.
 * Solo se publica el hex firmado; la frase y la clave privada permanecen locales.
 */
export async function sendSignedBitcoinTestnetTransfer({ mnemonic, expectedFromAddress, toAddress, amountSatoshis }) {
  assertValidBitcoinTestnetAddress(expectedFromAddress);
  assertValidBitcoinTestnetAddress(toAddress);

  const wallet = getBitcoinSigningWallet(mnemonic);

  if (wallet.address !== expectedFromAddress) {
    throw new Error("bitcoin-wallet-mismatch");
  }

  const estimate = await estimateBitcoinTestnetTransfer({
    fromAddress: wallet.address,
    toAddress,
    amountSatoshis,
  });
  const psbt = new Psbt({ network: networks.testnet });

  estimate.selectedUtxos.forEach((utxo) => {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: wallet.payment.output,
        value: BigInt(utxo.value),
      },
    });
  });

  psbt.addOutput({
    address: toAddress,
    value: amountSatoshis,
  });

  if (estimate.changeSatoshis >= BITCOIN_TESTNET_DUST_SATOSHIS) {
    psbt.addOutput({
      address: wallet.address,
      value: estimate.changeSatoshis,
    });
  }

  const signer = {
    publicKey: wallet.publicKey,
    sign: (hash) => {
      const signature = wallet.signingKey.sign(hash);
      return Buffer.concat([hexToBuffer(signature.r), hexToBuffer(signature.s)]);
    },
  };

  psbt.signAllInputs(signer);
  psbt.finalizeAllInputs();

  const signedTransaction = psbt.extractTransaction();
  const rawTx = signedTransaction.toHex();
  // El txid se calcula localmente para poder rastrear el envío aunque la respuesta del broadcast se pierda.
  const localTxid = signedTransaction.getId();
  let response;

  try {
    response = await fetch(`${BITCOIN_TESTNET_API_URL}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: rawTx,
    });
  } catch {
    throw createBroadcastUnconfirmedError({
      txHash: localTxid,
      explorerUrl: buildBitcoinTestnetTxExplorerUrl(localTxid),
    });
  }

  if (!response.ok) {
    throw new Error("bitcoin-broadcast-failed");
  }

  const txid = (await response.text().catch(() => "")).trim() || localTxid;

  return {
    txHash: txid,
    explorerUrl: buildBitcoinTestnetTxExplorerUrl(txid),
    feeRate: estimate.feeRate,
    networkFee: estimate.networkFee,
    networkFeeSatoshis: estimate.feeSatoshis.toString(),
    changeSatoshis: estimate.changeSatoshis.toString(),
    vsize: estimate.vsize.toString(),
    confirmationStatus: "broadcast",
  };
}
