// Importamos hooks de React.
// useState guarda estados como usuario y carga.
// useEffect ejecuta código cuando inicia la app.
import { useEffect, useState } from "react";

// Importamos herramientas de React Router.
// BrowserRouter habilita las rutas.
// Routes y Route definen las pantallas.
// Navigate redirige al usuario.
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Firebase escucha si hay sesión activa.
import { onAuthStateChanged } from "firebase/auth";

// Importamos la configuración de Firebase Authentication.
import { auth } from "./lib/firebase";

// Importamos estilos generales del módulo auth.
import "./styles/auth.css";

// Importamos pantallas.
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Wallet from "./pages/Wallet";
import Transfer from "./pages/Transfer";
import History from "./pages/History";
import Settings from "./pages/Settings";
import DashboardLayout from "./components/DashboardLayout";
import { defaultSettings, getUserSettings } from "./services/settings.service";

// Este helper evita duplicar la misma condición en todas las rutas públicas.
// Si el usuario ya inició sesión, lo mandamos al Dashboard.
function PublicOnlyRoute({ user, children }) {
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// Este helper protege rutas privadas.
// Si todavía no hay usuario autenticado, enviamos al login.
function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  // Guarda el usuario autenticado.
  // Si es null, significa que no hay sesión activa.
  const [user, setUser] = useState(null);

  // Separamos la resolucion de auth de la carga de preferencias para evitar parpadeos.
  const [authResolved, setAuthResolved] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Guardamos preferencias globales del usuario para aplicarlas en toda la app.
  const [userSettings, setUserSettings] = useState(defaultSettings);

  useEffect(() => {
    // onAuthStateChanged revisa si hay usuario logueado.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);
      setSettingsLoading(Boolean(currentUser));

      // Si no hay sesion, dejamos el tema base claro para pantallas publicas.
      if (!currentUser) {
        setUserSettings(defaultSettings);
      }
    });

    // Limpiamos el listener cuando el componente deje de usarse.
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadGlobalSettings() {
      if (!user?.uid) {
        setSettingsLoading(false);
        return;
      }

      try {
        // Cargamos preferencias del usuario para aplicarlas globalmente.
        const currentSettings = await getUserSettings(user.uid);

        if (!ignore) {
          setUserSettings({
            theme: currentSettings.theme,
            language: currentSettings.language,
            currency: currentSettings.currency,
          });
        }
      } catch (error) {
        console.error("Error al cargar preferencias globales:", error);

        if (!ignore) {
          setUserSettings(defaultSettings);
        }
      } finally {
        if (!ignore) {
          setSettingsLoading(false);
        }
      }
    }

    loadGlobalSettings();

    return () => {
      ignore = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    // Aplicamos el tema elegido al documento para que toda la UI reaccione al cambio.
    document.documentElement.dataset.theme = user ? userSettings.theme : "light";
  }, [user, userSettings.theme]);

  const loading = !authResolved || settingsLoading;

  function handleSettingsSaved(nextSettings) {
    // Cuando Settings guarda cambios, sincronizamos la preferencia en memoria.
    setUserSettings((currentSettings) => ({
      ...currentSettings,
      ...nextSettings,
    }));
  }

  return (
    <BrowserRouter>
      {/* 
        Importante:
        BrowserRouter envuelve TODO.
        Así Splash puede usar Link sin romper el proyecto.
      */}
      {loading ? (
        <Splash isCheckingSession />
      ) : (
        <Routes>
          {/* 
            Ruta principal.
            Si hay sesión, va al Dashboard.
            Si no hay sesión, muestra Splash.
          */}
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" replace /> : <Splash />}
          />

          {/* 
            Login.
            Si ya hay sesión activa, no dejamos volver al login.
          */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute user={user}>
                <Login />
              </PublicOnlyRoute>
            }
          />

          {/* 
            Registro.
            Si ya hay sesión activa, enviamos al Dashboard.
          */}
          <Route
            path="/register"
            element={
              <PublicOnlyRoute user={user}>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* 
            Recuperar contraseña.
            Solo se usa cuando no hay sesión activa.
          */}
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute user={user}>
                <ForgotPassword />
              </PublicOnlyRoute>
            }
          />

          {/* 
            Dashboard protegido.
            Si no hay usuario, se redirige al Login.
          */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} userSettings={userSettings} />
              </ProtectedRoute>
            }
          >
            {/* La ruta indice mantiene el resumen principal dentro del layout protegido. */}
            <Route index element={<Dashboard user={user} userSettings={userSettings} />} />

            {/* Estas rutas dejan lista la base visual de los modulos siguientes. */}
            <Route path="wallet" element={<Wallet user={user} userSettings={userSettings} />} />
            <Route path="transfer" element={<Transfer user={user} userSettings={userSettings} />} />
            <Route path="history" element={<History userSettings={userSettings} />} />
            <Route
              path="settings"
              element={
                <Settings
                  user={user}
                  userSettings={userSettings}
                  onSettingsSaved={handleSettingsSaved}
                />
              }
            />
          </Route>

          {/* 
            Cualquier ruta desconocida vuelve al inicio.
          */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
