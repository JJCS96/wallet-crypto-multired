import {
  futureWalletSteps,
  getFormattedWalletNetworks,
  getTotalWalletBalance,
} from "../data/dashboard.mock";
import UiIcon from "../components/UiIcon";

function Wallet({ user, userSettings }) {
  const selectedCurrency = userSettings?.currency || "USD";
  const formattedWalletNetworks = getFormattedWalletNetworks(selectedCurrency);
  // Sumamos valores demo para mostrar un resumen global del portafolio.
  const totalBalance = getTotalWalletBalance(selectedCurrency);

  return (
    <section className="protected-screen">
      <section className="wallet-overview-grid">
        <article className="dashboard-card feature-panel wallet-summary-card">
          <div className="card-header-row">
            <div>
              <p className="card-label">Saldo total estimado</p>
              <h2 className="wallet-balance-title">{totalBalance}</h2>
            </div>

            <span className="card-pill">Demo</span>
          </div>

          <p className="dashboard-note">
            Este bloque resume cuentas de ejemplo para {user?.displayName || user?.email} mientras
            la wallet real sigue fuera de alcance.
          </p>

          <div className="wallet-highlights">
            <div className="wallet-highlight-item">
              <span>Redes preparadas</span>
              <strong>3</strong>
            </div>

            <div className="wallet-highlight-item">
              <span>Custodia en servidor</span>
              <strong>No</strong>
            </div>

            <div className="wallet-highlight-item">
              <span>Usuario activo</span>
              <strong>{user?.displayName || user?.email}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card feature-panel wallet-status-card">
          <h3>Estado actual</h3>
          <ul className="feature-list">
            <li>Autenticacion web funcionando con Firebase.</li>
            <li>Sesion persistente y dashboard protegido.</li>
            <li>Sin seed phrase ni claves privadas en servidor.</li>
            <li>Base visual lista para cuentas multicadena.</li>
          </ul>
        </article>
      </section>

      <section className="wallet-network-grid">
        {/* Recorremos una sola lista para pintar las tarjetas de cada red. */}
        {formattedWalletNetworks.map((network) => (
          <article key={network.symbol} className="dashboard-card feature-panel wallet-network-card">
            <div className="wallet-network-header">
              <div className="wallet-network-title-group">
                <span className={network.colorClassName} aria-hidden="true" />

                <div>
                  <h3>{network.name}</h3>
                  <p className="dashboard-note">Cuenta principal de {network.symbol}</p>
                </div>
              </div>

              <span className={network.change.startsWith("-") ? "negative" : "positive"}>
                {network.change}
              </span>
            </div>

            <div className="wallet-network-balance-row">
              <strong>
                {network.balance} {network.symbol}
              </strong>
              <span>{network.formattedValue}</span>
            </div>

            <div className="wallet-address-box">
              <span>Direccion demo</span>
              <strong>{network.address}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="feature-grid">
        <article className="dashboard-card feature-panel">
          <h3>Preparado para despues</h3>
          <ul className="feature-list">
            {futureWalletSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>

        <article className="dashboard-card feature-panel">
          <h3>Crear o importar wallet</h3>
          <p>
            Esta zona representa el flujo futuro donde el usuario podra crear una wallet nueva o
            importar una existente sin almacenar datos sensibles en Firebase.
          </p>

          <div className="wallet-action-grid">
            <button className="quick-action wallet-action-card" type="button">
              <span className="quick-action-icon" aria-hidden="true">
                <UiIcon name="create" className="quick-action-svg" />
              </span>
              <span>Crear wallet</span>
            </button>

            <button className="quick-action wallet-action-card" type="button">
              <span className="quick-action-icon" aria-hidden="true">
                <UiIcon name="import" className="quick-action-svg" />
              </span>
              <span>Importar wallet</span>
            </button>
          </div>
        </article>
      </section>
    </section>
  );
}

export default Wallet;
