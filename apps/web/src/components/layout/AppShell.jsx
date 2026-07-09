import { NavLink, useNavigate } from "react-router-dom";
import BrandMark from "../BrandMark";
import { logout } from "../../services/auth.service";
import { clearVaultSession } from "../../services/security/encrypted-vault.service";
import { clearAllPendingWalletFlows } from "../../services/security/local-wallet-storage.service";
import {
  APP_ONBOARDING_ROUTES,
  APP_ROUTES,
  APP_SIDEBAR_ROUTES,
} from "../../constants/routes";

function getDisplayName(user) {
  if (user?.displayName) {
    return user.displayName;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Usuario";
}

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

function AppShell({
  user,
  title,
  kicker = "Wallet PWA",
  description,
  children,
  navigationMode = "default",
}) {
  const navigate = useNavigate();
  const displayName = getDisplayName(user);
  const userInitials = getUserInitials(user);
  const navigationItems = navigationMode === "onboarding" ? APP_ONBOARDING_ROUTES : APP_SIDEBAR_ROUTES;

  async function handleLogout() {
    try {
      clearAllPendingWalletFlows();
      clearVaultSession();
      await logout();
      navigate(APP_ROUTES.login, { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesion:", error?.message || "logout-failed");
    }
  }

  return (
    <main className="dashboard-shell">
      <span className="dashboard-ambient dashboard-ambient--one" aria-hidden="true" />
      <span className="dashboard-ambient dashboard-ambient--two" aria-hidden="true" />
      <aside className="dashboard-sidebar">
        <div>
          <BrandMark dark compact />

          <nav className="dashboard-nav" aria-label="Navegación principal">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `dashboard-menu-item ${isActive ? "active" : ""}`.trim()
                }
              >
                <span className="dashboard-menu-badge" aria-hidden="true">
                  {item.badge}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="dashboard-mobile-nav" aria-label="Accesos rápidos del módulo wallet">
            {navigationItems.slice(1).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `dashboard-menu-item ${isActive ? "active" : ""}`.trim()
                }
              >
                <span className="dashboard-menu-badge" aria-hidden="true">
                  {item.badge}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-network-card">
            <span className="sidebar-network-dot" aria-hidden="true" />
            <div>
              <small>Red activa</small>
              <strong>Solana Devnet</strong>
            </div>
          </div>

          <button className="sidebar-logout-button" type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="dashboard-shell__content">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">{kicker}</p>
            <h1 className="dashboard-title">{title}</h1>
            <p className="dashboard-shell__description">
              {description ||
                "Base web progresiva lista para crecer hacia wallet propia, recuperación por seed y operaciones multired."}
            </p>
          </div>

          <div className="dashboard-userbar">
            <button className="notification-button" type="button" aria-label="Notificaciones">
              NT
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

        {children}
      </section>
    </main>
  );
}

export default AppShell;
