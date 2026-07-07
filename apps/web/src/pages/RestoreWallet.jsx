import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import AddressListCard from "../components/wallet/AddressListCard";
import RestoreSeedForm from "../components/wallet/RestoreSeedForm";
import WalletCreationSummary from "../components/wallet/WalletCreationSummary";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import SecurityNotice from "../components/security/SecurityNotice";
import { APP_ROUTES } from "../constants/routes";
import { getUserWallet } from "../services/user-wallets.service";
import { confirmWalletRecovery, previewWalletRecovery } from "../services/security/wallet-recovery.service";

function validateWalletPassword(password, confirmation) {
  if (password.length < 8) {
    return "La contraseña debe tener mínimo 8 caracteres.";
  }

  if (password !== confirmation) {
    return "Las contraseñas no coinciden.";
  }

  return "";
}

function RestoreWallet({ user }) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewWallet, setPreviewWallet] = useState(null);
  const [restoredWallet, setRestoredWallet] = useState(null);
  const [walletPassword, setWalletPassword] = useState("");
  const [walletPasswordConfirmation, setWalletPasswordConfirmation] = useState("");
  const mnemonicSourceRef = useRef("");

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setLoading(true);

      try {
        const currentWallet = await getUserWallet(user.uid);

        if (isMounted) {
          setWallet(currentWallet);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      mnemonicSourceRef.current = "";
      isMounted = false;
    };
  }, [user.uid]);

  async function handlePreviewRecovery(mnemonic) {
    setPreviewLoading(true);
    setError("");

    try {
      const result = previewWalletRecovery(mnemonic);

      if (!result.ok) {
        mnemonicSourceRef.current = "";
        setPreviewWallet(null);
        setError(result.message);
        return result;
      }

      setPreviewWallet(result.wallet);
      return result;
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSaveRecovery(event) {
    event.preventDefault();
    if (!previewWallet) {
      return;
    }

    const passwordError = validateWalletPassword(walletPassword, walletPasswordConfirmation);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    setConfirmLoading(true);
    setError("");

    try {
      const result = await confirmWalletRecovery(user.uid, mnemonicSourceRef.current, walletPassword);

      if (!result.ok) {
        mnemonicSourceRef.current = "";
        setError(result.message);
        return;
      }

      setRestoredWallet(result.wallet);
      setWallet(result.wallet);
      mnemonicSourceRef.current = "";
      setWalletPassword("");
      setWalletPasswordConfirmation("");
      setPreviewWallet(null);
    } catch {
      setError("No se pudo crear el vault local cifrado. Intenta nuevamente.");
    } finally {
      setConfirmLoading(false);
    }
  }

  function handleResetPreview() {
    mnemonicSourceRef.current = "";
    setWalletPassword("");
    setWalletPasswordConfirmation("");
    setPreviewWallet(null);
    setError("");
  }

  return (
    <AppShell
      user={user}
      title="Importar una billetera"
      kicker="Frase de recuperación"
      description="Ingresa tus 12 palabras en el mismo orden para restaurar tus direcciones."
    >
      {loading ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <p className="placeholder-copy">Preparando la restauración de tu Wallet...</p>
          </article>
        </section>
      ) : restoredWallet ? (
        <WalletCreationSummary
          wallet={restoredWallet}
          title="Wallet restaurada"
          copy="Tus direcciones públicas derivadas desde tu frase semilla ya fueron actualizadas en Firestore. No se guardó información sensible."
        />
      ) : previewWallet ? (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--accent">
            <p className="placeholder-kicker">Vault local</p>
            <h2 className="placeholder-title">Crear contraseña de wallet</h2>
            <p className="placeholder-copy">
              Esta contraseña desbloquea tu wallet en este dispositivo. Si la olvidas, deberás restaurar tu wallet con tu frase de recuperación.
            </p>

            {error ? <div className="auth-error" style={{ marginTop: "18px" }}>{error}</div> : null}

            <form className="auth-form" onSubmit={handleSaveRecovery} style={{ marginTop: "22px" }}>
              <div className="form-group">
                <label htmlFor="restore-wallet-password">Contraseña de wallet</label>
                <input
                  id="restore-wallet-password"
                  className="wallet-field"
                  type="password"
                  value={walletPassword}
                  onChange={(event) => setWalletPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="form-group">
                <label htmlFor="restore-wallet-password-confirmation">Confirmar contraseña</label>
                <input
                  id="restore-wallet-password-confirmation"
                  className="wallet-field"
                  type="password"
                  value={walletPasswordConfirmation}
                  onChange={(event) => setWalletPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                />
              </div>

              <div className="placeholder-actions" style={{ marginTop: "18px" }}>
                <button className="auth-button" type="submit" disabled={confirmLoading}>
                  {confirmLoading ? "Cifrando vault..." : "Crear vault y restaurar"}
                </button>
                <button className="auth-button-secondary" type="button" disabled={confirmLoading} onClick={handleResetPreview}>
                  Ingresar otra frase semilla
                </button>
              </div>
            </form>
          </article>

          <AddressListCard wallet={previewWallet} title="Direcciones públicas restauradas" />
        </section>
      ) : (
        <section className="placeholder-page wallet-onboarding-page wallet-onboarding-page--wide">
          <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card">
            <div className="wallet-auth-topbar">
              <button className="wallet-back-button" type="button" onClick={() => navigate(APP_ROUTES.dashboard)} aria-label="Volver al dashboard">
                ←
              </button>
            </div>
            <div className="wallet-hero-icon" aria-hidden="true">12</div>
            <p className="placeholder-kicker">Importar frase de recuperación</p>
            <h2 className="placeholder-title">Importar una billetera</h2>
            <p className="placeholder-copy">
              Usa tu frase de recuperación para restaurar tus direcciones.
            </p>
            <div className="wallet-action-tile wallet-action-tile--import">
              <span className="wallet-action-tile__icon" aria-hidden="true">↺</span>
              <div>
                <strong>Frase de recuperación</strong>
                <span>Ingresa tus 12 palabras en el mismo orden.</span>
              </div>
            </div>
            <SecurityNotice type="wallet-restore" style={{ marginTop: "18px", marginBottom: 0 }} />
          </article>

          <RestoreSeedForm
            loading={previewLoading}
            errorMessage={error}
            onPreview={async (mnemonic) => {
              const result = await handlePreviewRecovery(mnemonic);

              if (result?.ok) {
                mnemonicSourceRef.current = mnemonic;
                setPreviewWallet(result.wallet);
              }

              return result;
            }}
          />

          {!wallet ? (
            <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
              <WalletEmptyState
                title="Importa una billetera existente"
                description="Si ya tienes una frase de recuperación, puedes reconstruir tus direcciones sin depender del correo."
                badge="Recuperación separada"
                steps={[
                  "Ingresa tus 12 palabras completas en orden.",
                  "Valida localmente las palabras en el navegador.",
                  "Confirma el resumen antes de actualizar Firestore.",
                ]}
                primaryAction={{ to: APP_ROUTES.dashboard, label: "Volver al dashboard" }}
                secondaryAction={{ to: APP_ROUTES.createWallet, label: "Crear una billetera nueva" }}
              />
            </article>
          ) : null}
        </section>
      )}
    </AppShell>
  );
}

export default RestoreWallet;
