const COINGECKO_SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price";

const PRICE_IDS = {
  solana: "solana",
  bnb: "binancecoin",
  bitcoin: "bitcoin",
};

function assertUsdPrice(value, assetName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${assetName}-price-unavailable`);
  }

  return value;
}

export async function getNativeAssetPricesUsd() {
  const url = new URL(COINGECKO_SIMPLE_PRICE_URL);
  url.searchParams.set("ids", Object.values(PRICE_IDS).join(","));
  url.searchParams.set("vs_currencies", "usd");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("market-prices-unavailable");
  }

  const data = await response.json();

  return {
    solana: assertUsdPrice(data?.[PRICE_IDS.solana]?.usd, "solana"),
    bnb: assertUsdPrice(data?.[PRICE_IDS.bnb]?.usd, "bnb"),
    bitcoin: assertUsdPrice(data?.[PRICE_IDS.bitcoin]?.usd, "bitcoin"),
  };
}
