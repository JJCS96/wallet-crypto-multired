/**
 * Archivo: Dashboard.jsx
 * Propósito: Orquesta la vista principal del panel con balances reales, precios estimados y actividad multired.
 * Funcionalidades:
 * - Carga direcciones públicas de la wallet del usuario desde Firestore.
 * - Consulta balances en Solana Devnet, BNB Testnet y Bitcoin Testnet.
 * - Calcula valor estimado USD solo con activos nativos.
 * - Sincroniza actividad on-chain sin exponer frase semilla ni claves privadas.
 */
import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import DashboardHome from "../components/dashboard/DashboardHome";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { ASSETS, ASSET_IDS, getAssetDisplayName, getVisibleAssetIds } from "../config/assets";
import { APP_ROUTES } from "../constants/routes";
import { getBalanceByNetwork } from "../services/blockchain/balance.service";
import { readCachedNativeAssetPricesUsd, getNativeAssetPricesUsd } from "../services/market/prices.service";
import { readDashboardBalanceCache, writeDashboardBalanceCache } from "../services/dashboard/dashboard-cache.service";
import {
  getBitcoinTestnetOnChainActivity,
  getBnbNativeOnChainActivity,
  getSolanaNativeOnChainActivity,
  syncWalletActivity,
} from "../services/transactions/activity-sync.service";
import { getTransactions, mergeTransactions } from "../services/transactions/transactions.service";
import { getUserWallet } from "../services/user-wallets.service";

const ASSET_ORDER = getVisibleAssetIds();

const ASSET_COLORS = {
  [ASSET_IDS.solanaNative]: "#14f195",
  [ASSET_IDS.solanaSplDemo]: "#20c997",
  [ASSET_IDS.bnbNative]: "#f3ba2f",
  [ASSET_IDS.bnbBep20Demo]: "#f0b90b",
  [ASSET_IDS.bitcoinNative]: "#f7931a",
};

const NATIVE_ASSET_IDS = [
  ASSET_IDS.solanaNative,
  ASSET_IDS.bnbNative,
  ASSET_IDS.bitcoinNative,
];

const PRICE_KEYS_BY_ASSET_ID = {
  [ASSET_IDS.solanaNative]: "solana",
  [ASSET_IDS.bnbNative]: "bnb",
  [ASSET_IDS.bitcoinNative]: "bitcoin",
};

const BALANCE_TIMEOUTS_BY_ASSET_ID = {
  [ASSET_IDS.solanaNative]: 8000,
  [ASSET_IDS.solanaSplDemo]: 8000,
  [ASSET_IDS.bnbNative]: 8000,
  [ASSET_IDS.bnbBep20Demo]: 8000,
  [ASSET_IDS.bitcoinNative]: 10000,
};

const PRICE_TIMEOUT_MS = 5000;

