const COINGECKO_SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price";
const PRICE_CACHE_KEY = "novawallet:native-asset-prices-usd";
const PRICE_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_PRICE_TIMEOUT_MS = 5000;
const PRICE_CACHE_VERSION = 1;

const PRICE_IDS = {
  solana: "solana",
  bnb: "binancecoin",
  bitcoin: "bitcoin",
};

function isStorageAvailable() {
  return typeof globalThis.localStorage !== "undefined";
}

function assertUsdPrice(value, assetName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${assetName}-price-unavailable`);
  }

  return value;
}

function hasValidPriceShape(prices) {
  return (
    typeof prices?.solana === "number"
    && typeof prices?.bnb === "number"
    && typeof prices?.bitcoin === "number"
    && Number.isFinite(prices.solana)
    && Number.isFinite(prices.bnb)
    && Number.isFinite(prices.bitcoin)
  );
}

export function readCachedNativeAssetPricesUsd({ allowExpired = true } = {}) {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const rawValue = globalThis.localStorage.getItem(PRICE_CACHE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (parsedValue?.version !== PRICE_CACHE_VERSION || !hasValidPriceShape(parsedValue?.prices)) {
      return null;
    }

    const updatedAtMs = Date.parse(parsedValue.updatedAt);
    const ageMs = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs : Number.POSITIVE_INFINITY;
    const isExpired = ageMs > PRICE_CACHE_TTL_MS;

    if (isExpired && !allowExpired) {
      return null;
    }

    return {
      prices: parsedValue.prices,
      updatedAt: parsedValue.updatedAt,
      stale: isExpired,
    };
  } catch {
    return null;
  }
}

function writeCachedNativeAssetPricesUsd(prices) {
  if (!isStorageAvailable() || !hasValidPriceShape(prices)) {
    return;
  }

  try {
    globalThis.localStorage.setItem(
      PRICE_CACHE_KEY,
      JSON.stringify({
        version: PRICE_CACHE_VERSION,
        prices,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Price cache is best-effort and should not block the dashboard.
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("market-prices-timeout", { cause: error });
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function getNativeAssetPricesUsd({ timeoutMs = DEFAULT_PRICE_TIMEOUT_MS } = {}) {
  const url = new URL(COINGECKO_SIMPLE_PRICE_URL);
  url.searchParams.set("ids", Object.values(PRICE_IDS).join(","));
  url.searchParams.set("vs_currencies", "usd");

  const response = await fetchWithTimeout(url.toString(), timeoutMs);

  if (!response.ok) {
    throw new Error("market-prices-unavailable");
  }

  const data = await response.json();

  const prices = {
    solana: assertUsdPrice(data?.[PRICE_IDS.solana]?.usd, "solana"),
    bnb: assertUsdPrice(data?.[PRICE_IDS.bnb]?.usd, "bnb"),
    bitcoin: assertUsdPrice(data?.[PRICE_IDS.bitcoin]?.usd, "bitcoin"),
  };

  writeCachedNativeAssetPricesUsd(prices);
  return prices;
}
