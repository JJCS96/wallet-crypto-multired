import { Link } from "react-router-dom";
import { APP_ROUTES } from "../../constants/routes";

const QUICK_ACTIONS = [
  { label: "Enviar", icon: "TX", to: APP_ROUTES.sendTransaction },
  { label: "Recibir", icon: "RC", to: APP_ROUTES.receiveFunds },
  { label: "Historial", icon: "HI", to: APP_ROUTES.transactionHistory },
  { label: "Restaurar", icon: "RW", to: APP_ROUTES.restoreWallet },
];

const ASSET_COLORS = {
  SOL: "#14f195",
  tBNB: "#f3ba2f",
  BTC: "#f7931a",
};

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

function formatDate(value) {
  if (!value) {
    return "Pendiente";
  }

  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pendiente";
  }

  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeUpdateTime(value) {
  if (!value) {
    return "";
  }

  const updatedAt = new Date(value);

  if (Number.isNaN(updatedAt.getTime())) {
    return "";
  }

  const diffMs = Date.now() - updatedAt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "hace unos segundos";
  }

  if (diffMinutes === 1) {
    return "hace 1 minuto";
  }

  if (diffMinutes < 60) {
    return `hace ${diffMinutes} minutos`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return diffHours === 1 ? "hace 1 hora" : `hace ${diffHours} horas`;
}

function getBalanceStatusLabel(status) {
  if (status === "ready") {
    return "Balance actualizado";
  }

  if (status === "partial") {
    return "Balance parcial";
  }

  if (status === "updating") {
    return "Actualizando...";
  }

  if (status === "error") {
    return "Balance no disponible";
  }

  return "Cargando balance...";
}

function getTransactionDate(transaction) {
  if (transaction.createdAt) {
    return transaction.createdAt;
  }

  if (typeof transaction.blockTime === "number") {
    return new Date(transaction.blockTime * 1000);
  }

  return null;
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

function getNetworkLabel(network) {
  if (network === "bitcoin") {
    return "Bitcoin Testnet";
  }

  if (network === "bnb") {
    return "BNB Testnet";
  }

  return "Solana Devnet";
}

function getDirectionLabel(direction) {
  if (direction === "incoming") {
    return "Recibido";
  }

  if (direction === "outgoing") {
    return "Enviado";
  }

  return "Movimiento";
}

function getStatusLabel(status) {
  if (status === "confirmed" || status === "success") {
    return "Confirmada";
  }

  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "failed") {
    return "Fallida";
  }

  return status || "Registrada";
}

