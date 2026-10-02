/**
 * Archivo: Settings.jsx
 * Propósito: Pantalla de configuración, seguridad y estado técnico de NovaWallet.
 * Funcionalidades:
 * - Muestra el estado de Firebase, RPCs y tokens configurables.
 * - Permite acciones de sesión y mantenimiento del vault local.
 * - Explica qué información sensible no se guarda en la nube.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
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
  const [preferences, setPreferences] = useState({
    showUsdBalance: true,
    hideBalances: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setLoading(true);

      try {
        const [currentWallet, hasVault] = await Promise.all([
          getUserWallet(user.uid),
          isVaultAvailable(user.uid),
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

  function handleLockWallet() {
    clearVaultSession();
    setSettingsError("");
    setSettingsMessage("Wallet bloqueada en este navegador. Vuelve a desbloquearla para firmar transacciones.");
  }

  async function handleDeleteVault() {
    setSettingsError("");
    setSettingsMessage("");

    const shouldDelete = globalThis.confirm(
      "¿Eliminar el vault local de este dispositivo? Necesitarás restaurar tu wallet con tu frase de recuperación para volver a firmar transacciones aquí.",
    );

    if (!shouldDelete) {
      return;
    }

    setVaultActionLoading(true);

    try {
      await deleteEncryptedVault(user.uid);
      setVaultAvailable(false);
      setSettingsMessage("Vault local eliminado de este dispositivo.");
    } catch {
      setSettingsError("No se pudo eliminar el vault local. Intenta nuevamente.");
    } finally {
      setVaultActionLoading(false);
    }
  }

  function togglePreference(key) {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: !currentPreferences[key],
    }));
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
      label: "Firebase Auth",
      status: firebaseReady ? "Listo" : "Pendiente",
      detail: firebaseReady ? "Autenticación y proyecto configurados." : "Revisa VITE_FIREBASE_*.",
    },
    {
      icon: "SOL",
      label: "Solana RPC",
      status: SOLANA_RPC_URL ? "Listo" : "Pendiente",
      detail: "Devnet RPC disponible para balances y envíos.",
    },
    {
      icon: "BTC",
      label: "Bitcoin Testnet API",
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
  const accountItems = [
    {
      label: "Nombre",
      value: user.displayName || "Usuario NovaWallet",
      badge: null,
    },
    {
      label: "Correo",
      value: user.email || "Sin correo asociado",
      badge: null,
    },
    {
      label: "Estado de sesión",
      value: "Cuenta autenticada",
      badge: { label: "Activa", tone: "success" },
    },
    {
      label: "Entorno",
      value: "Redes de prueba",
      badge: { label: "Testnet / Devnet", tone: "purple" },
    },
  ];
  const securityItems = [
    {
      icon: "VL",
      title: "Vault local cifrado",
      description: vaultAvailable ? "Activo en este navegador" : "Pendiente de desbloqueo local",
      status: vaultAvailable ? "Activo" : "Pendiente",
      tone: vaultAvailable ? "success" : "muted",
    },
    {
      icon: "FS",
      title: "Frase semilla",
      description: "No almacenada en Firebase",
      status: "Seguro",
      tone: "success",
    },
    {
      icon: "PK",
      title: "Claves privadas",
      description: "Protegidas localmente",
      status: "Protegido",
      tone: "success",
    },
    {
      icon: "DB",
      title: "Firestore",
      description: "Solo datos públicos",
      status: "Seguro",
      tone: "success",
    },
    {
      icon: "CS",
      title: "Cierre de sesión seguro",
      description: "Limpia sesiones locales sensibles",
      status: "Activo",
      tone: "success",
    },
  ];
  const networkItems = [
    {
      icon: "SOL",
      name: "Solana Devnet",
      detail: "SOL y tokens demo configurables",
    },
    {
      icon: "BNB",
      name: "BNB Smart Chain Testnet",
      detail: "tBNB y BEP20 demo configurable",
    },
    {
      icon: "BTC",
      name: "Bitcoin Testnet",
      detail: "BTC nativo en red de prueba",
    },
  ];
  const preferenceItems = [
    {
      id: "showUsdBalance",
      label: "Mostrar balance estimado en USD",
      description: "Visible en Dashboard y Mi Wallet.",
      checked: preferences.showUsdBalance,
      disabled: false,
    },
    {
      id: "hideBalances",
      label: "Ocultar saldos en pantalla",
      description: "Preferencia visual local para privacidad.",
      checked: preferences.hideBalances,
      disabled: false,
    },
    {
      id: "testnetMode",
      label: "Modo testnet",
      description: "NovaWallet opera solo con redes de prueba.",
      checked: true,
      disabled: true,
    },
  ];

  return (
    <AppShell
      user={user}
      title="Configuración"
      kicker="Cuenta y seguridad"
      description="Cuenta, seguridad y preferencias de la wallet."
    >
      {loading ? (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--loading">
            <p className="placeholder-copy">Cargando la configuración de tu Wallet...</p>
          </article>
        </section>
      ) : (
        <section className="placeholder-page settings-page">
          <article className="placeholder-card settings-panel settings-account-panel">
            <div className="settings-section-header">
              <div>
                <p className="placeholder-kicker">Cuenta</p>
                <h2 className="placeholder-title">Perfil de acceso</h2>
                <p className="placeholder-copy">Datos visibles de la sesión autenticada.</p>
              </div>
              <span className={`settings-wallet-state ${wallet ? "settings-wallet-state--ready" : ""}`}>
                {wallet ? "Wallet disponible" : "Wallet pendiente"}
              </span>
            </div>

            <div className="settings-info-grid">
              {accountItems.map((item) => (
                <div className="settings-info-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  {item.badge ? (
                    <span className={`settings-badge settings-badge--${item.badge.tone}`}>{item.badge.label}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="placeholder-card settings-panel">
            <p className="placeholder-kicker">Seguridad</p>
            <div className="settings-section-header settings-section-header--compact">
              <div>
                <h2 className="placeholder-title">Seguridad de la wallet</h2>
                <p className="placeholder-copy">Estado visual de protección sin exponer datos sensibles.</p>
              </div>
            </div>

            <div className="settings-security-grid">
              {securityItems.map((item) => (
                <div className="settings-security-item" key={item.title}>
                  <span className="settings-icon" aria-hidden="true">{item.icon}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                  <span className={`settings-badge settings-badge--${item.tone}`}>{item.status}</span>
                </div>
              ))}
            </div>

            <div className="settings-alert-list">
              <p>Guarda tu frase semilla en un lugar seguro. NovaWallet no puede recuperarla.</p>
              <p>Nunca compartas tu frase semilla ni claves privadas.</p>
            </div>
          </article>

          <article className="placeholder-card settings-panel">
            <p className="placeholder-kicker">Redes</p>
            <div className="settings-section-header settings-section-header--compact">
              <div>
                <h2 className="placeholder-title">Redes disponibles</h2>
                <p className="placeholder-copy">Activos habilitados para la experiencia de prueba.</p>
              </div>
            </div>

            <div className="settings-network-grid">
              {networkItems.map((item) => (
                <div className="settings-network-card" key={item.name}>
                  <span className="settings-network-icon" aria-hidden="true">{item.icon}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span className="settings-badge settings-badge--success">Activa</span>
                </div>
              ))}
            </div>
          </article>

          <article className="placeholder-card settings-panel">
            <p className="placeholder-kicker">Preferencias</p>
            <div className="settings-section-header settings-section-header--compact">
              <div>
                <h2 className="placeholder-title">Preferencias de visualización</h2>
                <p className="placeholder-copy">Opciones locales de interfaz. No cambian la seguridad ni las redes.</p>
              </div>
            </div>

            <div className="settings-preference-list">
              {preferenceItems.map((item) => (
                <div className="settings-preference-item" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </div>
                  <button
                    className={`settings-toggle ${item.checked ? "settings-toggle--active" : ""}`}
                    type="button"
                    onClick={() => togglePreference(item.id)}
                    disabled={item.disabled}
                    aria-pressed={item.checked}
                  >
                    <span aria-hidden="true" />
                    {item.checked ? "Activado" : "Desactivado"}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="placeholder-card settings-panel">
            <p className="placeholder-kicker">Acciones</p>
            <div className="settings-section-header settings-section-header--compact">
              <div>
                <h2 className="placeholder-title">Gestión de la app</h2>
                <p className="placeholder-copy">Controla la sesión y los datos cifrados de este navegador.</p>
              </div>
            </div>

            {settingsError ? <div className="auth-error settings-feedback">{settingsError}</div> : null}
            {settingsMessage ? <div className="auth-success settings-feedback">{settingsMessage}</div> : null}

            <div className="settings-action-row">
              <button className="auth-button settings-primary-action" type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
              <button className="auth-button-secondary" type="button" onClick={handleLockWallet}>
                Bloquear wallet
              </button>
              <button
                className="auth-button-secondary settings-danger-action"
                type="button"
                onClick={handleDeleteVault}
                disabled={!vaultAvailable || vaultActionLoading}
              >
                {vaultActionLoading ? "Eliminando vault..." : "Eliminar vault local"}
              </button>
            </div>
            <p className="settings-danger-note">Esta acción elimina los datos cifrados guardados en este navegador.</p>
          </article>

          <details className="placeholder-card settings-panel settings-technical-details">
            <summary>
              <span>
                <span className="placeholder-kicker">Sistema</span>
                <strong>Detalles técnicos</strong>
              </span>
              <span className="settings-details-indicator">Ver detalles</span>
            </summary>

            <p className="placeholder-copy">Información de configuración para sustentación técnica.</p>
            <div className="system-status-grid settings-technical-grid">
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
          </details>
        </section>
      )}
    </AppShell>
  );
}

export default Settings;
