import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { APP_ROUTES } from "./constants/routes";
import "./styles/auth.css";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import WalletHome from "./pages/WalletHome";
import CreateWallet from "./pages/CreateWallet";
import BackupSeed from "./pages/BackupSeed";
import ConfirmSeed from "./pages/ConfirmSeed";
import RestoreWallet from "./pages/RestoreWallet";
import SendTransaction from "./pages/SendTransaction";
import ReceiveFunds from "./pages/ReceiveFunds";
import TransactionHistory from "./pages/TransactionHistory";
import Settings from "./pages/Settings";

function PublicOnlyRoute({ user, children }) {
  return user ? <Navigate to={APP_ROUTES.dashboard} replace /> : children;
}

function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to={APP_ROUTES.login} replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
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
    </BrowserRouter>
  );
}

export default App;
