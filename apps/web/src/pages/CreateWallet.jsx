import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import SeedPhraseCard from "../components/wallet/SeedPhraseCard";
import WalletCreationSummary from "../components/wallet/WalletCreationSummary";
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

function CreateWallet({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [flow, setFlow] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPageState() {
      setLoading(true);
      setError("");

      try {
        const existingWallet = await getUserWallet(user.uid);

        if (!isMounted) {
          return;
        }

        if (existingWallet) {
          setWallet(existingWallet);
          setFlow(null);
          return;
        }

        const nextFlow = getWalletCreationFlow(user.uid);
        setWallet(null);
        setFlow(nextFlow);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        console.error("Error al preparar la creación de Wallet:", loadError?.message || loadError);
        setFlow(null);
        setWallet(null);

        setError(getWalletCreationErrorMessage(loadError));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPageState();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  function handleContinueToBackup() {
    moveWalletFlowToBackup(user.uid);
    navigate(APP_ROUTES.backupSeed);
  }

  function handleStartWalletCreation() {
    setError("");

    try {
      const nextFlow = startWalletCreation(user.uid);
      setFlow(nextFlow);
    } catch (startError) {
      console.error("Error al iniciar la creación de Wallet:", startError?.message || startError);
      setError(getWalletCreationErrorMessage(startError));
    }
  }

  function handleDiscardCurrentFlow() {
    setError("");
    setFlow(null);

    try {
      discardWalletCreation(user.uid);
      const nextFlow = startWalletCreation(user.uid);
      setFlow(nextFlow);
    } catch (discardError) {
      console.error("Error al descartar y regenerar la Wallet:", discardError?.message || discardError);
      setError(getWalletCreationErrorMessage(discardError));
    }
  }

  function handleRetryCreation() {
    discardWalletCreation(user.uid);
    setError("");
    setLoading(true);

    try {
      const nextFlow = startWalletCreation(user.uid);
      setFlow(nextFlow);
    } catch (retryError) {
      console.error("Error al reintentar la creación de Wallet:", retryError?.message || retryError);
      setError(getWalletCreationErrorMessage(retryError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      user={user}
      title="Crear una billetera"
      kicker="Nueva wallet"
      description="Crea una wallet nueva usando una frase de recuperación generada localmente."
      navigationMode="onboarding"
    >
      {loading ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <p className="placeholder-copy">Preparando la creación de tu billetera...</p>
          </article>
        </section>
      ) : wallet ? (
        <WalletCreationSummary
          wallet={wallet}
          title="Ya tienes una billetera creada"
          copy="Tus direcciones públicas ya existen en Firestore. No se vuelve a generar ni mostrar una nueva frase de recuperación automáticamente."
        />
      ) : flow?.stage === WALLET_FLOW_STAGES.seedVisible ? (
        <section className="placeholder-page wallet-onboarding-page wallet-onboarding-page--wide">
          <SeedPhraseCard key={flow.createdAt} words={flow.words}>
            <button className="auth-button wallet-primary-btn" type="button" onClick={handleContinueToBackup}>
              Ya la guardé, continuar
            </button>
            <button className="auth-button-secondary wallet-secondary-btn" type="button" onClick={handleDiscardCurrentFlow}>
              Descartar y generar otra
            </button>
          </SeedPhraseCard>

          <article className="placeholder-card wallet-auth-card wallet-onboarding-card wallet-seed-guidance-card">
            <div className="wallet-auth-topbar">
              <button className="wallet-back-button" type="button" onClick={() => navigate(APP_ROUTES.dashboard)} aria-label="Volver al dashboard">
                ←
              </button>
              <div className="wallet-step-dots" aria-label="Progreso de creación de billetera">
                <span className="active" />
                <span />
                <span />
              </div>
            </div>
            <p className="placeholder-kicker">Respaldo seguro</p>
            <h2 className="placeholder-title">Antes de continuar</h2>
            <p className="placeholder-copy">
              Guarda la frase en el mismo orden y confirma el respaldo en el siguiente paso.
            </p>
            <div className="wallet-process-card wallet-process-card--dark">
              <p className="wallet-process-card__title">Pasos para dejar tu billetera lista</p>
              <div className="wallet-process-flow">
                <span className="complete">Crear billetera</span>
                <span className="active">Generar frase de recuperación</span>
                <span>Guardar frase de recuperación</span>
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

            {error ? (
              <div className="auth-error" style={{ marginTop: "18px" }}>
                {error}
              </div>
            ) : null}

          </article>
        </section>
      ) : error ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card">
            <p className="placeholder-kicker">Error de seguridad</p>
            <h2 className="placeholder-title">No se pudo generar tu frase de recuperación</h2>
            <p className="placeholder-copy">{error}</p>

            <div className="placeholder-actions" style={{ marginTop: "18px" }}>
              <button className="auth-button" type="button" onClick={handleRetryCreation}>
                Reintentar creación
              </button>
              <button className="auth-button-secondary" type="button" onClick={() => navigate(APP_ROUTES.dashboard)}>
                Volver al Dashboard
              </button>
            </div>
          </article>
        </section>
      ) : !flow ? (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card">
            <div className="wallet-auth-topbar">
              <button className="wallet-back-button" type="button" onClick={() => navigate(APP_ROUTES.dashboard)} aria-label="Volver al dashboard">
                ←
              </button>
              <div className="wallet-step-dots" aria-label="Progreso de creación de billetera">
                <span className="active" />
                <span />
                <span />
              </div>
            </div>
            <div className="wallet-hero-icon" aria-hidden="true">NW</div>
            <p className="placeholder-kicker">Crear una billetera</p>
            <h2 className="placeholder-title">Crear una billetera</h2>
            <p className="placeholder-copy">
              Crea una wallet nueva usando una frase de recuperación generada localmente.
            </p>

            <div className="wallet-info-grid" aria-label="Información antes de crear una billetera">
              <article className="wallet-action-tile">
                <span className="wallet-action-tile__icon" aria-hidden="true">12</span>
                <div>
                  <strong>Frase de recuperación</strong>
                  <span>NovaWallet generará 12 palabras únicas para crear tu wallet.</span>
                </div>
              </article>
              <article className="wallet-action-tile">
                <span className="wallet-action-tile__icon" aria-hidden="true">LC</span>
                <div>
                  <strong>Seguridad local</strong>
                  <span>Tu frase semilla no se guarda en Firebase ni en el navegador.</span>
                </div>
              </article>
              <article className="wallet-action-tile">
                <span className="wallet-action-tile__icon" aria-hidden="true">!</span>
                <div>
                  <strong>Única forma de recuperación</strong>
                  <span>Si pierdes tus 12 palabras, no podrás recuperar tu wallet.</span>
                </div>
              </article>
              <article className="wallet-action-tile">
                <span className="wallet-action-tile__icon" aria-hidden="true">3</span>
                <div>
                  <strong>Multired</strong>
                  <span>Se generarán direcciones públicas para Solana, BNB y Bitcoin.</span>
                </div>
              </article>
            </div>

            {error ? (
              <div className="auth-error" style={{ marginTop: "18px" }}>
                {error}
              </div>
            ) : null}

            <div className="placeholder-actions" style={{ marginTop: "22px" }}>
              <button className="auth-button wallet-primary-btn" type="button" onClick={handleStartWalletCreation}>
                Crear frase de recuperación
              </button>
              <button className="auth-button-secondary wallet-secondary-btn" type="button" onClick={() => navigate(APP_ROUTES.restoreWallet)}>
                Ya tengo una frase de recuperación
              </button>
            </div>
          </article>
        </section>
      ) : (
        <section className="placeholder-page wallet-onboarding-page">
          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <WalletEmptyState
              title="La frase de recuperación ya no se muestra en esta etapa"
              description="Para mantener el flujo seguro, la frase solo se revela en el primer paso. Continúa con la confirmación o descarta la billetera provisional si necesitas reiniciar."
              badge="Visibilidad limitada"
              steps={[
                "La frase de recuperación ya fue generada localmente.",
                "No se ha guardado en Firebase.",
                "Todavía puedes confirmar el respaldo para crear las direcciones públicas.",
              ]}
            >
              {error ? (
                <div className="auth-error" style={{ marginTop: "18px" }}>
                  {error}
                </div>
              ) : null}
              <div className="placeholder-actions" style={{ marginTop: "18px" }}>
                <button className="auth-button" type="button" onClick={() => navigate(APP_ROUTES.confirmSeed)}>
                  Ir a confirmación
                </button>
                <button className="auth-button-secondary" type="button" onClick={handleDiscardCurrentFlow}>
                  Reiniciar creación de billetera
                </button>
              </div>
            </WalletEmptyState>
          </article>
        </section>
      )}
    </AppShell>
  );
}

export default CreateWallet;
