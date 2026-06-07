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

  // Controla si Firebase todavía está verificando la sesión.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged revisa si hay usuario logueado.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Limpiamos el listener cuando el componente deje de usarse.
    return () => unsubscribe();
  }, []);

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
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />

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
