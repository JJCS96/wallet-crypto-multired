import { useNavigate } from "react-router-dom";
import { logout } from "../services/auth.service";
import BrandMark from "../components/BrandMark";

// Datos de ejemplo para la primera fase.
// Se muestran solo como maqueta visual mientras blockchain sigue fuera de alcance.
const sidebarItems = [
  "Dashboard",
  "Activos",
  "Enviar",
  "Recibir",
  "Historial",
  "Direcciones",
  "Ajustes",
];

const assets = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    amount: "0.2487",
    price: "$63,245.10",
    change: "+2.35%",
    value: "$15,729.56",
    color: "#f7931a",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    amount: "1.2500",
    price: "$3,215.45",
    change: "+1.12%",
    value: "$4,019.31",
    color: "#627eea",
  },
  {
    name: "Solana",
    symbol: "SOL",
    amount: "12.5000",
    price: "$146.35",
    change: "-0.85%",
    value: "$1,829.88",
    color: "#14f195",
  },
];

const quickActions = ["Enviar", "Recibir", "Comprar", "Intercambiar"];

// Generamos un nombre amigable para el encabezado del Dashboard.
function getDisplayName(user) {
  if (user?.displayName) {
    return user.displayName;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Usuario";
}

// Creamos iniciales simples para el avatar visual del usuario.
function getUserInitials(user) {
  const sourceName = user?.displayName || user?.email || "US";

  return sourceName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((fragment) => fragment[0])
    .join("")
    .toUpperCase();
}

/*
  Dashboard protegido.
  Solo se muestra si Firebase detecta una sesión activa.
*/
function Dashboard({ user }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      // Cerramos sesión en Firebase Authentication.
      await logout();

      // Redirigimos al usuario al login.
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  const displayName = getDisplayName(user);
  const userInitials = getUserInitials(user);

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div>
          <BrandMark dark compact />

          <nav className="dashboard-nav" aria-label="Secciones del dashboard">
            {sidebarItems.map((item) => (
              <button
                key={item}
                className={`dashboard-menu-item ${item === "Dashboard" ? "active" : ""}`}
                type="button"
              >
                <span className="dashboard-menu-badge" aria-hidden="true">
                  {item.slice(0, 2).toUpperCase()}
                </span>

                <span>{item}</span>
              </button>
            ))}
          </nav>
        </div>

        <button className="sidebar-logout-button" type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Primera fase</p>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-description">
              Hola, {displayName}. Esta vista usa datos demo mientras se integra la capa blockchain.
            </p>
          </div>

          <div className="dashboard-userbar">
            <button className="notification-button" type="button">
              Notif
            </button>

            <div className="dashboard-userchip">
              <span className="dashboard-avatar">{userInitials}</span>

              <div className="dashboard-usercopy">
                <strong>{displayName}</strong>
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="dashboard-grid dashboard-grid--top">
          <article className="dashboard-card balance-card">
            <div className="card-header-row">
              <p className="card-label">Saldo total</p>
              <span className="card-pill">Visible</span>
            </div>

            <div className="balance">
              $12,458.75 <span>USD</span>
            </div>

            <p className="positive">+3.24% (24h)</p>
            <p className="dashboard-note">
              Valores de demostración para la fase de autenticación.
            </p>
          </article>

          <article className="dashboard-card chart-card">
            <div className="card-header-row">
              <div>
                <p className="card-label">Portafolio (24h)</p>
                <p className="dashboard-note">Tendencia visual de ejemplo</p>
              </div>

              <div className="chart-range-switcher" aria-label="Rangos de tiempo de la gráfica">
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
                {assets.map((asset) => (
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
                    <td>{asset.price}</td>
                    <td className={asset.change.startsWith("-") ? "negative" : "positive"}>
                      {asset.change}
                    </td>
                    <td>{asset.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="dashboard-card dashboard-card--actions">
            <h2>Acciones rápidas</h2>

            <div className="quick-actions">
              {quickActions.map((action) => (
                <button key={action} className="quick-action" type="button">
                  <span className="quick-action-icon" aria-hidden="true">
                    {action.slice(0, 2).toUpperCase()}
                  </span>

                  <span>{action}</span>
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

export default Dashboard;
