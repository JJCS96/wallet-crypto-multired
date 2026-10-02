/**
 * Archivo: fee.service.js
 * Propósito: Centraliza cálculos de comisiones y conversiones de unidades para envíos.
 * Funcionalidades:
 * - Calcula comisión de aplicación y fee de red estimado.
 * - Convierte SOL a lamports con precisión entera.
 * - Evita comparar montos en unidades incompatibles.
 */
import { APP_COMMISSION_RATE } from "../../config/economic-model";

export const LAMPORTS_PER_SOL_INT = 1_000_000_000n;
const COMMISSION_RATE_DENOMINATOR = 10_000n;
const APP_COMMISSION_BASIS_POINTS = BigInt(Math.round(APP_COMMISSION_RATE * Number(COMMISSION_RATE_DENOMINATOR)));

const NETWORK_FEES = {
  solana: 0.000005,
  bitcoin: 0.00001,
  bnb: 0.000105,
};

export function getNetworkFee(networkId) {
  return NETWORK_FEES[networkId] || 0;
}

export function calculateTransactionFees(networkId, amount, options = {}) {
  const normalizedAmount = Number(amount);
  const networkFee = options.networkFee ?? getNetworkFee(networkId);
  const appFee = normalizedAmount * APP_COMMISSION_RATE;
  const totalDebit = normalizedAmount + networkFee + appFee;

  return {
    networkFee,
    appFee,
    totalDebit,
    appFeeRate: APP_COMMISSION_RATE,
  };
}

export function parseSolToLamports(value) {
  // Convierte SOL a lamports usando BigInt para validar saldo sin errores de punto flotante.
  const normalizedValue = String(value).trim();

  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) {
    throw new Error("invalid-sol-amount");
  }

  const [wholePart, decimalPart = ""] = normalizedValue.split(".");

  if (decimalPart.length > 9) {
    throw new Error("invalid-sol-amount");
  }

  const wholeLamports = BigInt(wholePart) * LAMPORTS_PER_SOL_INT;
  const decimalLamports = BigInt(decimalPart.padEnd(9, "0") || "0");
  const lamports = wholeLamports + decimalLamports;

  if (lamports <= 0n) {
    throw new Error("invalid-sol-amount");
  }

  return lamports;
}

export function lamportsToSolNumber(lamports) {
  return Number(lamports) / Number(LAMPORTS_PER_SOL_INT);
}

export function calculateSolanaFeesFromLamports(amountLamports, networkFeeLamports = 0n) {
  const appFeeLamports = (amountLamports * APP_COMMISSION_BASIS_POINTS + COMMISSION_RATE_DENOMINATOR - 1n) / COMMISSION_RATE_DENOMINATOR;
  const totalDebitLamports = amountLamports + networkFeeLamports + appFeeLamports;

  return {
    networkFeeLamports,
    appFeeLamports,
    totalDebitLamports,
    networkFee: lamportsToSolNumber(networkFeeLamports),
    appFee: lamportsToSolNumber(appFeeLamports),
    totalDebit: lamportsToSolNumber(totalDebitLamports),
    appFeeRate: APP_COMMISSION_RATE,
  };
}
