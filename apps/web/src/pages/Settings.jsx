import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import SecurityNotice from "../components/security/SecurityNotice";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { ASSETS, ASSET_IDS } from "../config/assets";
import { SOLANA_RPC_URL } from "../config/solana";
import { logout } from "../services/auth.service";
import { getUserWallet } from "../services/user-wallets.service";
import { clearAllPendingWalletFlows } from "../services/security/local-wallet-storage.service";
import { clearVaultSession, deleteEncryptedVault, isVaultAvailable } from "../services/security/encrypted-vault.service";

function getStatusClass(status) {
  if (status === "Listo" || status === "Lista" || status === "Activo" || status === "Configurado") {
    return "card-pill--live";
  }

  if (status === "Opcional" || status === "Verificación manual") {
    return "card-pill--warning";
  }

  return "card-pill--muted";
}

function Settings({ user }) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [vaultAvailable, setVaultAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vaultActionLoading, setVaultActionLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setLoading(true);

      try {
        const [currentWallet, hasVault] = await Promise.all([
          getUserWallet(user.uid),
          isVaultAvailable(),
        ]);

        if (isMounted) {
          setWallet(currentWallet);
          setVaultAvailable(hasVault);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  async function handleLogout() {
    clearAllPendingWalletFlows();
    clearVaultSession();
    await logout();
    navigate(APP_ROUTES.login, { replace: true });
  }

  async function handleDeleteVault() {
    setSettingsError("");
    setSettingsMessage("");

    const shouldDelete = globalThis.confirm(
      "Eliminar el vault local de este dispositivo? Necesitaras restaurar tu wallet con tu frase de recuperacion para volver a firmar transacciones aqui.",
    );

    if (!shouldDelete) {
      return;
    }

    setVaultActionLoading(true);

    try {
      await deleteEncryptedVault();
      setVaultAvailable(false);
      setSettingsMessage("Vault local eliminado de este dispositivo.");
    } catch {
      setSettingsError("No se pudo eliminar el vault local. Intenta nuevamente.");
    } finally {
      setVaultActionLoading(false);
    }
  }

  const firebaseReady = Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY
      && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
      && import.meta.env.VITE_FIREBASE_PROJECT_ID
      && import.meta.env.VITE_FIREBASE_APP_ID,
  );
  const bnbRpcReady = Boolean(import.meta.env.VITE_BNB_TESTNET_RPC_URL);
  const systemStatusItems = [
    {
      icon: "FB",
      label: "Firebase",
      status: firebaseReady ? "Listo" : "Pendiente",
      detail: firebaseReady ? "Autenticación y proyecto configurados." : "Revisa VITE_FIREBASE_*.",
    },
    {
      icon: "SOL",
      label: "Solana",
      status: SOLANA_RPC_URL ? "Listo" : "Pendiente",
      detail: "Devnet RPC disponible para balances y envíos.",
    },
    {
      icon: "BTC",
      label: "Bitcoin Testnet",
      status: "Listo",
      detail: "API testnet disponible para UTXOs y actividad.",
    },
    {
      icon: "BNB",
      label: "BNB RPC",
      status: bnbRpcReady ? "Listo" : "No configurado",
      detail: bnbRpcReady ? "BNB Smart Chain Testnet configurado." : "Configura VITE_BNB_TESTNET_RPC_URL.",
    },
    {
      icon: "SPL",
      label: "SPL Mint",
      status: ASSETS[ASSET_IDS.solanaSplDemo].configured ? "Configurado" : "No configurado",
      detail: ASSETS[ASSET_IDS.solanaSplDemo].configured
        ? "Mint demo configurado."
        : "Configura VITE_SOLANA_SPL_DEMO_MINT.",
    },
    {
      icon: "B20",
      label: "BEP20 Contract",
      status: ASSETS[ASSET_IDS.bnbBep20Demo].configured ? "Configurado" : "No configurado",
      detail: ASSETS[ASSET_IDS.bnbBep20Demo].configured
        ? "Contrato demo configurado."
        : "Configura VITE_BNB_BEP20_DEMO_CONTRACT.",
    },
  ];

  return (
    <AppShell
      user={user}
      title="Configuración"
      kicker="Cuenta y seguridad"
      description="Cuenta, seguridad y estado del sistema."
    >
      {loading ? (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--loading">
            <p className="placeholder-copy">Cargando la configuración de tu Wallet...</p>
          </article>
        </section>
      ) : (
        <section className="placeholder-page">
          <div className="placeholder-grid wallet-summary-grid">
            <article className="placeholder-card placeholder-card--accent">
              <p className="placeholder-kicker">Cuenta</p>
              <h2 className="placeholder-title">{user.displayName || "Usuario"}</h2>
              <p className="placeholder-copy">Correo: <strong>{user.email}</strong></p>
              <p className="placeholder-copy">Tema: <strong>Dark (predeterminado)</strong></p>
              <p className="placeholder-copy">Idioma: <strong>Español</strong></p>
              <p className="placeholder-copy">Aplicación: <strong>Nova Wallet PWA</strong></p>
            </article>

            <article className="placeholder-card">
              <p className="placeholder-kicker">Seguridad</p>
              <h2 className="placeholder-title">Estado de tu Wallet</h2>
              {wallet ? (
                <>
                  <p className="placeholder-copy">Wallet pública disponible y asociada a tu cuenta.</p>
                  <p className="placeholder-copy">Recuperación: <strong>solo con frase semilla</strong></p>
                  <p className="placeholder-copy">Vault local: <strong>{vaultAvailable ? "Activo en este dispositivo" : "No configurado"}</strong></p>
                  <p className="placeholder-copy">Firebase almacena unicamente informacion publica o no sensible.</p>
                </>
              ) : (
                <WalletEmptyState
                  title="Aún no has creado tu Wallet"
                  description="Puedes crearla o restaurarla más adelante desde esta misma app."
                  badge="Wallet pendiente"
                  steps={[
                    "Crear Wallet nueva.",
                    "Restaurar Wallet con frase semilla.",
                    "Mantener la frase semilla fuera de Firebase.",
                  ]}
                  primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear Wallet" }}
                  secondaryAction={{ to: APP_ROUTES.restoreWallet, label: "Restaurar Wallet" }}
                />
              )}
            </article>
          </div>

          <article className="placeholder-card">
            <p className="placeholder-kicker">Avisos importantes</p>
            <h2 className="placeholder-title">Protege tu Wallet</h2>
            <SecurityNotice type="seed-backup" style={{ marginTop: "18px" }} />
            <SecurityNotice type="wallet-restore" style={{ marginTop: "18px" }} />
            <SecurityNotice type="sensitive-data" style={{ marginTop: "18px", marginBottom: 0 }} />
          </article>

          <article className="placeholder-card system-status-card">
            <p className="placeholder-kicker">Configuración de NovaWallet</p>
            <h2 className="placeholder-title">Estado del sistema</h2>
            <p className="placeholder-copy">Checklist de servicios y configuración pública.</p>

            <div className="system-status-grid">
              {systemStatusItems.map((item) => (
                <div className="system-status-item" key={item.label}>
                  <span className="system-status-icon" aria-hidden="true">{item.icon}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span className={`card-pill ${getStatusClass(item.status)}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="placeholder-card">
            <p className="placeholder-kicker">Acciones</p>
            <h2 className="placeholder-title">Gestión de la app</h2>
            {settingsError ? <div className="auth-error" style={{ marginTop: "18px" }}>{settingsError}</div> : null}
            {settingsMessage ? <div className="auth-success" style={{ marginTop: "18px" }}>{settingsMessage}</div> : null}
            <div className="placeholder-actions" style={{ marginTop: "18px" }}>
              <button className="auth-button-secondary" type="button" onClick={handleDeleteVault} disabled={!vaultAvailable || vaultActionLoading}>
                {vaultActionLoading ? "Eliminando vault..." : "Eliminar vault local"}
              </button>
              <button className="auth-button-secondary" type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}

export default Settings;
