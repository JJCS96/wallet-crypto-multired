const DASHBOARD_BALANCE_CACHE_PREFIX = "novawallet:dashboard-balances";
const CACHE_VERSION = 1;

function isStorageAvailable() {
  return typeof globalThis.localStorage !== "undefined";
}

function getBalanceCacheKey(uid) {
  return `${DASHBOARD_BALANCE_CACHE_PREFIX}:${uid}`;
}

function isFiniteBalance(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function readDashboardBalanceCache(uid) {
  if (!uid || !isStorageAvailable()) {
    return null;
  }

  try {
    const rawValue = globalThis.localStorage.getItem(getBalanceCacheKey(uid));

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (parsedValue?.version !== CACHE_VERSION || !parsedValue?.balances) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

export function writeDashboardBalanceCache(uid, balanceMap) {
  if (!uid || !isStorageAvailable()) {
    return;
  }

  const balances = Object.fromEntries(
    Object.entries(balanceMap)
      .filter(([, result]) => isFiniteBalance(result?.balance))
      .map(([assetId, result]) => [
        assetId,
        {
          network: result.network,
          symbol: result.symbol,
          balance: result.balance,
          source: result.source || "cacheable-balance",
          cachedAt: new Date().toISOString(),
        },
      ]),
  );

  try {
    globalThis.localStorage.setItem(
      getBalanceCacheKey(uid),
      JSON.stringify({
        version: CACHE_VERSION,
        updatedAt: new Date().toISOString(),
        balances,
      }),
    );
  } catch {
    // Cache is best-effort; dashboard rendering must never depend on it.
  }
}

