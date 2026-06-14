import { Link } from "react-router-dom";
import UiIcon from "../components/UiIcon";

import {
  dashboardModuleCards,
  formatCurrencyFromUsd,
  getFormattedAssets,
  getFormattedHistory,
  getHistoryStatusSummary,
  getTotalWalletBalance,
  quickActions,
} from "../data/dashboard.mock";

/*
  Dashboard protegido.
  Solo se muestra si Firebase detecta una sesión activa.
*/
function Dashboard({ user, userSettings }) {
  const selectedCurrency = userSettings?.currency || "USD";
  const formattedAssets = getFormattedAssets(selectedCurrency);
  const historyStatusSummary = getHistoryStatusSummary();
  const latestActivity = getFormattedHistory(selectedCurrency).slice(0, 3);
  const totalBalance = getTotalWalletBalance(selectedCurrency);
  const portfolioChange = formatCurrencyFromUsd(392.42, selectedCurrency);

  return (
    <section className="protected-screen">
      <article className="dashboard-card surface-banner">
        <div>
          <p className="surface-banner__eyebrow">Estado de la fase web</p>
          <h2>Base protegida lista para evolucionar</h2>
          <p className="dashboard-note surface-banner__copy">
            La autenticacion esta funcional y los modulos de wallet, transferencias, historial y
            ajustes ya tienen una estructura navegable para seguir creciendo antes de integrar
            blockchain.
          </p>
        </div>

        <div className="surface-banner__stats">
          <span className="card-pill">Auth OK</span>
          <span className="card-pill">Firestore OK</span>
          <span className="card-pill">UI Demo</span>
        </div>
      </article>

      <section className="dashboard-grid dashboard-grid--top">
        <article className="dashboard-card balance-card">
          <div className="card-header-row">
            <p className="card-label">Saldo total</p>
            <span className="card-pill">Visible</span>
          </div>

          <div className="balance">
            {totalBalance} <span>{selectedCurrency}</span>
          </div>

          <p className="positive">+3.24% (24h)</p>
          <p className="dashboard-note">
            Valores de demostracion para la fase de autenticacion de {user?.displayName || user?.email}. Variacion estimada de hoy: {portfolioChange}.
          </p>
        </article>

        <article className="dashboard-card chart-card">
          <div className="card-header-row">
            <div>
              <p className="card-label">Portafolio (24h)</p>
              <p className="dashboard-note">Tendencia visual de ejemplo</p>
            </div>

            <div className="chart-range-switcher" aria-label="Rangos de tiempo de la grafica">
              <button className="chart-range-button active" type="button">
                1D
              </button>
              <button className="chart-range-button" type="button">
                7D
              </button>
              <button className="chart-range-button" type="button">
                1M
              </button>
              <button className="chart-range-button" type="button">
                1Y
              </button>
            </div>
          </div>

          <div className="chart-shell">
            <div className="chart-y-axis" aria-hidden="true">
              <span>$13K</span>
              <span>$12K</span>
              <span>$11K</span>
              <span>$10K</span>
            </div>

            <div className="chart-stage">
              <svg className="portfolio-chart" viewBox="0 0 560 190" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="portfolioFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(91, 34, 232, 0.26)" />
                    <stop offset="100%" stopColor="rgba(91, 34, 232, 0.02)" />
                  </linearGradient>
                </defs>

                <path
                  d="M0 130C18 116 36 124 54 103C72 82 90 112 108 86C126 60 144 98 162 88C180 78 198 56 216 62C234 68 252 105 270 95C288 85 306 47 324 42C342 37 360 78 378 92C396 106 414 84 432 72C450 60 468 96 486 108C504 120 522 70 540 56L540 190L0 190Z"
                  fill="url(#portfolioFill)"
                />
                <polyline
                  fill="none"
                  points="0,130 18,116 36,124 54,103 72,82 90,112 108,86 126,60 144,98 162,88 180,78 198,56 216,62 234,68 252,105 270,95 288,85 306,47 324,42 342,37 360,78 378,92 396,106 414,84 432,72 450,60 468,96 486,108 504,120 522,70 540,56"
                  stroke="#6c35f6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
              </svg>

              <div className="chart-x-axis" aria-hidden="true">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-overview-grid">
        {dashboardModuleCards.map((card) => (
          <Link key={card.title} className="dashboard-card dashboard-module-link" to={card.to}>
            <span className="card-pill">{card.value}</span>
            <h2>{card.title}</h2>
            <p className="dashboard-note">{card.description}</p>
            <span className="dashboard-module-link__footer">Abrir modulo</span>
          </Link>
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="dashboard-card dashboard-card--table">
          <h2>Activos</h2>

          <table className="assets-table">
            <thead>
              <tr>
                <th>Activo</th>
                <th>Cantidad</th>
                <th>Precio (USD)</th>
                <th>24h</th>
                <th>Valor (USD)</th>
              </tr>
            </thead>

            <tbody>
              {formattedAssets.map((asset) => (
                <tr key={asset.symbol}>
                  <td>
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
                        <span>{asset.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td>{asset.amount}</td>
                  <td>{asset.formattedPrice}</td>
                  <td className={asset.change.startsWith("-") ? "negative" : "positive"}>
                    {asset.change}
                  </td>
                  <td>{asset.formattedValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="dashboard-card dashboard-card--actions">
          <h2>Acciones rapidas</h2>

          <div className="quick-actions">
            {quickActions.map((action) => (
              <Link key={action.label} className="quick-action" to={action.to}>
                <span className="quick-action-icon" aria-hidden="true">
                  <UiIcon name={action.icon} className="quick-action-svg" />
                </span>

                <span>{action.label}</span>
              </Link>
            ))}
          </div>

          <p className="dashboard-note quick-actions-note">
            Accesos directos para moverte rapido entre los modulos protegidos de esta fase.
          </p>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="dashboard-card feature-panel">
          <div className="card-header-row">
            <div>
              <h2>Actividad reciente</h2>
              <p className="dashboard-note">Resumen conectado al modulo demo de history.</p>
            </div>

            <Link className="inline-link" to="/dashboard/history">
              Ver historial
            </Link>
          </div>

          <div className="dashboard-activity-list">
            {latestActivity.map((item) => (
              <div key={item.id} className="dashboard-activity-item">
                <div>
                  <strong>
                    {item.type} {item.asset}
                  </strong>
                  <p className="dashboard-note">
                    {item.network} · {item.date}
                  </p>
                </div>

                <div className="dashboard-activity-meta">
                  <strong>{item.formattedAmountUsd}</strong>
                  <span
                    className={`history-status ${
                      item.status === "Pendiente"
                        ? "history-status--pending"
                        : item.status === "Fallida"
                          ? "history-status--failed"
                          : ""
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card feature-panel">
          <div className="card-header-row">
            <div>
              <h2>Estado de modulos</h2>
              <p className="dashboard-note">Lectura rapida del avance web actual.</p>
            </div>

            <span className="card-pill">Web</span>
          </div>

          <div className="dashboard-module-status-grid">
            <div className="dashboard-status-item">
              <span>Confirmadas</span>
              <strong>{historyStatusSummary.confirmed}</strong>
            </div>
            <div className="dashboard-status-item">
              <span>Pendientes</span>
              <strong>{historyStatusSummary.pending}</strong>
            </div>
            <div className="dashboard-status-item">
              <span>Fallidas</span>
              <strong>{historyStatusSummary.failed}</strong>
            </div>
            <div className="dashboard-status-item">
              <span>Preferencias</span>
              <strong>3</strong>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}

export default Dashboard;
