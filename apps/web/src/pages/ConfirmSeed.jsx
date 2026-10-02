/**
 * Archivo: ConfirmSeed.jsx
 * Propósito: Valida el respaldo de la frase semilla y crea la wallet definitiva.
 * Funcionalidades:
 * - Solicita palabras específicas de la frase temporal.
 * - Crea el vault cifrado local con contraseña del usuario.
 * - Guarda en Firestore únicamente direcciones públicas.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import SecurityNotice from "../components/security/SecurityNotice";
import SeedConfirmForm from "../components/wallet/SeedConfirmForm";
import WalletCreationSummary from "../components/wallet/WalletCreationSummary";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { getUserWallet } from "../services/user-wallets.service";
import { confirmWalletBackup, getWalletCreationFlow, validateWalletBackupAnswers } from "../services/security/wallet.service";

function validateWalletPassword(password, confirmation) {
  if (password.length < 8) {
    return "La contraseña debe tener mínimo 8 caracteres.";
  }

  if (password !== confirmation) {
    return "Las contraseñas no coinciden.";
  }

  return "";
}

function ConfirmSeed({ user }) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdWallet, setCreatedWallet] = useState(null);
  const [isVaultStepReady, setIsVaultStepReady] = useState(false);
  const [walletPassword, setWalletPassword] = useState("");
  const [walletPasswordConfirmation, setWalletPasswordConfirmation] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      const existingWallet = await getUserWallet(user.uid);

      if (!isMounted) {
        return;
      }

      setWallet(existingWallet);
      setFlow(existingWallet ? null : getWalletCreationFlow(user.uid));
      setLoading(false);
    }

    loadState();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  async function handleConfirmWallet(answers) {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const result = validateWalletBackupAnswers(user.uid, answers);

      if (!result.ok) {
        setSubmitError(result.message);
        return result;
      }

      setIsVaultStepReady(true);
      return result;
    } catch {
      setSubmitError("No se pudo completar la creacion de la wallet. Intenta nuevamente.");
      return {
        ok: false,
        formErrors: {},
      };
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateVault(event) {
    event.preventDefault();
    setSubmitError("");
    const passwordError = validateWalletPassword(walletPassword, walletPasswordConfirmation);

    if (passwordError) {
      setSubmitError(passwordError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Al confirmar, se cifra la frase en el vault local y Firestore recibe solo direcciones públicas.
      let result = await confirmWalletBackup(user.uid, walletPassword);

      if (!result.ok && result.requiresVaultReplacement) {
        const shouldReplace = globalThis.confirm(
          `${result.message} Si continúas, será reemplazado por el de esta nueva wallet. Asegúrate de tener respaldada la frase semilla anterior. ¿Deseas continuar?`,
        );

        if (!shouldReplace) {
          setSubmitError("Creación cancelada. El vault local existente no se modificó.");
          return;
        }

        result = await confirmWalletBackup(user.uid, walletPassword, { replaceExistingVault: true });
      }

      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }

      setCreatedWallet(result.wallet);
      setWalletPassword("");
      setWalletPasswordConfirmation("");
      setIsVaultStepReady(false);
    } catch {
      setSubmitError("No se pudo crear el vault local cifrado. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell
      user={user}
      title="Confirmar frase de recuperación"
      kicker="Billetera lista"
      description="Selecciona las palabras solicitadas para confirmar que guardaste tu frase."
      navigationMode="onboarding"
    >
      {loading ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <p className="placeholder-copy">Preparando la validación de tu respaldo...</p>
          </article>
        </section>
      ) : createdWallet || wallet ? (
        <WalletCreationSummary
          wallet={createdWallet || wallet}
          title="Billetera lista"
          copy="Tus direcciones públicas ya fueron derivadas y guardadas en Firestore. El material sensible se eliminó del flujo temporal en memoria."
        />
      ) : flow && isVaultStepReady ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card">
            <p className="placeholder-kicker">Vault local</p>
            <h2 className="placeholder-title">Crear contraseña de wallet</h2>
            <p className="placeholder-copy">
              Esta contraseña desbloquea tu wallet en este dispositivo. Si la olvidas, deberás restaurar tu wallet con tu frase de recuperación.
            </p>

            {submitError ? <div className="auth-error" style={{ marginTop: "18px" }}>{submitError}</div> : null}

            <form className="auth-form" onSubmit={handleCreateVault} style={{ marginTop: "22px" }}>
              <div className="form-group">
                <label htmlFor="wallet-password">Contraseña de wallet</label>
                <input
                  id="wallet-password"
                  className="wallet-field"
                  type="password"
                  value={walletPassword}
                  onChange={(event) => setWalletPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="form-group">
                <label htmlFor="wallet-password-confirmation">Confirmar contraseña</label>
                <input
                  id="wallet-password-confirmation"
                  className="wallet-field"
                  type="password"
                  value={walletPasswordConfirmation}
                  onChange={(event) => setWalletPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                />
              </div>

              <button className="auth-button wallet-primary-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Cifrando vault..." : "Crear vault local"}
              </button>
            </form>
          </article>
        </section>
      ) : flow ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card">
            <div className="wallet-auth-topbar">
              <button className="wallet-back-button" type="button" onClick={() => navigate(APP_ROUTES.backupSeed)} aria-label="Volver a guardar frase">
                ←
              </button>
              <div className="wallet-step-dots" aria-label="Progreso de creación de billetera">
                <span />
                <span />
                <span className="active" />
              </div>
            </div>
            <p className="placeholder-kicker">Confirmar frase de recuperación</p>
            <h2 className="placeholder-title">Confirmar frase de recuperación</h2>
            <p className="placeholder-copy">
              Selecciona las palabras solicitadas para confirmar que guardaste tu frase.
            </p>
            <SecurityNotice type="seed-backup" style={{ marginTop: "18px", marginBottom: 0 }} />
          </article>

          <SeedConfirmForm
            positions={flow.confirmationPositions}
            loading={isSubmitting}
            errorMessage={submitError}
            onSubmit={handleConfirmWallet}
          />

          <article className="placeholder-card wallet-auth-card wallet-onboarding-card wallet-onboarding-card--compact">
            <div className="placeholder-actions">
              <button className="auth-button-secondary" type="button" onClick={() => navigate(APP_ROUTES.backupSeed)}>
                Volver al paso anterior
              </button>
            </div>
          </article>
        </section>
      ) : (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <WalletEmptyState
              title="No hay una frase de recuperación pendiente por confirmar"
              description="Si recargaste la página o cerraste la sesión, el flujo temporal pudo perderse. Inicia nuevamente la creación de billetera."
              badge="Flujo temporal"
              steps={[
                "La frase de recuperación no se guarda en Firebase.",
                "La creación vive solo en memoria mientras confirmas el respaldo.",
                "Genera una nueva billetera si necesitas reiniciar el proceso.",
              ]}
              primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear una billetera" }}
              secondaryAction={{ to: APP_ROUTES.dashboard, label: "Ir al dashboard" }}
            />
          </article>
        </section>
      )}
    </AppShell>
  );
}

export default ConfirmSeed;
