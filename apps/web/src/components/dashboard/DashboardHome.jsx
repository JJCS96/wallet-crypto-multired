function formatActivityAmount(value) {
  return Number(value || 0).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getActivitySymbol(transaction) {
  if (transaction.assetType === "token" && transaction.tokenSymbol) {
    return transaction.tokenSymbol;
  }

  if (transaction.network === "bitcoin") {
    return "BTC";
  }

  if (transaction.network === "bnb") {
    return "tBNB";
  }

  return "SOL";
}

function getActivityTitle(transaction) {
  const action = transaction.direction === "incoming" ? "Recibido" : "Enviado";
  return `${action} ${formatActivityAmount(transaction.amount)} ${getActivitySymbol(transaction)}`;
}

function formatShortHash(value) {
  if (!value) {
    return "Sin hash";
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

import { Link } from "react-router-dom";
import { APP_ROUTES } from "../../constants/routes";

function DashboardHome({
  displayName,
  assets,
  estimatedTotalUsd,
  estimatedTotalUsdLoading,
  estimatedTotalUsdError,
  nativeBalanceSummary = [],
  recentActivity = [],
  activitySyncing = false,
  activitySyncError = "",
  activitySyncNotice = "",
  onRefreshActivity,
}) {
  const totalLabel = estimatedTotalUsdLoading
    ? "Calculando..."
    : estimatedTotalUsdError
      ? "Valor estimado no disponible"
      : formatUsd(typeof estimatedTotalUsd === "number" ? estimatedTotalUsd : 0);

  function getAssetState(asset) {
    if (asset.configured === false || asset.amount === "Token demo no configurado") {
      return "No configurado";
    }

    if (asset.amount === "Balance no disponible" || asset.amount === "No disponible") {
      return "Sin fondos";
    }

    return "Activo";
  }

  function getAssetDescription(asset) {
    if (asset.amount === "Token demo no configurado") {
      return asset.name === "SPL Demo Token"
        ? "Configura el mint en .env.local para habilitar este token."
        : "Configura el contrato en .env.local para habilitar este token.";
    }

    if (asset.symbol === "SOL") {
      return "Envío y recepción disponibles.";
    }

    if (asset.symbol === "tBNB") {
      return "Requiere tBNB para gas.";
    }

    if (asset.symbol === "BTC") {
      return "Disponible si existen UTXOs.";
    }

    return "Token demo en red de prueba.";
  }

  return (
    <>
      <section className="wallet-overview-grid wallet-overview-grid--single">
        <article className="dashboard-card wallet-balance-card nova-card--hero">
          <span className="wallet-balance-card__mesh" aria-hidden="true" />
          <div className="card-header-row">
            <div>
              <p className="card-label">Balance total</p>
              <p className="dashboard-note">Valor estimado de activos en redes de prueba.</p>
            </div>
            <span className="card-pill card-pill--live">Demo informativo</span>
          </div>

          <div className={`balance ${estimatedTotalUsdError ? "balance--unavailable" : ""}`}>
            {totalLabel} {!estimatedTotalUsdError && !estimatedTotalUsdLoading ? <span>USD</span> : null}
          </div>

          <div className="native-balance-list" aria-label="Activos nativos incluidos en el total estimado">
            {nativeBalanceSummary.map((asset) => (
              <div className="native-balance-row" key={asset.label}>
                <span>{asset.label}</span>
                <strong>{asset.value}</strong>
              </div>
            ))}
          </div>

          {estimatedTotalUsdError ? <p className="negative">{estimatedTotalUsdError}</p> : null}
          <p className="dashboard-note">Activos en redes de prueba, sin valor comercial real.</p>
          <p className="dashboard-note">Hola, {displayName}. SPL Demo y BEP20 Demo no se incluyen en el total USD.</p>
        </article>
      </section>

      <section className="dashboard-card assets-network-card nova-card--interactive">
        <div className="card-header-row">
          <h2>Mis activos</h2>
          <span className="card-pill">Activos en redes de prueba</span>
        </div>

        <div className="asset-card-grid">
            {assets.map((asset) => {
              const assetState = getAssetState(asset);
              const isUnavailable = assetState === "No configurado";

              return (
            <article className={`asset-network-tile ${isUnavailable ? "asset-network-tile--muted" : ""}`} key={`${asset.name}-${asset.symbol}`}>
              <div className="asset-name-cell">
                <span
                  className="asset-icon"
                  aria-hidden="true"
                  style={{ backgroundColor: asset.color }}
                >
                  {asset.symbol[0]}
                </span>

                <div className="asset-copy">
                  <strong>{asset.name}</strong>
                  <span>{asset.network}</span>
                </div>
              </div>

              <div className="asset-status-row">
                <span className="card-pill">{asset.statusLabel}</span>
                <span className={`card-pill ${isUnavailable ? "card-pill--muted" : "card-pill--live"}`}>{assetState}</span>
              </div>

              <p className="asset-amount">{asset.amount}</p>
              <p className="dashboard-note asset-note">{getAssetDescription(asset)}</p>

              <div className="asset-action-row">
                <Link className={`auth-button-secondary auth-button-link ${isUnavailable ? "asset-action-muted" : ""}`} to={APP_ROUTES.receiveFunds}>
                  Recibir
                </Link>
                {asset.canSend && !isUnavailable ? (
                  <Link className="auth-button auth-button-link" to={APP_ROUTES.sendTransaction}>
                    Enviar
                  </Link>
                ) : (
                  <span className="asset-action-disabled">Enviar</span>
                )}
              </div>
            </article>
              );
            })}
        </div>
      </section>

      <section className="dashboard-card recent-activity-card nova-card--interactive">
        <div className="card-header-row">
          <h2>Actividad reciente</h2>
          <div className="placeholder-actions" style={{ marginTop: 0 }}>
            <button className="inline-link-text" type="button" onClick={onRefreshActivity} disabled={activitySyncing}>
              {activitySyncing ? "Actualizando..." : "Actualizar actividad"}
            </button>
            <Link className="inline-link-text" to={APP_ROUTES.transactionHistory}>Ver historial</Link>
          </div>
        </div>

        {activitySyncing ? <p className="dashboard-note">Actualizando actividad...</p> : null}
        {activitySyncNotice && !activitySyncing ? <p className="dashboard-note">{activitySyncNotice}</p> : null}
        {activitySyncError ? <p className="negative">{activitySyncError}</p> : null}

        {recentActivity.length > 0 ? (
          <div className="history-list history-list--compact">
            {recentActivity.map((transaction) => (
              <article className="history-card history-card--compact" key={transaction.id}>
                <div>
                  <strong>{getActivityTitle(transaction)}</strong>
                  <span>{transaction.network} · {transaction.status}</span>
                </div>
                <div>
                  <span>{formatShortHash(transaction.txHash)}</span>
                  {transaction.explorerUrl ? (
                    <a className="inline-link-text" href={transaction.explorerUrl} target="_blank" rel="noreferrer">
                      Explorer
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-activity-state">
            <span aria-hidden="true">TX</span>
            <strong>Aún no tienes movimientos</strong>
            <p>Cuando envíes o recibas fondos, verás tu actividad aquí.</p>
          </div>
        )}
      </section>

      <section className="mobile-wallet-cta">
        <Link className="auth-button auth-button-link" to={APP_ROUTES.walletHome}>
          Abrir Mi Wallet
        </Link>
      </section>
    </>
  );
}

export default DashboardHome;
