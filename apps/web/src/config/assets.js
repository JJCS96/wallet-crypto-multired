export const ASSET_IDS = {
  solanaNative: "solana-native",
  solanaSplDemo: "solana-spl-demo",
  bnbNative: "bnb-native",
  bnbBep20Demo: "bnb-bep20-demo",
  bitcoinNative: "bitcoin-native",
};

function readIntegerEnv(value, fallback) {
  const parsedValue = Number.parseInt(value || "", 10);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

const solanaSplMint = import.meta.env.VITE_SOLANA_SPL_DEMO_MINT || "";
const bnbBep20Contract = import.meta.env.VITE_BNB_BEP20_DEMO_CONTRACT || "";

export const ASSETS = {
  [ASSET_IDS.solanaNative]: {
    id: ASSET_IDS.solanaNative,
    network: "solana",
    assetType: "native",
    tokenStandard: null,
    name: "Solana Devnet",
    symbol: "SOL",
    decimals: 9,
    configured: true,
  },
  [ASSET_IDS.solanaSplDemo]: {
    id: ASSET_IDS.solanaSplDemo,
    network: "solana",
    assetType: "token",
    tokenStandard: "SPL",
    name: "SPL Demo Token",
    symbol: import.meta.env.VITE_SOLANA_SPL_DEMO_SYMBOL || "USDT-DEMO",
    decimals: readIntegerEnv(import.meta.env.VITE_SOLANA_SPL_DEMO_DECIMALS, 6),
    tokenMint: solanaSplMint,
    configured: Boolean(solanaSplMint),
  },
  [ASSET_IDS.bnbNative]: {
    id: ASSET_IDS.bnbNative,
    network: "bnb",
    assetType: "native",
    tokenStandard: null,
    name: "BNB Smart Chain Testnet",
    symbol: "tBNB",
    decimals: 18,
    configured: true,
  },
  [ASSET_IDS.bnbBep20Demo]: {
    id: ASSET_IDS.bnbBep20Demo,
    network: "bnb",
    assetType: "token",
    tokenStandard: "BEP20",
    name: "BEP20 Demo Token",
    symbol: import.meta.env.VITE_BNB_BEP20_DEMO_SYMBOL || "USDT-DEMO",
    decimals: readIntegerEnv(import.meta.env.VITE_BNB_BEP20_DEMO_DECIMALS, 18),
    tokenAddress: bnbBep20Contract,
    configured: Boolean(bnbBep20Contract),
  },
  [ASSET_IDS.bitcoinNative]: {
    id: ASSET_IDS.bitcoinNative,
    network: "bitcoin",
    assetType: "native",
    tokenStandard: null,
    name: "Bitcoin Testnet",
    symbol: "BTC",
    decimals: 8,
    configured: true,
  },
};

export function getAssetById(assetId) {
  return ASSETS[assetId] || ASSETS[ASSET_IDS.solanaNative];
}

export function getDefaultAssetIdForNetwork(networkId) {
  if (networkId === "bnb") {
    return ASSET_IDS.bnbNative;
  }

  if (networkId === "bitcoin") {
    return ASSET_IDS.bitcoinNative;
  }

  return ASSET_IDS.solanaNative;
}

export function getAssetsForNetwork(networkId) {
  return Object.values(ASSETS).filter((asset) => asset.network === networkId);
}
