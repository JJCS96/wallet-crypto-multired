import { useEffect, useState } from "react";



import {
  defaultSettings,
  getUserSettings,
  saveUserSettings,
} from "../services/settings.service";

// Opciones simples para poblar selects y mantener el JSX mas legible.
const themeOptions = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const languageOptions = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "English" },
];

const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "COP", label: "COP" },
];

function Settings({ user, userSettings, onSettingsSaved }) {
  // Estados del formulario y mensajes de feedback para la pantalla.
  const [settings, setSettings] = useState(userSettings || defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const currentSettings = await getUserSettings(user.uid);

        if (!ignore) {
          setSettings({
            theme: currentSettings.theme,
            language: currentSettings.language,
            currency: currentSettings.currency,
          });
        }
      } catch (loadError) {
        console.error("Error al cargar configuracion:", loadError);

        if (!ignore) {
          setError("No se pudo cargar la configuracion del usuario.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      ignore = true;
    };
  }, [user?.uid]);

  function handleChange(event) {
    const { name, value } = event.target;

    setSuccessMessage("");
    setError("");
    setSettings((currentSettings) => ({
      ...currentSettings,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user?.uid) {
      setError("No se encontro una sesion valida para guardar la configuracion.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const savedSettings = await saveUserSettings(user.uid, settings);

      setSettings({
        theme: savedSettings.theme,
        language: savedSettings.language,
        currency: savedSettings.currency,
      });

      // Notificamos al componente padre para que el resto de pantallas refleje los cambios.
      onSettingsSaved?.({
        theme: savedSettings.theme,
        language: savedSettings.language,
        currency: savedSettings.currency,
      });
      setSuccessMessage("Configuracion guardada correctamente.");
    } catch (saveError) {
      console.error("Error al guardar configuracion:", saveError);
      setError("No se pudo guardar la configuracion. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="protected-screen">
      <section className="feature-grid">
        <article className="dashboard-card feature-panel">
          <h3>Preferencias guardadas en Firestore</h3>

          <div className="context-hint-box">
            <strong>Solo datos no sensibles</strong>
            <p>
              Aqui se guardan preferencias del usuario. No se almacenan seed phrase, private keys ni
              informacion critica de blockchain.
            </p>
          </div>

          {loading ? <p className="dashboard-note">Cargando configuracion...</p> : null}
          {error ? <div className="auth-error settings-feedback">{error}</div> : null}
          {successMessage ? (
            <div className="auth-success settings-feedback">{successMessage}</div>
          ) : null}

          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="settings-field" htmlFor="settings-theme">
              <span>Tema</span>

              <select
                id="settings-theme"
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                disabled={loading || saving}
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field" htmlFor="settings-language">
              <span>Idioma</span>

              <select
                id="settings-language"
                name="language"
                value={settings.language}
                onChange={handleChange}
                disabled={loading || saving}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field" htmlFor="settings-currency">
              <span>Moneda preferida</span>

              <select
                id="settings-currency"
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                disabled={loading || saving}
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="auth-button settings-submit" type="submit" disabled={loading || saving}>
              {saving ? "Guardando configuracion..." : "Guardar configuracion"}
            </button>
          </form>

          <p className="field-help-text">
            Los cambios se guardan en `settings/{'{uid}'}` dentro de Firestore.
          </p>
        </article>

        <article className="dashboard-card feature-panel">
          <h3>Datos base disponibles</h3>
          <ul className="feature-list">
            <li>Correo autenticado: {user?.email}</li>
            <li>Nombre visible: {user?.displayName || "Sin nombre configurado"}</li>
            <li>Tema actual: {settings.theme}</li>
            <li>Idioma actual: {settings.language}</li>
            <li>Moneda actual: {settings.currency}</li>
          </ul>
        </article>
      </section>

      <article className="dashboard-card feature-panel">
        <h3>Pendiente para hardening</h3>
        <ul className="feature-list">
          <li>Session metadata por dispositivo.</li>
          <li>Reautenticacion para acciones sensibles.</li>
          <li>App Check o reCAPTCHA.</li>
          <li>Opcional: doble factor.</li>
        </ul>
      </article>
    </section>
  );
}

export default Settings;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import SecurityNotice from "../components/security/SecurityNotice";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { ASSETS, ASSET_IDS } from "../config/assets";
import { ADMIN_WALLETS } from "../config/admin-wallets";
import { SOLANA_RPC_URL } from "../config/solana";
import { logout } from "../services/auth.service";
import { getUserWallet } from "../services/user-wallets.service";
import { clearAllPendingWalletFlows } from "../services/security/local-wallet-storage.service";
import { deleteEncryptedVault, isVaultAvailable } from "../services/security/encrypted-vault.service";

function truncatePublicValue(value) {
  if (!value || String(value).includes("PENDING")) {
    return "No configurado";
  }

  const normalizedValue = String(value);

  if (normalizedValue.length <= 14) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 6)}...${normalizedValue.slice(-4)}`;
}

function getStatusClass(status) {
  if (status === "Listo" || status === "Lista" || status === "Activo") {
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
    await logout();
    navigate(APP_ROUTES.login);
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
  const bscScanConfigured = Boolean(import.meta.env.VITE_BSCSCAN_TESTNET_API_KEY);
  const systemStatusItems = [
    {
      label: "Firebase",
      status: firebaseReady ? "Listo" : "Pendiente",
      detail: firebaseReady ? "Variables públicas configuradas." : "Revisa VITE_FIREBASE_* en .env.local.",
    },
    {
      label: "Google Auth",
      status: "Verificación manual",
      detail: "Debe estar habilitado en Firebase Console.",
    },
    {
      label: "Firestore Rules",
      status: "Verificación manual",
      detail: "Publicar reglas antes de la demo.",
    },
    {
      label: "Vault local",
      status: vaultAvailable ? "Activo" : "No configurado",
      detail: vaultAvailable ? "Disponible en este dispositivo." : "Restaura o crea wallet para habilitar firma local.",
    },
    {
      label: "Solana RPC",
      status: SOLANA_RPC_URL ? "Listo" : "Pendiente",
      detail: "Devnet RPC disponible para balances y envíos.",
    },
    {
      label: "Admin Wallet Solana",
      status: ADMIN_WALLETS.solana.includes("PENDING") ? "No configurado" : "Listo",
      detail: truncatePublicValue(ADMIN_WALLETS.solana),
    },
    {
      label: "BNB RPC",
      status: bnbRpcReady ? "Listo" : "No configurado",
      detail: bnbRpcReady ? "BNB Smart Chain Testnet configurado." : "Configura VITE_BNB_TESTNET_RPC_URL.",
    },
    {
      label: "Bitcoin Testnet API",
      status: "Listo",
      detail: "mempool.space testnet o API compatible.",
    },
    {
      label: "SPL Mint",
      status: ASSETS[ASSET_IDS.solanaSplDemo].configured ? "Listo" : "No configurado",
      detail: ASSETS[ASSET_IDS.solanaSplDemo].configured
        ? truncatePublicValue(ASSETS[ASSET_IDS.solanaSplDemo].tokenMint)
        : "Configura VITE_SOLANA_SPL_DEMO_MINT.",
    },
    {
      label: "BEP20 Contract",
      status: ASSETS[ASSET_IDS.bnbBep20Demo].configured ? "Listo" : "No configurado",
      detail: ASSETS[ASSET_IDS.bnbBep20Demo].configured
        ? truncatePublicValue(ASSETS[ASSET_IDS.bnbBep20Demo].tokenAddress)
        : "Configura VITE_BNB_BEP20_DEMO_CONTRACT.",
    },
    {
      label: "BscScan API",
      status: bscScanConfigured ? "Opcional" : "No configurado",
      detail: bscScanConfigured ? "Indexador opcional disponible." : "Opcional para mejorar sync tBNB entrante.",
    },
    {
      label: "PWA",
      status: "Lista",
      detail: "Manifest y service worker configurados.",
    },
    {
      label: "Build",
      status: "Verificación manual",
      detail: "Verificado por comando npm run build.",
    },
  ];

  return (
    <AppShell
      user={user}
      title="Configuración"
      kicker="Cuenta y seguridad"
      description="Ajustes básicos de la aplicación, estado de tu cuenta y recordatorios de seguridad para tu Wallet." 
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
            <p className="placeholder-copy">
              Revisión rápida para demo. No se muestran claves completas ni material sensible.
            </p>

            <div className="system-status-grid">
              {systemStatusItems.map((item) => (
                <div className="system-status-item" key={item.label}>
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
