import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import SeedPhraseCard from "../components/wallet/SeedPhraseCard";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { WALLET_FLOW_STAGES } from "../constants/wallet";
import { getUserWallet } from "../services/user-wallets.service";
import { WEB_CRYPTO_ERROR_MESSAGE } from "../services/security/mnemonic.service";
import {
  discardWalletCreation,
  getWalletCreationFlow,
  moveWalletFlowToBackup,
  startWalletCreation,
} from "../services/security/wallet.service";

function getWalletCreationErrorMessage(creationError) {
  if (creationError?.message === WEB_CRYPTO_ERROR_MESSAGE) {
    return "No se puede generar una frase semilla segura en este entorno. Abre NovaWallet desde localhost o HTTPS y vuelve a intentar.";
  }

  return "No se pudo preparar la Wallet. Intenta nuevamente.";
}

function BackupSeed({ user }) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasSavedRecoveryPhrase, setHasSavedRecoveryPhrase] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      const existingWallet = await getUserWallet(user.uid);

      if (!isMounted) {
        return;
      }

      setWallet(existingWallet);

      if (!existingWallet) {
        const pendingFlow = getWalletCreationFlow(user.uid);

        if (pendingFlow?.stage === WALLET_FLOW_STAGES.seedVisible) {
          setFlow(moveWalletFlowToBackup(user.uid));
        } else {
          setFlow(pendingFlow);
        }
      }

      setLoading(false);
    }

    loadState();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  function handleDiscardAndRestart() {
    setError("");
    setHasSavedRecoveryPhrase(false);
    setFlow(null);

    try {
      discardWalletCreation(user.uid);
      startWalletCreation(user.uid);
      navigate(APP_ROUTES.createWallet, { replace: true });
    } catch (restartError) {
      console.error("Error al descartar y regenerar la Wallet:", restartError?.message || restartError);
      setError(getWalletCreationErrorMessage(restartError));
    }
  }

  return (
    <AppShell
      user={user}
      title="Frase de recuperación"
      kicker="Creación de billetera"
      description="Esta frase es la única manera de recuperar tu billetera. No la compartas con nadie."
      navigationMode="onboarding"
    >
      {loading ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <p className="placeholder-copy">Cargando el respaldo de tu Wallet...</p>
          </article>
        </section>
      ) : wallet ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card">
            <p className="placeholder-kicker">Wallet existente</p>
            <h2 className="placeholder-title">Ya hay direcciones públicas guardadas</h2>
            <p className="placeholder-copy">
              Esta Wallet ya fue creada y solo conserva direcciones públicas en Firestore. La frase
              semilla nunca se guarda en la nube.
            </p>
          </article>
        </section>
      ) : flow ? (
        <section className="placeholder-page wallet-onboarding-page wallet-onboarding-page--wide">
          <SeedPhraseCard key={flow.createdAt} words={flow.words}>
            <label className="wallet-recovery-checkbox" htmlFor="recovery-phrase-saved">
              <input
                id="recovery-phrase-saved"
                type="checkbox"
                checked={hasSavedRecoveryPhrase}
                onChange={(event) => setHasSavedRecoveryPhrase(event.target.checked)}
              />
              <span>He guardado mi frase de recuperación</span>
            </label>
            <button
              className="auth-button wallet-primary-btn"
              type="button"
              disabled={!hasSavedRecoveryPhrase}
              onClick={() => navigate(APP_ROUTES.confirmSeed)}
            >
              Ya la guardé, continuar
            </button>
            <button className="auth-button-secondary wallet-secondary-btn" type="button" onClick={handleDiscardAndRestart}>
              Descartar y generar otra
            </button>
          </SeedPhraseCard>

          <article className="placeholder-card wallet-auth-card wallet-onboarding-card wallet-seed-guidance-card">
            <div className="wallet-auth-topbar">
              <button className="wallet-back-button" type="button" onClick={() => navigate(APP_ROUTES.createWallet)} aria-label="Volver a crear billetera">
                ←
              </button>
              <div className="wallet-step-dots" aria-label="Progreso de creación de billetera">
                <span />
                <span className="active" />
                <span />
              </div>
            </div>
            <p className="placeholder-kicker">Respaldo seguro</p>
            <h2 className="placeholder-title">Confirma tu respaldo</h2>
            <p className="placeholder-copy">
              Guarda tus 12 palabras en orden y marca la confirmación cuando estén fuera de NovaWallet.
            </p>
            <div className="wallet-process-card wallet-process-card--dark">
              <p className="wallet-process-card__title">Pasos para dejar tu billetera lista</p>
              <div className="wallet-process-flow">
                <span className="complete">Crear billetera</span>
                <span className="complete">Generar frase de recuperación</span>
                <span className="active">Guardar frase de recuperación</span>
                <span>Confirmar respaldo</span>
                <span>Crear direcciones públicas</span>
                <span>Guardar solo direcciones públicas</span>
              </div>
            </div>
            <div className="wallet-seed-security-list">
              <p>NovaWallet nunca guarda tu frase semilla en Firebase.</p>
              <p>Si pierdes esta frase, no podremos recuperar tu wallet.</p>
              <p>Nunca compartas esta frase con nadie.</p>
            </div>
            <div className="wallet-warning-card wallet-warning-card--dark">
              <strong>Importante</strong>
              <p>Cualquier persona con estas palabras puede controlar tu wallet.</p>
            </div>
            {error ? (
              <div className="auth-error" style={{ marginTop: "18px" }}>
                {error}
              </div>
            ) : null}
          </article>
        </section>
      ) : (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <WalletEmptyState
              title="No hay una billetera pendiente para respaldar"
              description="Primero debes iniciar la creación de billetera para generar localmente una frase de recuperación temporal."
              badge="Flujo no iniciado"
              steps={[
                "Inicia desde Crear una billetera.",
                "Respalda la frase de recuperación cuando se muestre.",
                "Luego vuelve aquí para confirmar el proceso.",
              ]}
              primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear una billetera" }}
              secondaryAction={{ to: APP_ROUTES.dashboard, label: "Ir al dashboard" }}
            >
              {error ? (
                <div className="auth-error" style={{ marginTop: "18px" }}>
                  {error}
                </div>
              ) : null}
            </WalletEmptyState>
          </article>
        </section>
      )}
    </AppShell>
  );
}

export default BackupSeed;
