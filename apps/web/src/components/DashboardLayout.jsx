import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import BrandMark from "./BrandMark";
import UiIcon from "./UiIcon";
import { logout } from "../services/auth.service";

// Este menu define las secciones protegidas disponibles en la fase web actual.
const dashboardMenuItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    description: "Resumen general de la app mientras blockchain sigue fuera de alcance.",
  },
  {
    to: "/dashboard/wallet",
    label: "Wallet",
    icon: "wallet",
    description: "Vista base para cuentas, balances y direcciones multicadena.",
  },
  {
    to: "/dashboard/transfer",
    label: "Transferencias",
    icon: "transfer",
    description: "Formulario visual de envio y recepcion sin transaccion real todavia.",
  },
  {
    to: "/dashboard/history",
    label: "Historial",
    icon: "history",
    description: "Historial demo para practicar estados, fechas, hash y filtros.",
  },
  {
    to: "/dashboard/settings",
    label: "Ajustes",
    icon: "settings",
    description: "Preferencias no sensibles del usuario conectadas a Firestore.",
  },
];

// Derivamos el texto del encabezado a partir de la ruta activa.
function getPageMeta(pathname, user) {
  if (pathname === "/dashboard") {
    return {
      kicker: "Primera fase",
      title: "Dashboard",
      description: `Hola, ${user?.displayName || user?.email || "usuario"}. Esta area resume la version web actual de la wallet multired.`,
    };
  }

  const currentItem = dashboardMenuItems.find((item) => item.to === pathname);

  if (currentItem) {
    return {
      kicker: "Ruta protegida",
      title: currentItem.label,
      description: currentItem.description,
    };
  }

  return {
    kicker: "Wallet multired",
    title: "Modulo protegido",
    description: "Seccion reservada para fases siguientes del proyecto.",
  };
}

// Construimos un nombre amable para el header sin depender siempre del email completo.
function getDisplayName(user) {
  if (user?.displayName) {
    return user.displayName;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Usuario";
}

// Generamos iniciales simples para el avatar visual del header.
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

function DashboardLayout({ user, userSettings }) {
  const location = useLocation();
  const navigate = useNavigate();

  const pageMeta = getPageMeta(location.pathname, user);
  const displayName = getDisplayName(user);
  const userInitials = getUserInitials(user);

  async function handleLogout() {
    try {
      // Cerramos la sesion actual en Firebase y volvemos al login.
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    }
  }

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div>
          <BrandMark dark compact />

          <nav className="dashboard-nav" aria-label="Secciones protegidas del dashboard">
            {dashboardMenuItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  `dashboard-menu-item ${isActive ? "active" : ""}`.trim()
                }
                end={item.to === "/dashboard"}
                to={item.to}
              >
                <span className="dashboard-menu-badge" aria-hidden="true">
                  <UiIcon name={item.icon} className="dashboard-menu-icon" />
                </span>

                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <button className="sidebar-logout-button" type="button" onClick={handleLogout}>
          Cerrar sesion
        </button>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">{pageMeta.kicker}</p>
            <h1 className="dashboard-title">{pageMeta.title}</h1>
            <p className="dashboard-description">{pageMeta.description}</p>
          </div>

          <div className="dashboard-userbar">
            <button className="notification-button" type="button">
              Alertas
            </button>

            <div className="dashboard-preference-chip">
              <span>{userSettings?.currency || "USD"}</span>
              <span>{userSettings?.theme || "light"}</span>
            </div>

            <div className="dashboard-userchip">
              <span className="dashboard-avatar">{userInitials}</span>

              <div className="dashboard-usercopy">
                <strong>{displayName}</strong>
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Outlet permite reutilizar el layout y cambiar solo el contenido de cada vista. */}
        <Outlet />
      </section>
    </main>
  );
}

export default DashboardLayout;