function getDisplayName(user) {
  if (user?.displayName) {
    return user.displayName;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Usuario";
}

function formatBalance(value, fallback = "Balance no disponible") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function buildAssetTile(assetId, balanceResult) {
  const asset = ASSETS[assetId];
  const amount = `${formatBalance(balanceResult?.balance)} ${asset.symbol}`;

  return {
    id: asset.id,
    name: getAssetDisplayName(asset),
    symbol: asset.symbol,
    network: asset.network === "solana" ? "Solana Devnet" : asset.network === "bnb" ? "BNB Testnet" : "Bitcoin Testnet",
    amount,
    color: ASSET_COLORS[assetId],
    configured: asset.configured,
    canSend: true,
    statusLabel: asset.assetType === "token" ? asset.tokenStandard : "Nativo",
  };
}

function getNativeSummary(balanceMap) {
  return [
    { label: "SOL", value: `${formatBalance(balanceMap[ASSET_IDS.solanaNative]?.balance, "--")} SOL` },
    { label: "tBNB", value: `${formatBalance(balanceMap[ASSET_IDS.bnbNative]?.balance, "--")} tBNB` },
    { label: "BTC", value: `${formatBalance(balanceMap[ASSET_IDS.bitcoinNative]?.balance, "--")} BTC` },
  ];
}

function getFallbackBalanceMap() {
  return Object.fromEntries(ASSET_ORDER.map((assetId) => [assetId, null]));
}

function hasPriceData(prices) {
  return (
    typeof prices?.solana === "number"
    && typeof prices?.bnb === "number"
    && typeof prices?.bitcoin === "number"
    && Number.isFinite(prices.solana)
    && Number.isFinite(prices.bnb)
    && Number.isFinite(prices.bitcoin)
  );
}

function hasKnownNativeBalance(balanceMap) {
  return NATIVE_ASSET_IDS.some((assetId) => (
    typeof balanceMap[assetId]?.balance === "number"
    && Number.isFinite(balanceMap[assetId].balance)
  ));
}

function isUsableBalanceResult(result) {
  return typeof result?.balance === "number" && Number.isFinite(result.balance);
}

function buildCachedBalanceMap(uid) {
  const cache = readDashboardBalanceCache(uid);

  if (!cache) {
    return {
      balanceMap: getFallbackBalanceMap(),
      updatedAt: "",
      hasCache: false,
    };
  }

  return {
    balanceMap: {
      ...getFallbackBalanceMap(),
      ...cache.balances,
    },
    updatedAt: cache.updatedAt || "",
    hasCache: Object.values(cache.balances || {}).some(isUsableBalanceResult),
  };
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  // Cada red tiene un límite de espera para que una falla RPC no bloquee todo el Dashboard.
  let timeoutId;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = globalThis.setTimeout(() => {
        globalThis.clearTimeout(timeoutId);
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
  });
}

function buildTimeoutBalanceResult(assetId) {
  const asset = ASSETS[assetId];

  return {
    network: asset.network,
    symbol: asset.symbol,
    balance: null,
    source: "timeout",
    error: "Balance no disponible temporalmente.",
  };
}

async function getAssetBalanceWithTimeout(assetId, wallet) {
  const asset = ASSETS[assetId];
  const timeoutMs = BALANCE_TIMEOUTS_BY_ASSET_ID[assetId] || 8000;

  try {
    const result = await withTimeout(
      getBalanceByNetwork(asset.network, wallet, assetId),
      timeoutMs,
      `${assetId}-balance-timeout`,
    );

    return [assetId, result];
  } catch {
    return [assetId, buildTimeoutBalanceResult(assetId)];
  }
}

function calculateEstimatedTotalUsd(balanceMap, prices) {
  // El total USD solo usa activos nativos con precio conocido.
  return getNativeAssetValueDistribution(balanceMap, prices).reduce(
    (sum, asset) => sum + asset.valueUsd,
    0,
  );
}

function getNativeAssetValueDistribution(balanceMap, prices = {}) {
  // La distribución se calcula por valor estimado, no por cantidad cruda de moneda.
  return NATIVE_ASSET_IDS.map((assetId) => {
    const asset = ASSETS[assetId];
    const balance = balanceMap[assetId]?.balance || 0;
    const priceKey = PRICE_KEYS_BY_ASSET_ID[assetId];
    const priceUsd = prices && typeof prices[priceKey] === "number" && Number.isFinite(prices[priceKey])
      ? prices[priceKey]
      : 0;

    return {
      id: asset.id,
      label: asset.symbol,
      balance,
      priceUsd,
      valueUsd: balance * priceUsd,
      color: ASSET_COLORS[assetId],
    };
  });
}

function getActivitySyncMessage(results) {
  if (!results) {
    return "";
  }

  const message = results.hasOnlyFailures ? "" : results.message || "";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("permission")
    || lowerMessage.includes("api")
    || lowerMessage.includes("rpc")
    || lowerMessage.includes("unavailable")
    || lowerMessage.includes("configur")
  ) {
    return "Actividad on-chain cargada parcialmente.";
  }

  return message;
}

function getActivitySyncError(results) {
  if (!results) {
    return "";
  }

  return results.hasOnlyFailures ? results.message || "No se pudo sincronizar la actividad en este momento." : "";
}

async function loadStoredActivity(uid) {
  try {
    return await getTransactions(uid);
  } catch {
    return [];
  }
}

