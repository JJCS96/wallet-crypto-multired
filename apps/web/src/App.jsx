/**
 * Archivo: App.jsx
 * Propósito: Define la arquitectura de rutas de NovaWallet y protege el acceso según la sesión de Firebase Auth.
 * Funcionalidades:
 * - Escucha el estado de autenticación del usuario.
 * - Separa rutas públicas, privadas y de onboarding de wallet.
 * - Entrega el usuario autenticado a las pantallas que consultan Firebase, vault local y servicios Web3.
 */
import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { APP_ROUTES } from "./constants/routes";
import "./styles/auth.css";

import Splash from "./pages/Splash";

// Las pantallas se cargan bajo demanda: las librerías de cada red (Solana, ethers,
// bitcoinjs) solo se descargan cuando se abre una pantalla que las necesita.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WalletHome = lazy(() => import("./pages/WalletHome"));
const CreateWallet = lazy(() => import("./pages/CreateWallet"));
const BackupSeed = lazy(() => import("./pages/BackupSeed"));
const ConfirmSeed = lazy(() => import("./pages/ConfirmSeed"));
const RestoreWallet = lazy(() => import("./pages/RestoreWallet"));
const SendTransaction = lazy(() => import("./pages/SendTransaction"));
const ReceiveFunds = lazy(() => import("./pages/ReceiveFunds"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const Settings = lazy(() => import("./pages/Settings"));

function PublicOnlyRoute({ user, children }) {
  return user ? <Navigate to={APP_ROUTES.dashboard} replace /> : children;
}

/**
 * Evita que pantallas internas carguen sin usuario autenticado.
 * La lógica sensible de wallet solo se ejecuta después de resolver la sesión.
 */
function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to={APP_ROUTES.login} replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    // Firebase notifica cambios de sesión sin consultar manualmente credenciales.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = user ? "dark" : "light";
  }, [user]);

  if (!authResolved) {
    return <Splash isCheckingSession />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<Splash isCheckingSession />}>
        <Routes>
          <Route
            path={APP_ROUTES.home}
            element={user ? <Navigate to={APP_ROUTES.dashboard} replace /> : <Splash />}
          />
          <Route
            path={APP_ROUTES.login}
            element={
              <PublicOnlyRoute user={user}>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path={APP_ROUTES.register}
            element={
              <PublicOnlyRoute user={user}>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route
            path={APP_ROUTES.forgotPassword}
            element={
              <PublicOnlyRoute user={user}>
                <ForgotPassword />
              </PublicOnlyRoute>
            }
          />
          <Route
            path={APP_ROUTES.dashboard}
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.walletHome}
            element={
              <ProtectedRoute user={user}>
                <WalletHome user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.createWallet}
            element={
              <ProtectedRoute user={user}>
                <CreateWallet user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.backupSeed}
            element={
              <ProtectedRoute user={user}>
                <BackupSeed user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.confirmSeed}
            element={
              <ProtectedRoute user={user}>
                <ConfirmSeed user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.restoreWallet}
            element={
              <ProtectedRoute user={user}>
                <RestoreWallet user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.sendTransaction}
            element={
              <ProtectedRoute user={user}>
                <SendTransaction user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.receiveFunds}
            element={
              <ProtectedRoute user={user}>
                <ReceiveFunds user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.transactionHistory}
            element={
              <ProtectedRoute user={user}>
                <TransactionHistory user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.settings}
            element={
              <ProtectedRoute user={user}>
                <Settings user={user} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={APP_ROUTES.home} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
