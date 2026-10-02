/**
 * Archivo: admin-wallets.js
 * Propósito: Declara direcciones administrativas públicas usadas para comisiones de la app.
 * Funcionalidades:
 * - Lee wallets desde variables Vite.
 * - Mantiene placeholders seguros cuando falta configuración.
 * - No almacena claves privadas ni secretos.
 */
export const ADMIN_WALLETS = {
  solana: import.meta.env.VITE_ADMIN_WALLET_SOLANA || "ADMIN_WALLET_SOLANA_PENDING",
  bitcoin: import.meta.env.VITE_ADMIN_WALLET_BTC || "ADMIN_WALLET_BTC_TESTNET_PENDING",
  bnb: import.meta.env.VITE_ADMIN_WALLET_BNB || "ADMIN_WALLET_BNB_PENDING",
};
