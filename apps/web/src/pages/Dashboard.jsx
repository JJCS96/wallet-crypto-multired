import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import DashboardHome from "../components/dashboard/DashboardHome";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { ASSETS, ASSET_IDS } from "../config/assets";
import { APP_ROUTES } from "../constants/routes";
import { getBalanceByNetwork } from "../services/blockchain/balance.service";
import { getNativeAssetPricesUsd } from "../services/market/prices.service";
import { syncWalletActivity } from "../services/transactions/activity-sync.service";
import { getTransactions } from "../services/transactions/transactions.service";
import { getUserWallet } from "../services/user-wallets.service";

const ASSET_ORDER = [
  ASSET_IDS.solanaNative,
  ASSET_IDS.solanaSplDemo,
  ASSET_IDS.bnbNative,
  ASSET_IDS.bnbBep20Demo,
  ASSET_IDS.bitcoinNative,
];

const ASSET_COLORS = {
  [ASSET_IDS.solanaNative]: "#14f195",
  [ASSET_IDS.solanaSplDemo]: "#20c997",
  [ASSET_IDS.bnbNative]: "#f3ba2f",
  [ASSET_IDS.bnbBep20Demo]: "#f0b90b",
  [ASSET_IDS.bitcoinNative]: "#f7931a",
};

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
  const isTokenUnconfigured = asset.configured === false || balanceResult?.source === "missing-token-config";
  const amount = isTokenUnconfigured
    ? "No configurado"
    : `${formatBalance(balanceResult?.balance)} ${asset.symbol}`;

  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    network: asset.network === "solana" ? "Solana Devnet" : asset.network === "bnb" ? "BNB Testnet" : "Bitcoin Testnet",
    amount,
    color: ASSET_COLORS[assetId],
    configured: asset.configured,
    canSend: !isTokenUnconfigured,
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

function calculateEstimatedTotalUsd(balanceMap, prices) {
  return (
    (balanceMap[ASSET_IDS.solanaNative]?.balance || 0) * prices.solana
    + (balanceMap[ASSET_IDS.bnbNative]?.balance || 0) * prices.bnb
    + (balanceMap[ASSET_IDS.bitcoinNative]?.balance || 0) * prices.bitcoin
  );
}

function getActivitySyncMessage(results) {
  if (!results) {
    return "";
  }

  return results.hasOnlyFailures ? "" : results.message || "";
}

function getActivitySyncError(results) {
  if (!results) {
    return "";
  }

  return results.hasOnlyFailures ? results.message || "No se pudo sincronizar la actividad en este momento." : "";
}

async function loadRecentActivity(uid) {
  const transactions = await getTransactions(uid);
  return transactions.slice(0, 4);
}

async function syncAndLoadActivity(uid, currentWallet) {
  const results = await syncWalletActivity(uid, currentWallet);
  const transactions = await loadRecentActivity(uid);

  return { results, transactions };
}

function Dashboard({ user }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [nativeBalanceSummary, setNativeBalanceSummary] = useState([]);
  const [estimatedTotalUsd, setEstimatedTotalUsd] = useState(0);
  const [estimatedTotalUsdLoading, setEstimatedTotalUsdLoading] = useState(false);
  const [estimatedTotalUsdError, setEstimatedTotalUsdError] = useState("");
  const [recentActivity, setRecentActivity] = useState([]);
  const [activitySyncing, setActivitySyncing] = useState(false);
  const [activitySyncError, setActivitySyncError] = useState("");
  const [activitySyncNotice, setActivitySyncNotice] = useState("");

  async function refreshActivity(currentWallet = wallet) {
    if (!currentWallet) {
      return;
    }

    setActivitySyncing(true);
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
      setActivitySyncing(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setEstimatedTotalUsdError("");
      setEstimatedTotalUsdLoading(true);

      try {
        const currentWallet = await getUserWallet(user.uid);

        if (!isMounted) {
          return;
        }

        setWallet(currentWallet);

        if (!currentWallet) {
          setAssets([]);
          setNativeBalanceSummary([]);
          setRecentActivity([]);
          setLoading(false);
          return;
        }

        const fallbackBalanceMap = getFallbackBalanceMap();
        setAssets(ASSET_ORDER.map((assetId) => buildAssetTile(assetId, fallbackBalanceMap[assetId])));
        setNativeBalanceSummary(getNativeSummary(fallbackBalanceMap));
        setLoading(false);

        const balanceEntries = await Promise.all(
          ASSET_ORDER.map(async (assetId) => {
            try {
              return [assetId, await getBalanceByNetwork(ASSETS[assetId].network, currentWallet, assetId)];
            } catch {
              return [assetId, null];
            }
          }),
        );
        const balanceMap = Object.fromEntries(balanceEntries);

        if (!isMounted) {
          return;
        }

        setAssets(ASSET_ORDER.map((assetId) => buildAssetTile(assetId, balanceMap[assetId])));
        setNativeBalanceSummary(getNativeSummary(balanceMap));

        try {
          const prices = await getNativeAssetPricesUsd();

          if (isMounted) {
            setEstimatedTotalUsd(calculateEstimatedTotalUsd(balanceMap, prices));
          }
        } catch {
          if (isMounted) {
            setEstimatedTotalUsdError("Valor estimado no disponible");
          }
        }

        if (isMounted) {
          const initialTransactions = await loadRecentActivity(user.uid);

          if (isMounted) {
            setRecentActivity(initialTransactions);
          }
        }

        if (isMounted) {
          setActivitySyncing(true);
          const { results, transactions } = await syncAndLoadActivity(user.uid, currentWallet);

          if (isMounted) {
            setActivitySyncNotice(getActivitySyncMessage(results));
            setActivitySyncError(getActivitySyncError(results));
            setRecentActivity(transactions);
            setActivitySyncing(false);
          }
        }
      } finally {
        if (isMounted) {
          setEstimatedTotalUsdLoading(false);
          setLoading(false);
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
          recentActivity={recentActivity}
          activitySyncing={activitySyncing}
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
