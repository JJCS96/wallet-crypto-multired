import { getMockBalanceByNetwork } from "./mock-balance.service";
import { getBitcoinTestnetBalance } from "./bitcoin.service";
import { getBep20DemoBalance } from "./bep20.service";
import { getBnbBalance } from "./bnb.service";
import { getSolanaBalance } from "./solana-rpc.service";
import { getSplDemoTokenBalance } from "./solana-token.service";
import { ASSET_IDS } from "../../config/assets";
import { isBitcoinMainnetAddress } from "../../utils/address-validation";

function getWalletAddressForNetwork(wallet, networkId) {
  if (networkId === "solana") {
    return wallet?.solanaAddress || "";
  }

  if (networkId === "bitcoin") {
    return wallet?.bitcoinAddress || "";
  }

  if (networkId === "bnb") {
    return wallet?.bnbAddress || "";
  }

  return "";
}

export async function getBalanceByNetwork(networkId, wallet, assetId = null) {
  if (networkId === "solana") {
    const address = getWalletAddressForNetwork(wallet, networkId);

    if (!address) {
      return {
        network: networkId,
        symbol: "SOL",
        balance: null,
        source: "missing-wallet",
        error: "La wallet no tiene una direccion publica de Solana disponible.",
      };
    }

    try {
      if (assetId === ASSET_IDS.solanaSplDemo) {
        return await getSplDemoTokenBalance(address);
      }

      return await getSolanaBalance(address);
    } catch (error) {
      return {
        network: networkId,
        symbol: assetId === ASSET_IDS.solanaSplDemo ? "USDT-DEMO" : "SOL",
        balance: null,
        source: error?.message === "spl-token-not-configured" ? "missing-token-config" : "rpc-error",
        error: error?.message === "spl-token-not-configured"
          ? "Token demo no configurado"
          : "No se pudo consultar el balance real de Solana Devnet en este momento.",
      };
    }
  }

  if (networkId === "bnb") {
    const address = getWalletAddressForNetwork(wallet, networkId);

    if (!address) {
      return {
        network: networkId,
        symbol: "tBNB",
        balance: null,
        source: "missing-wallet",
        error: "La wallet no tiene una direccion publica de BNB disponible.",
      };
    }

    try {
      if (assetId === ASSET_IDS.bnbBep20Demo) {
        return await getBep20DemoBalance(address);
      }

      return await getBnbBalance(address);
    } catch (error) {
      return {
        network: networkId,
        symbol: assetId === ASSET_IDS.bnbBep20Demo ? "USDT-DEMO" : "tBNB",
        balance: null,
        source: error?.message === "bep20-token-not-configured"
          ? "missing-token-config"
          : error?.message === "bnb-rpc-not-configured" ? "missing-rpc" : "rpc-error",
        error: error?.message === "bep20-token-not-configured"
          ? "Token demo no configurado"
          : error?.message === "bep20-contract-not-found"
            ? "El contrato BEP20 demo no existe en BNB Smart Chain Testnet."
          : error?.message === "bnb-rpc-not-configured"
          ? "Configura VITE_BNB_TESTNET_RPC_URL para consultar BNB Smart Chain Testnet."
          : error?.message === "bnb-invalid-chain"
            ? "El RPC configurado para BNB no apunta a BNB Smart Chain Testnet (chainId 97)."
          : "No se pudo consultar el balance real de BNB Smart Chain Testnet en este momento.",
      };
    }
  }

  if (networkId === "bitcoin") {
    const address = getWalletAddressForNetwork(wallet, networkId);

    if (!address) {
      return {
        network: networkId,
        symbol: "BTC",
        balance: null,
        source: "missing-wallet",
        error: "La wallet no tiene una direccion publica de Bitcoin Testnet disponible.",
      };
    }

    try {
      return await getBitcoinTestnetBalance(address);
    } catch (error) {
      return {
        network: networkId,
        symbol: "BTC",
        balance: null,
        source: error?.message === "invalid-bitcoin-testnet-address" ? "invalid-address" : "rpc-error",
        error: error?.message === "invalid-bitcoin-testnet-address" && isBitcoinMainnetAddress(address)
          ? "La dirección Bitcoin guardada pertenece a mainnet. Restaura tu wallet para actualizarla a Bitcoin Testnet tb1."
          : "Balance no disponible",
      };
    }
  }

  return getMockBalanceByNetwork(networkId);
}
