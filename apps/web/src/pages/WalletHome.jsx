/**
 * Archivo: WalletHome.jsx
 * Propósito: Pantalla "Mi Wallet" para consultar activos disponibles y direcciones públicas.
 * Funcionalidades:
 * - Muestra activos nativos y tokens demo configurados.
 * - Consulta balances multired sin mostrar datos privados.
 * - Expone únicamente direcciones públicas para recibir fondos.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import AddressListCard from "../components/wallet/AddressListCard";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { ASSETS, ASSET_IDS, getAssetDisplayName } from "../config/assets";
import { getUserWallet } from "../services/user-wallets.service";
import { getBalanceByNetwork } from "../services/blockchain/balance.service";
import { getNativeAssetPricesUsd } from "../services/market/prices.service";
import { syncWalletActivity } from "../services/transactions/activity-sync.service";
import { isBitcoinMainnetAddress, isValidBitcoinTestnetAddress } from "../utils/address-validation";

function formatDate(value) {
  if (!value) {
    return "No disponible";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  return new Date(value).toLocaleString();
}

function formatBalance(value) {
  if (typeof value !== "number") {
    return "--";
  }

  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function WalletHome({ user }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solanaBalance, setSolanaBalance] = useState(null);
  const [solanaBalanceError, setSolanaBalanceError] = useState("");
  const [solanaBalanceLoading, setSolanaBalanceLoading] = useState(false);
  const [bnbBalance, setBnbBalance] = useState(null);
  const [bnbBalanceLoading, setBnbBalanceLoading] = useState(false);
  const [bnbBalanceError, setBnbBalanceError] = useState("");
  const [bitcoinBalance, setBitcoinBalance] = useState(null);
  const [splBalance, setSplBalance] = useState(null);
  const [splBalanceLoading, setSplBalanceLoading] = useState(false);
  const [splBalanceError, setSplBalanceError] = useState("");
  const [bep20Balance, setBep20Balance] = useState(null);
  const [bep20BalanceLoading, setBep20BalanceLoading] = useState(false);
  const [bep20BalanceError, setBep20BalanceError] = useState("");
  const [bitcoinBalanceLoading, setBitcoinBalanceLoading] = useState(false);
  const [bitcoinBalanceError, setBitcoinBalanceError] = useState("");
  const [activitySyncing, setActivitySyncing] = useState(false);
  const [activitySyncError, setActivitySyncError] = useState("");
  const [activitySyncNotice, setActivitySyncNotice] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [estimatedTotalUsd, setEstimatedTotalUsd] = useState(null);
  const [estimatedTotalUsdLoading, setEstimatedTotalUsdLoading] = useState(false);
  const [estimatedTotalUsdError, setEstimatedTotalUsdError] = useState("");
  const hasLegacyBitcoinMainnetAddress = isBitcoinMainnetAddress(wallet?.bitcoinAddress || "");
  const hasInvalidBitcoinTestnetAddress = Boolean(wallet?.bitcoinAddress) && !isValidBitcoinTestnetAddress(wallet.bitcoinAddress);

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      // Mi Wallet consulta direcciones públicas; no requiere abrir el vault cifrado.
      setLoading(true);

      try {
        const currentWallet = await getUserWallet(user.uid);

        if (isMounted) {
          setWallet(currentWallet);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  useEffect(() => {
    let isMounted = true;

    async function loadSolanaBalance() {
      if (!wallet?.solanaAddress) {
        return;
      }

      setSolanaBalanceLoading(true);

      try {
        const result = await getBalanceByNetwork("solana", wallet);

        if (isMounted) {
          setSolanaBalance(typeof result.balance === "number" ? result.balance : null);
          setSolanaBalanceError(result.error || "");
        }
      } finally {
        if (isMounted) {
          setSolanaBalanceLoading(false);
        }
      }
    }

    loadSolanaBalance();

    return () => {
      isMounted = false;
    };
  }, [refreshTick, wallet]);

  useEffect(() => {
    let isMounted = true;

    async function loadSplBalance() {
      if (!wallet?.solanaAddress || !ASSETS[ASSET_IDS.solanaSplDemo].configured) {
        return;
      }

      setSplBalanceLoading(true);

      try {
        const result = await getBalanceByNetwork("solana", wallet, ASSET_IDS.solanaSplDemo);

        if (isMounted) {
          setSplBalance(typeof result.balance === "number" ? result.balance : null);
          setSplBalanceError(result.error || "");
        }
      } finally {
        if (isMounted) {
          setSplBalanceLoading(false);
        }
      }
    }

    loadSplBalance();

    return () => {
      isMounted = false;
    };
  }, [refreshTick, wallet]);

  useEffect(() => {
    let isMounted = true;

    async function loadBnbBalance() {
      if (!wallet?.bnbAddress) {
        return;
      }

      setBnbBalanceLoading(true);

      try {
        const result = await getBalanceByNetwork("bnb", wallet);

        if (isMounted) {
          setBnbBalance(typeof result.balance === "number" ? result.balance : null);
          setBnbBalanceError(result.error || "");
        }
      } finally {
        if (isMounted) {
          setBnbBalanceLoading(false);
        }
      }
    }

    loadBnbBalance();

    return () => {
      isMounted = false;
    };
  }, [refreshTick, wallet]);

  useEffect(() => {
    let isMounted = true;

    async function loadBep20Balance() {
      if (!wallet?.bnbAddress || !ASSETS[ASSET_IDS.bnbBep20Demo].configured) {
        return;
      }

      setBep20BalanceLoading(true);

      try {
        const result = await getBalanceByNetwork("bnb", wallet, ASSET_IDS.bnbBep20Demo);

        if (isMounted) {
          setBep20Balance(typeof result.balance === "number" ? result.balance : null);
          setBep20BalanceError(result.error || "");
        }
      } finally {
        if (isMounted) {
          setBep20BalanceLoading(false);
        }
      }
    }

    loadBep20Balance();

    return () => {
      isMounted = false;
    };
  }, [refreshTick, wallet]);

  useEffect(() => {
    let isMounted = true;

    async function loadBitcoinBalance() {
      if (!wallet?.bitcoinAddress) {
        return;
      }

      if (!isValidBitcoinTestnetAddress(wallet.bitcoinAddress)) {
        if (isMounted) {
          setBitcoinBalance(null);
          setBitcoinBalanceError("La dirección Bitcoin guardada no pertenece a Testnet. Restaura tu wallet para actualizarla a tb1.");
        }
        return;
      }

      setBitcoinBalanceLoading(true);

      try {
        const result = await getBalanceByNetwork("bitcoin", wallet);

        if (isMounted) {
          setBitcoinBalance(typeof result.balance === "number" ? result.balance : null);
          setBitcoinBalanceError(result.error || "");
        }
      } finally {
        if (isMounted) {
          setBitcoinBalanceLoading(false);
        }
      }
    }

    loadBitcoinBalance();

    return () => {
      isMounted = false;
    };
  }, [refreshTick, wallet]);

  useEffect(() => {
    let isMounted = true;

    async function loadEstimatedTotal() {
      setEstimatedTotalUsdLoading(true);
      setEstimatedTotalUsdError("");

      try {
        const prices = await getNativeAssetPricesUsd();
        const total =
          (typeof solanaBalance === "number" ? solanaBalance : 0) * prices.solana
          + (typeof bnbBalance === "number" ? bnbBalance : 0) * prices.bnb
          + (typeof bitcoinBalance === "number" ? bitcoinBalance : 0) * prices.bitcoin;

        if (isMounted) {
          setEstimatedTotalUsd(total);
        }
      } catch {
        if (isMounted) {
          setEstimatedTotalUsdError("Valor estimado no disponible");
          setEstimatedTotalUsd(null);
        }
      } finally {
        if (isMounted) {
          setEstimatedTotalUsdLoading(false);
        }
      }
    }

    if (wallet) {
      loadEstimatedTotal();
    }

    return () => {
      isMounted = false;
    };
  }, [bitcoinBalance, bnbBalance, solanaBalance, wallet]);

  useEffect(() => {
    let isMounted = true;

    async function syncActivity() {
      if (!wallet) {
        return;
      }

      setActivitySyncing(true);
      setActivitySyncError("");
      setActivitySyncNotice("");

      try {
        const result = await syncWalletActivity(user.uid, wallet);

        if (isMounted) {
          setActivitySyncError(result.hasOnlyFailures ? result.message : "");
          setActivitySyncNotice(result.hasOnlyFailures ? "" : result.message);
        }
      } catch {
        if (isMounted) {
          setActivitySyncError("No se pudo actualizar actividad en este momento.");
          setActivitySyncNotice("");
        }
      } finally {
        if (isMounted) {
          setActivitySyncing(false);
        }
      }
    }

    syncActivity();

    return () => {
      isMounted = false;
    };
  }, [refreshTick, user.uid, wallet]);

  function handleRefreshActivity() {
    setRefreshTick((currentTick) => currentTick + 1);
  }

  const allAssetStatuses = [
    {
      name: "SOL",
      network: "Solana Devnet real",
      balance: solanaBalanceLoading
        ? "Consultando..."
        : typeof solanaBalance === "number"
          ? `${formatBalance(solanaBalance)} SOL`
          : "No disponible",
      badge: "Real Devnet",
      note: "Envío real y Comisión NovaWallet on-chain.",
      configured: true,
    },
    {
      name: getAssetDisplayName(ASSETS[ASSET_IDS.solanaSplDemo]),
      network: "Solana Devnet token demo",
      balance: !ASSETS[ASSET_IDS.solanaSplDemo].configured
        ? "Requiere configuración"
        : splBalanceLoading
          ? "Consultando..."
          : typeof splBalance === "number"
            ? `${formatBalance(splBalance)} ${ASSETS[ASSET_IDS.solanaSplDemo].symbol}`
            : "Balance no disponible",
      badge: "SPL",
      note: splBalanceError || "Token demo en red de prueba.",
      configured: ASSETS[ASSET_IDS.solanaSplDemo].configured,
    },
    {
      name: "tBNB",
      network: "BNB Testnet",
      balance: bnbBalanceLoading
        ? "Consultando..."
        : typeof bnbBalance === "number"
          ? `${formatBalance(bnbBalance)} tBNB`
          : "Balance no disponible",
      badge: "Testnet",
      note: bnbBalanceError || "Requiere RPC configurado y tBNB desde faucet.",
      configured: true,
    },
    {
      name: getAssetDisplayName(ASSETS[ASSET_IDS.bnbBep20Demo]),
      network: "BNB Testnet token demo",
      balance: !ASSETS[ASSET_IDS.bnbBep20Demo].configured
        ? "Requiere configuración"
        : bep20BalanceLoading
          ? "Consultando..."
          : typeof bep20Balance === "number"
            ? `${formatBalance(bep20Balance)} ${ASSETS[ASSET_IDS.bnbBep20Demo].symbol}`
            : "Balance no disponible",
      badge: "BEP20",
      note: bep20BalanceError || "Token demo en red de prueba.",
      configured: ASSETS[ASSET_IDS.bnbBep20Demo].configured,
    },
    {
      name: "BTC",
      network: "Bitcoin Testnet",
      balance: bitcoinBalanceLoading
        ? "Consultando..."
        : typeof bitcoinBalance === "number"
          ? `${bitcoinBalance.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")} BTC`
          : "Balance no disponible",
      badge: "Real Testnet",
      sendPending: false,
      note: hasInvalidBitcoinTestnetAddress
        ? "Dirección incompatible con Bitcoin Testnet. Restaura tu wallet para obtener una dirección tb1."
        : bitcoinBalanceError || "Recepción y envío Bitcoin Testnet disponibles si existen UTXOs suficientes.",
      configured: true,
    },
  ];
  const assetStatuses = allAssetStatuses.filter((asset) => asset.configured !== false);
  const supportedAssetCount = assetStatuses.length;
  const activeAssetCount = assetStatuses.filter((asset) => asset.configured !== false).length;
  const nativeWalletSummary = [
    {
      label: "SOL",
      value: solanaBalanceLoading
        ? "Consultando..."
        : `${formatBalance(solanaBalance)} SOL`,
    },
    {
      label: "tBNB",
      value: bnbBalanceLoading
        ? "Consultando..."
        : `${formatBalance(bnbBalance)} tBNB`,
    },
    {
      label: "BTC",
      value: bitcoinBalanceLoading
        ? "Consultando..."
        : typeof bitcoinBalance === "number"
          ? `${bitcoinBalance.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")} BTC`
          : "-- BTC",
    },
  ];

  function getAssetState(asset) {
    if (asset.configured === false || asset.balance === "No configurado" || asset.balance === "Requiere configuración") {
      return "No disponible";
    }

    if (asset.balance === "Balance no disponible" || asset.balance === "No disponible") {
      return "Sin fondos";
    }

    return "Activo";
  }

  function getAssetDescription(asset) {
    if (asset.balance === "No configurado" || asset.balance === "Requiere configuración") {
      return asset.badge === "SPL Demo"
        ? "Configura el mint en .env.local."
        : "Configura el contrato en .env.local.";
    }

    if (asset.name === "SOL") {
      return "Envío y recepción disponibles.";
    }

    if (asset.name === "tBNB") {
      return "Requiere tBNB para gas.";
    }

    if (asset.name === "BTC") {
      return "Disponible si existen UTXOs.";
    }

    return "Token demo en red de prueba.";
  }

  return (
    <AppShell
      user={user}
      title="Mi Wallet"
      kicker="Vista principal"
      description="Direcciones, activos y estado básico de tu wallet."
    >
      {loading ? (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--loading">
            <p className="placeholder-copy">Cargando información de tu Wallet...</p>
          </article>
        </section>
      ) : !wallet ? (
        <section className="placeholder-page">
          <article className="placeholder-card">
            <WalletEmptyState
              title="Aún no tienes una Wallet activa"
              description="Para usar Mi Wallet primero debes crear una Wallet nueva o restaurar una existente con tu frase semilla."
              badge="Sin Wallet"
              steps={[
                "Crea una nueva wallet si es tu primer ingreso.",
                "Restaura tu Wallet si ya tienes frase semilla.",
                "Luego podrás enviar, recibir y revisar actividad.",
              ]}
              primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear Wallet" }}
              secondaryAction={{ to: APP_ROUTES.restoreWallet, label: "Restaurar Wallet" }}
            />
          </article>
        </section>
      ) : (
        <section className="placeholder-page">
          <article className="dashboard-card wallet-balance-card wallet-home-balance-card">
            <span className="wallet-balance-card__mesh" aria-hidden="true" />
            <div className="dashboard-balance-layout">
              <div>
                <p className="card-label">Balance total estimado</p>
                <div className={`balance ${estimatedTotalUsdError ? "balance--unavailable" : ""}`}>
                  {estimatedTotalUsdLoading
                    ? "Calculando..."
                    : estimatedTotalUsdError
                      ? "Valor estimado no disponible"
                      : formatUsd(typeof estimatedTotalUsd === "number" ? estimatedTotalUsd : 0)}
                  {!estimatedTotalUsdError && !estimatedTotalUsdLoading ? <span>USD</span> : null}
                </div>
                <p className="dashboard-note">
                  Valor estimado en redes de prueba. No incluye tokens demo ni valor comercial real.
                </p>
              </div>

              <div className="balance-hero-mark" aria-hidden="true">
                <span>NW</span>
              </div>
            </div>

            <div className="native-balance-list native-balance-list--compact">
              {nativeWalletSummary.map((asset) => (
                <div className="native-balance-row" key={asset.label}>
                  <span>{asset.label}</span>
                  <strong>{asset.value}</strong>
                </div>
              ))}
            </div>

            <div className="wallet-home-status-row">
              <span>Activos disponibles: {supportedAssetCount}</span>
              <button className="inline-link-text" type="button" onClick={handleRefreshActivity} disabled={activitySyncing}>
                {activitySyncing ? "Actualizando..." : "Actualizar actividad"}
              </button>
            </div>
            {activitySyncNotice && !activitySyncing ? <p className="dashboard-note">{activitySyncNotice}</p> : null}
            {activitySyncError ? <p className="negative" style={{ marginTop: "12px" }}>{activitySyncError}</p> : null}
            {solanaBalanceError ? <p className="negative" style={{ marginTop: "12px" }}>{solanaBalanceError}</p> : null}
          </article>

          <div className="placeholder-grid wallet-summary-grid">
            <article className="placeholder-card placeholder-card--accent">
              <p className="placeholder-kicker">Resumen multired</p>
              <h2 className="placeholder-title">{user.displayName || user.email}</h2>
              <p className="placeholder-copy">
                Activos disponibles: <strong>{supportedAssetCount}</strong>
              </p>
              <p className="placeholder-copy">
                Activos listos: <strong>{activeAssetCount} / {supportedAssetCount}</strong>
              </p>
              <p className="placeholder-copy">
                Redes: <strong>Solana, BNB Testnet y Bitcoin Testnet</strong>
              </p>
              <p className="placeholder-copy">
                Bitcoin: <strong>{hasLegacyBitcoinMainnetAddress ? "Requiere restaurar para tb1." : "tb1 testnet disponible."}</strong>
              </p>
              <p className="placeholder-copy">
                Entorno: <strong>redes de prueba, sin valor comercial real</strong>
              </p>
              {solanaBalanceError ? <p className="negative" style={{ marginTop: "12px" }}>{solanaBalanceError}</p> : null}
              <p className="placeholder-copy">
                Fecha de creación: <strong>{formatDate(wallet.createdAt)}</strong>
              </p>
              <p className="placeholder-copy">
                Estado de la Wallet: <strong>{wallet.restoredAt ? "Restaurada" : "Creada"}</strong>
              </p>
              {activitySyncing ? <p className="dashboard-note">Actualizando actividad...</p> : null}
              {activitySyncNotice && !activitySyncing ? <p className="dashboard-note">{activitySyncNotice}</p> : null}
              {activitySyncError ? <p className="negative" style={{ marginTop: "12px" }}>{activitySyncError}</p> : null}
              <div className="placeholder-actions" style={{ marginTop: "18px" }}>
                <button className="auth-button-secondary" type="button" onClick={handleRefreshActivity} disabled={activitySyncing}>
                  {activitySyncing ? "Actualizando..." : "Actualizar actividad"}
                </button>
              </div>
            </article>

            <article className="placeholder-card wallet-actions-card">
              <p className="placeholder-kicker">Acciones rápidas</p>
              <h2 className="placeholder-title">Gestiona tu Wallet</h2>
              <div className="quick-actions quick-actions--wallet-home">
                <Link className="quick-action" to={APP_ROUTES.sendTransaction}>
                  <span className="quick-action-icon">TX</span>
                  <span className="quick-action-label" data-short-label="Enviar">Enviar</span>
                </Link>
                <Link className="quick-action" to={APP_ROUTES.receiveFunds}>
                  <span className="quick-action-icon">RC</span>
                  <span className="quick-action-label" data-short-label="Recibir">Recibir</span>
                </Link>
                <Link className="quick-action" to={APP_ROUTES.transactionHistory}>
                  <span className="quick-action-icon">HI</span>
                  <span className="quick-action-label" data-short-label="Historial">Historial</span>
                </Link>
                <Link className="quick-action" to={APP_ROUTES.settings}>
                  <span className="quick-action-icon">CF</span>
                  <span className="quick-action-label" data-short-label="Config.">Configuración</span>
                </Link>
              </div>
            </article>
          </div>

          <article className="placeholder-card assets-network-card nova-card--interactive">
            <div className="card-header-row">
              <h2>Activos disponibles</h2>
            </div>

            <div className="asset-card-grid">
              {assetStatuses.map((asset) => {
                const assetState = getAssetState(asset);
                const isUnavailable = assetState === "No configurado";

                return (
                <article className={`asset-network-tile ${isUnavailable ? "asset-network-tile--muted" : ""}`} key={`${asset.name}-${asset.badge}`}>
                  <div className="asset-name-cell">
                    <span className="asset-icon" aria-hidden="true">
                      {asset.name[0]}
                    </span>
                    <div className="asset-copy">
                      <strong>{asset.name}</strong>
                      <span>{asset.network}</span>
                    </div>
                  </div>
                  <div className="asset-status-row">
                    <span className="card-pill">{asset.badge}</span>
                    <span className={`card-pill ${isUnavailable ? "card-pill--muted" : "card-pill--live"}`}>{assetState}</span>
                  </div>
                  <p className="asset-amount">{asset.balance}</p>
                  <p className="dashboard-note asset-note">{getAssetDescription(asset)}</p>
                  <div className="asset-action-row">
                    {isUnavailable ? (
                      <span className="asset-action-disabled">Recibir</span>
                    ) : (
                      <Link className="auth-button-secondary auth-button-link" to={APP_ROUTES.receiveFunds}>
                        Recibir
                      </Link>
                    )}
                    {isUnavailable ? (
                      <span className="asset-action-disabled">Enviar</span>
                    ) : (
                      <Link className="auth-button auth-button-link" to={APP_ROUTES.sendTransaction}>
                        Enviar
                      </Link>
                    )}
                  </div>
                </article>
                );
              })}
            </div>
          </article>

          <AddressListCard wallet={wallet} title="Direcciones públicas" />
        </section>
      )}
    </AppShell>
  );
}

export default WalletHome;