async function loadOnChainActivity(currentWallet) {
  // Consulta actividad pública en paralelo; no requiere contraseña ni desbloquear el vault.
  const jobs = [];

  if (currentWallet?.solanaAddress) {
    jobs.push(getSolanaNativeOnChainActivity(currentWallet.solanaAddress, 12));
  }

  if (currentWallet?.bnbAddress) {
    jobs.push(getBnbNativeOnChainActivity(currentWallet.bnbAddress, 12));
  }

  if (currentWallet?.bitcoinAddress) {
    jobs.push(getBitcoinTestnetOnChainActivity(currentWallet.bitcoinAddress, 12));
  }

  const results = await Promise.allSettled(jobs);

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function loadRecentActivity(uid, currentWallet) {
  const [storedTransactions, onChainTransactions] = await Promise.all([
    loadStoredActivity(uid),
    loadOnChainActivity(currentWallet),
  ]);

  return mergeTransactions(storedTransactions, onChainTransactions).slice(0, 5);
}

async function syncAndLoadActivity(uid, currentWallet) {
  const results = await syncWalletActivity(uid, currentWallet);
  const transactions = await loadRecentActivity(uid, currentWallet);

  return { results, transactions };
}

function Dashboard({ user }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [nativeBalanceSummary, setNativeBalanceSummary] = useState([]);
  const [nativeAssetDistribution, setNativeAssetDistribution] = useState([]);
  const [balanceStatus, setBalanceStatus] = useState("loading");
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState("");
  const [priceStatus, setPriceStatus] = useState("loading");
  const [priceUpdatedAt, setPriceUpdatedAt] = useState("");
  const [estimatedTotalUsd, setEstimatedTotalUsd] = useState(0);
  const [estimatedTotalUsdLoading, setEstimatedTotalUsdLoading] = useState(false);
  const [estimatedTotalUsdError, setEstimatedTotalUsdError] = useState("");
  const [recentActivity, setRecentActivity] = useState([]);
  const [activitySyncing, setActivitySyncing] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activitySyncError, setActivitySyncError] = useState("");
  const [activitySyncNotice, setActivitySyncNotice] = useState("");

  function applyBalancePresentation(balanceMap, prices, status, updatedAt = "") {
    // Se usa una misma fuente de balances y precios para total, resumen y distribución.
    const canEstimateUsd = hasPriceData(prices);
    const hasBalanceData = hasKnownNativeBalance(balanceMap);

    setAssets(ASSET_ORDER.map((assetId) => buildAssetTile(assetId, balanceMap[assetId])));
    setNativeBalanceSummary(getNativeSummary(balanceMap));
    setNativeAssetDistribution(getNativeAssetValueDistribution(balanceMap, canEstimateUsd ? prices : {}));
    setBalanceStatus(status);
    setBalanceUpdatedAt(updatedAt);

    if (!hasBalanceData && status === "loading") {
      setEstimatedTotalUsdLoading(true);
      setEstimatedTotalUsdError("");
      return;
    }

    if (canEstimateUsd && hasBalanceData) {
      setEstimatedTotalUsd(calculateEstimatedTotalUsd(balanceMap, prices));
      setEstimatedTotalUsdError("");
      setEstimatedTotalUsdLoading(false);
      return;
    }

    if (status !== "loading" || hasBalanceData) {
      setEstimatedTotalUsdError("Valor estimado no disponible");
      setEstimatedTotalUsdLoading(false);
    }
  }

  async function refreshActivity(currentWallet = wallet) {
    if (!currentWallet) {
      return;
    }

    setActivitySyncing(true);
    setActivityLoaded((currentValue) => currentValue && recentActivity.length > 0);
    setActivitySyncError("");
    setActivitySyncNotice("");

    try {
      const { results, transactions } = await syncAndLoadActivity(user.uid, currentWallet);
      setActivitySyncNotice(getActivitySyncMessage(results));
      setActivitySyncError(getActivitySyncError(results));
      setRecentActivity(transactions);
    } catch {
      setActivitySyncError("No se pudo sincronizar la actividad en este momento.");
    } finally {
      setActivityLoaded(true);
      setActivitySyncing(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function refreshPricesInBackground(getCurrentBalanceMap, getCurrentUpdatedAt) {
      const cachedPrices = readCachedNativeAssetPricesUsd({ allowExpired: true });

      if (cachedPrices && isMounted) {
        setPriceStatus("cached");
        setPriceUpdatedAt(cachedPrices.updatedAt || "");
        applyBalancePresentation(
          getCurrentBalanceMap(),
          cachedPrices.prices,
          hasKnownNativeBalance(getCurrentBalanceMap()) ? "updating" : "loading",
          getCurrentUpdatedAt(),
        );
      }

      try {
        const prices = await getNativeAssetPricesUsd({ timeoutMs: PRICE_TIMEOUT_MS });

        if (!isMounted) {
          return null;
        }

        setPriceStatus("ready");
        setPriceUpdatedAt(new Date().toISOString());
        applyBalancePresentation(
          getCurrentBalanceMap(),
          prices,
          hasKnownNativeBalance(getCurrentBalanceMap()) ? "updating" : "loading",
          getCurrentUpdatedAt(),
        );
        return prices;
      } catch {
        if (isMounted) {
          setPriceStatus(cachedPrices ? "cached" : "error");
          setPriceUpdatedAt(cachedPrices?.updatedAt || "");
          applyBalancePresentation(
            getCurrentBalanceMap(),
            cachedPrices?.prices || null,
            hasKnownNativeBalance(getCurrentBalanceMap()) ? "partial" : "error",
            getCurrentUpdatedAt(),
          );
        }

        return cachedPrices?.prices || null;
      }
    }

    async function refreshBalancesInBackground(currentWallet, initialBalanceMap, initialPrices, initialUpdatedAt) {
      let currentBalanceMap = { ...initialBalanceMap };
      let currentPrices = initialPrices;
      let currentBalanceUpdatedAt = initialUpdatedAt || "";
      const completedNativeAssets = new Set();
      const failedNativeAssets = new Set();

      function getBalanceStatus() {
        if (completedNativeAssets.size === 0) {
          return hasKnownNativeBalance(currentBalanceMap) ? "updating" : "loading";
        }

        if (failedNativeAssets.size > 0) {
          return "partial";
        }

        return completedNativeAssets.size === NATIVE_ASSET_IDS.length ? "ready" : "updating";
      }

      function applyCurrentBalance(updatedAt = currentBalanceUpdatedAt) {
        currentBalanceUpdatedAt = updatedAt || currentBalanceUpdatedAt;
        applyBalancePresentation(currentBalanceMap, currentPrices, getBalanceStatus(), currentBalanceUpdatedAt);
      }

      const pricePromise = refreshPricesInBackground(
        () => currentBalanceMap,
        () => currentBalanceUpdatedAt,
      ).then((prices) => {
        currentPrices = prices;

        if (isMounted) {
          applyCurrentBalance();
        }
      });

      const balanceJobs = ASSET_ORDER.map(async (assetId) => {
        const [resolvedAssetId, result] = await getAssetBalanceWithTimeout(assetId, currentWallet);
        const existingResult = currentBalanceMap[resolvedAssetId];
        const nextResult = isUsableBalanceResult(result) ? result : existingResult || result;

        currentBalanceMap = {
          ...currentBalanceMap,
          [resolvedAssetId]: nextResult,
        };

        if (NATIVE_ASSET_IDS.includes(resolvedAssetId)) {
          completedNativeAssets.add(resolvedAssetId);

          if (!isUsableBalanceResult(result)) {
            failedNativeAssets.add(resolvedAssetId);
          }
        }

        if (isMounted) {
          const updatedAt = new Date().toISOString();
          writeDashboardBalanceCache(user.uid, currentBalanceMap);
          applyCurrentBalance(updatedAt);
        }
      });

      await Promise.allSettled(balanceJobs);
      await pricePromise;

      if (isMounted) {
        writeDashboardBalanceCache(user.uid, currentBalanceMap);
        applyBalancePresentation(
          currentBalanceMap,
          currentPrices,
          failedNativeAssets.size > 0 ? "partial" : "ready",
          new Date().toISOString(),
        );
      }
    }

    async function loadActivityInBackground(currentWallet) {
      setActivitySyncing(true);
      setActivityLoaded(false);
      setActivitySyncError("");
      setActivitySyncNotice("");

      try {
        const storedTransactions = await loadStoredActivity(user.uid);

        if (isMounted && storedTransactions.length > 0) {
          setRecentActivity(storedTransactions.slice(0, 5));
        }

        const { results, transactions } = await syncAndLoadActivity(user.uid, currentWallet);

        if (isMounted) {
          setActivitySyncNotice(getActivitySyncMessage(results));
          setActivitySyncError(getActivitySyncError(results));
          setRecentActivity(transactions);
          setActivityLoaded(true);
        }
      } catch {
        if (isMounted) {
          setActivitySyncError("No se pudo sincronizar la actividad en este momento.");
          setActivityLoaded(true);
        }
      } finally {
        if (isMounted) {
          setActivitySyncing(false);
        }
      }
    }

    async function loadDashboard() {
      setLoading(true);
      setEstimatedTotalUsdError("");
      setEstimatedTotalUsdLoading(true);
      setBalanceStatus("loading");
      setPriceStatus("loading");

      try {
        const currentWallet = await getUserWallet(user.uid);

        if (!isMounted) {
          return;
        }

        setWallet(currentWallet);

        if (!currentWallet) {
          setAssets([]);
          setNativeBalanceSummary([]);
          setNativeAssetDistribution([]);
          setBalanceStatus("error");
          setBalanceUpdatedAt("");
          setPriceStatus("error");
          setPriceUpdatedAt("");
          setEstimatedTotalUsdLoading(false);
          setRecentActivity([]);
          setActivityLoaded(true);
          setLoading(false);
          return;
        }

        const cachedBalance = buildCachedBalanceMap(user.uid);
        const cachedPrices = readCachedNativeAssetPricesUsd({ allowExpired: true });
        const initialStatus = cachedBalance.hasCache ? "updating" : "loading";

        if (cachedPrices) {
          setPriceStatus("cached");
          setPriceUpdatedAt(cachedPrices.updatedAt || "");
        }

        applyBalancePresentation(
          cachedBalance.balanceMap,
          cachedPrices?.prices || null,
          initialStatus,
          cachedBalance.updatedAt,
        );
        setLoading(false);

        void refreshBalancesInBackground(
          currentWallet,
          cachedBalance.balanceMap,
          cachedPrices?.prices || null,
          cachedBalance.updatedAt,
        ).finally(() => {
          if (isMounted) {
            void loadActivityInBackground(currentWallet);
          }
        });
      } catch {
        if (isMounted) {
          setLoading(false);
          setEstimatedTotalUsdLoading(false);
          setEstimatedTotalUsdError("No se pudo cargar el Dashboard.");
          setBalanceStatus("error");
          setActivityLoaded(true);
          setActivitySyncing(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  return (
    <AppShell
      user={user}
      title="Dashboard"
      kicker="NovaWallet multired"
      description="Activos, valor estimado y actividad reciente."
    >
      {loading ? (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--loading">
            <p className="placeholder-copy">Cargando tu Wallet multired...</p>
          </article>
        </section>
      ) : wallet ? (
        <DashboardHome
          displayName={getDisplayName(user)}
          assets={assets}
          estimatedTotalUsd={estimatedTotalUsd}
          estimatedTotalUsdLoading={estimatedTotalUsdLoading}
          estimatedTotalUsdError={estimatedTotalUsdError}
          nativeBalanceSummary={nativeBalanceSummary}
          nativeAssetDistribution={nativeAssetDistribution}
          balanceStatus={balanceStatus}
          balanceUpdatedAt={balanceUpdatedAt}
          priceStatus={priceStatus}
          priceUpdatedAt={priceUpdatedAt}
          recentActivity={recentActivity}
          activitySyncing={activitySyncing}
          activityLoaded={activityLoaded}
          activitySyncError={activitySyncError}
          activitySyncNotice={activitySyncNotice}
          onRefreshActivity={() => refreshActivity()}
        />
      ) : (
        <section className="placeholder-page">
          <WalletEmptyState
            title="Tu Wallet aún no está configurada"
            description="Crea una Wallet nueva o restaura una existente para ver activos, balances y actividad."
            badge="Onboarding pendiente"
            steps={[
              "Crear o restaurar Wallet.",
              "Guardar la frase semilla fuera de Firebase.",
              "Configurar el vault local para firmar envíos.",
            ]}
            primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear Wallet" }}
            secondaryAction={{ to: APP_ROUTES.restoreWallet, label: "Restaurar Wallet" }}
          />
        </section>
      )}
    </AppShell>
  );
}

export default Dashboard;