function formatShortHash(value) {
  if (!value) {
    return "Sin hash";
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatDistributionPercent(percent) {
  if (!Number.isFinite(percent) || percent <= 0) {
    return "0%";
  }

  if (percent < 1) {
    return "<1%";
  }

  if (percent >= 10) {
    return `${Math.round(percent)}%`;
  }

  return `${percent.toFixed(1).replace(/\.0$/, "")}%`;
}

function normalizeActivityError(message) {
  if (!message) {
    return "";
  }

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("permission")
    || lowerMessage.includes("api")
    || lowerMessage.includes("rpc")
    || lowerMessage.includes("unavailable")
    || lowerMessage.includes("configur")
  ) {
    return "Actividad on-chain cargada parcialmente. No se pudo consultar una de las redes.";
  }

  return message;
}

function getActivityStatusLabel({ syncing, loaded, error, notice }) {
  const normalizedNotice = String(notice || "").toLowerCase();

  if (syncing) {
    return "Sincronizando...";
  }

  if (error) {
    return "No se pudo actualizar toda la actividad";
  }

  if (normalizedNotice.includes("parcial")) {
    return "Actividad cargada parcialmente";
  }

  if (loaded) {
    return "Actividad actualizada";
  }

  return "Sincronizando...";
}

function buildPortfolioTrend(totalUsd) {
  const base = typeof totalUsd === "number" && totalUsd > 0 ? totalUsd : 220;
  const multipliers = [0.72, 0.78, 0.75, 0.86, 0.91, 0.88, 1];

  return multipliers.map((multiplier, index) => ({
    label: `P${index + 1}`,
    value: Number((base * multiplier).toFixed(2)),
  }));
}

function buildDistribution(nativeAssetDistribution = []) {
  const source = nativeAssetDistribution.length > 0
    ? nativeAssetDistribution
    : [
      { label: "SOL", valueUsd: 0 },
      { label: "tBNB", valueUsd: 0 },
      { label: "BTC", valueUsd: 0 },
    ];
  const entries = source.map((asset) => ({
    label: asset.label,
    valueUsd: typeof asset.valueUsd === "number" && Number.isFinite(asset.valueUsd) && asset.valueUsd > 0
      ? asset.valueUsd
      : 0,
    color: asset.color || ASSET_COLORS[asset.label] || "#8b5cf6",
  }));
  const totalValue = entries.reduce((sum, item) => sum + item.valueUsd, 0);
  const hasValue = totalValue > 0;
  const items = entries.map((item) => {
    const percent = hasValue ? (item.valueUsd / totalValue) * 100 : 0;

    return {
      ...item,
      percent,
      percentLabel: formatDistributionPercent(percent),
    };
  });

  return {
    hasValue,
    items,
    positiveAssetCount: items.filter((item) => item.valueUsd > 0).length,
  };
}

function PortfolioTrendChart({ points }) {
  const width = 420;
  const height = 170;
  const padding = 16;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coordinates = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / (points.length - 1);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { x, y };
  });
  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coordinates.at(-1).x} ${height - padding} L ${coordinates[0].x} ${height - padding} Z`;

  return (
    <svg className="portfolio-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolucion visual del portafolio">
      <defs>
        <linearGradient id="portfolioAreaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path className="portfolio-line-chart__grid" d={`M ${padding} ${height - padding} H ${width - padding}`} />
      <path className="portfolio-line-chart__area" d={areaPath} />
      <path className="portfolio-line-chart__line" d={linePath} />
      {coordinates.map((point) => (
        <circle className="portfolio-line-chart__point" cx={point.x} cy={point.y} key={`${point.x}-${point.y}`} r="4" />
      ))}
    </svg>
  );
}

function AssetDistributionChart({ distribution }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const segments = distribution.items.filter((item) => item.percent > 0).reduce((result, item) => {
    const previousOffset = result.reduce((sum, segment) => sum + segment.length, 0);
    const length = (item.percent / 100) * circumference;

    return [...result, { ...item, length, offset: previousOffset }];
  }, []);

  return (
    <div className="asset-distribution-layout">
      <svg className="asset-donut-chart" viewBox="0 0 112 112" role="img" aria-label="Distribucion de activos">
        <circle className="asset-donut-chart__track" cx="56" cy="56" r={radius} />
        {segments.map((item) => (
          <circle
            className="asset-donut-chart__segment"
            cx="56"
            cy="56"
            key={item.label}
            r={radius}
            stroke={item.color}
            strokeDasharray={`${item.length} ${circumference - item.length}`}
            strokeDashoffset={-item.offset}
          />
        ))}
        <text className="asset-donut-chart__label" x="56" y="53">{distribution.positiveAssetCount}</text>
        <text className="asset-donut-chart__sublabel" x="56" y="67">activos</text>
      </svg>

      {!distribution.hasValue ? <p className="dashboard-note asset-distribution-empty">Sin activos para distribuir</p> : null}

      <div className="asset-distribution-list">
        {distribution.items.map((item) => (
          <div className="asset-distribution-item" key={item.label}>
            <span style={{ backgroundColor: item.color }} aria-hidden="true" />
            <strong>{item.label}</strong>
            <small>{item.percentLabel}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySkeletonRows() {
  return (
    <div className="dashboard-activity-list dashboard-activity-skeleton-list" aria-label="Sincronizando actividad multired">
      {[0, 1, 2].map((item) => (
        <div className="dashboard-activity-row dashboard-activity-row--skeleton" key={item}>
          <span className="dashboard-skeleton dashboard-skeleton--icon" aria-hidden="true" />
          <div className="dashboard-activity-main">
            <span className="dashboard-skeleton dashboard-skeleton--text dashboard-skeleton--wide" />
            <span className="dashboard-skeleton dashboard-skeleton--text" />
          </div>
          <div className="dashboard-activity-amount">
            <span className="dashboard-skeleton dashboard-skeleton--text" />
            <span className="dashboard-skeleton dashboard-skeleton--text dashboard-skeleton--short" />
          </div>
          <div className="dashboard-activity-meta">
            <span className="dashboard-skeleton dashboard-skeleton--pill" />
            <span className="dashboard-skeleton dashboard-skeleton--text dashboard-skeleton--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardHome({
  displayName,
  estimatedTotalUsd,
  estimatedTotalUsdLoading,
  estimatedTotalUsdError,
  nativeBalanceSummary = [],
  nativeAssetDistribution = [],
  balanceStatus = "loading",
  balanceUpdatedAt = "",
  priceStatus = "loading",
  priceUpdatedAt = "",
  recentActivity = [],
  activitySyncing = false,
  activityLoaded = false,
  activitySyncError = "",
  activitySyncNotice = "",
  onRefreshActivity,
}) {
  const totalLabel = estimatedTotalUsdLoading
    ? "Cargando balance..."
    : estimatedTotalUsdError
      ? "Valor estimado no disponible"
      : formatUsd(typeof estimatedTotalUsd === "number" ? estimatedTotalUsd : 0);
  const balanceUpdateLabel = formatRelativeUpdateTime(balanceUpdatedAt);
  const priceUpdateLabel = formatRelativeUpdateTime(priceUpdatedAt);
  const activityError = normalizeActivityError(activitySyncError);
  const hasActivity = recentActivity.length > 0;
  const showActivitySkeleton = !hasActivity && (!activityLoaded || activitySyncing);
  const showActivityEmpty = !activitySyncing && activityLoaded && !hasActivity;
  const activityStatusLabel = getActivityStatusLabel({
    syncing: activitySyncing,
    loaded: activityLoaded,
    error: activityError,
    notice: activitySyncNotice,
  });
  const incomingCount = recentActivity.filter((transaction) => transaction.direction === "incoming").length;
  const outgoingCount = recentActivity.filter((transaction) => transaction.direction === "outgoing").length;
  const trendPoints = buildPortfolioTrend(estimatedTotalUsd);
  const distribution = buildDistribution(nativeAssetDistribution);
  const kpis = [
    { icon: "USD", label: "Balance estimado", value: totalLabel, hint: "Solo activos nativos" },
    { icon: "AS", label: "Activos", value: nativeBalanceSummary.length, hint: "SOL, tBNB y BTC" },
    { icon: "IN", label: "Recibido", value: incomingCount, hint: "Movimientos recientes" },
    { icon: "OUT", label: "Enviado", value: outgoingCount, hint: "Movimientos recientes" },
  ];

  return (
    <>
      <section className="dashboard-modern-grid">
        <article className="dashboard-card wallet-balance-card dashboard-hero-card">
          <div className="dashboard-balance-layout">
            <div>
              <p className="card-label">Balance total estimado</p>
              <div className={`balance ${estimatedTotalUsdError ? "balance--unavailable" : ""}`}>
                {totalLabel} {!estimatedTotalUsdError && !estimatedTotalUsdLoading ? <span>USD</span> : null}
              </div>
              <p className="dashboard-note">
                Activos en redes de prueba, sin valor comercial real. Hola, {displayName}.
              </p>
              <p className={`dashboard-balance-state dashboard-balance-state--${balanceStatus}`}>
                {getBalanceStatusLabel(balanceStatus)}
                {balanceUpdateLabel ? ` · Ultima actualizacion: ${balanceUpdateLabel}` : ""}
              </p>
              {priceStatus === "cached" ? (
                <p className="dashboard-note dashboard-balance-cache-note">
                  Usando precios cacheados{priceUpdateLabel ? ` · ${priceUpdateLabel}` : ""}.
                </p>
              ) : null}
            </div>

            <div className="balance-hero-mark" aria-hidden="true">
              <span>NW</span>
            </div>
          </div>

          {estimatedTotalUsdError ? <p className="negative dashboard-soft-warning">Valor estimado no disponible por el momento.</p> : null}

          <div className="native-balance-list native-balance-list--compact" aria-label="Activos nativos incluidos en el total estimado">
            {nativeBalanceSummary.map((asset) => (
              <div className="native-balance-row" key={asset.label}>
                <span>{asset.label}</span>
                <strong>{asset.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <section className="dashboard-kpi-grid" aria-label="Indicadores del dashboard">
          {kpis.map((kpi) => (
            <article className="dashboard-kpi-card" key={kpi.label}>
              <span className="dashboard-kpi-card__icon" aria-hidden="true">{kpi.icon}</span>
              <div>
                <p>{kpi.label}</p>
                <strong>{kpi.value}</strong>
                <small>{kpi.hint}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="dashboard-chart-grid">
          <article className="dashboard-card dashboard-chart-card">
            <div className="card-header-row">
              <div>
                <h2>Evolucion del portafolio</h2>
                <p className="dashboard-note">Vista estimada para sustentar la tendencia del balance.</p>
              </div>
              <span className="card-pill card-pill--muted">Demo visual</span>
            </div>
            <PortfolioTrendChart points={trendPoints} />
          </article>

          <article className="dashboard-card dashboard-chart-card dashboard-chart-card--compact">
            <div className="card-header-row">
              <div>
                <h2>Distribucion</h2>
                <p className="dashboard-note">Proporcion por activos nativos.</p>
              </div>
            </div>
            <AssetDistributionChart distribution={distribution} />
          </article>
        </section>

        <section className="dashboard-bottom-grid">
          <article className="dashboard-card recent-activity-card nova-card--interactive">
            <div className="card-header-row">
              <div>
                <h2>Actividad reciente</h2>
                <p className="dashboard-note">Ultimos movimientos sincronizados.</p>
                <p className={`dashboard-activity-status ${activitySyncing ? "dashboard-activity-status--loading" : ""}`}>
                  {activityStatusLabel}
                </p>
              </div>
              <div className="placeholder-actions" style={{ marginTop: 0 }}>
                <button className="inline-link-text" type="button" onClick={onRefreshActivity} disabled={activitySyncing}>
                  {activitySyncing ? "Actualizando..." : "Actualizar"}
                </button>
                <Link className="inline-link-text" to={APP_ROUTES.transactionHistory}>Ver historial</Link>
              </div>
            </div>

            {activitySyncing ? (
              <p className="dashboard-note dashboard-activity-sync-copy">
                {hasActivity
                  ? "Actualizando actividad sin ocultar los movimientos actuales."
                  : "Consultando movimientos en Solana, BNB y Bitcoin Testnet."}
              </p>
            ) : null}
            {activitySyncNotice && !activitySyncing ? <p className="dashboard-note">{activitySyncNotice}</p> : null}
            {activityError ? <p className="dashboard-soft-warning">{activityError}</p> : null}

            {hasActivity ? (
              <div className="dashboard-activity-list">
                {recentActivity.map((transaction) => {
                  const symbol = getActivitySymbol(transaction);
                  const isIncoming = transaction.direction === "incoming";

                  return (
                    <article className="dashboard-activity-row" key={transaction.id}>
                      <span className={`dashboard-activity-icon ${isIncoming ? "incoming" : "outgoing"}`} aria-hidden="true">
                        {isIncoming ? "IN" : "OUT"}
                      </span>
                      <div className="dashboard-activity-main">
                        <strong>{getDirectionLabel(transaction.direction)}</strong>
                        <span>{getNetworkLabel(transaction.network)} - {symbol}</span>
                      </div>
                      <div className="dashboard-activity-amount">
                        <strong>{isIncoming ? "+" : "-"}{formatActivityAmount(transaction.amount)} {symbol}</strong>
                        <span>{formatDate(getTransactionDate(transaction))}</span>
                      </div>
                      <div className="dashboard-activity-meta">
                        <span className={`history-status-pill history-status-pill--${transaction.status || "registered"}`}>
                          {getStatusLabel(transaction.status)}
                        </span>
                        <small>{formatShortHash(transaction.txHash || transaction.signature)}</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {showActivitySkeleton ? <ActivitySkeletonRows /> : null}

            {showActivityEmpty ? (
              <div className="empty-activity-state dashboard-empty-state">
                <span aria-hidden="true">TX</span>
                <strong>Aun no tienes movimientos</strong>
                <p>Envia, recibe o actualiza actividad para ver tus transacciones.</p>
              </div>
            ) : null}
          </article>

          <article className="dashboard-card dashboard-quick-actions-card">
            <div className="card-header-row">
              <div>
                <h2>Acciones rapidas</h2>
                <p className="dashboard-note">Atajos principales de la wallet.</p>
              </div>
            </div>

            <div className="dashboard-quick-action-grid">
              {QUICK_ACTIONS.map((action) => (
                <Link className="dashboard-quick-action" to={action.to} key={action.label}>
                  <span aria-hidden="true">{action.icon}</span>
                  <strong>{action.label}</strong>
                </Link>
              ))}
            </div>
          </article>
        </section>
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
