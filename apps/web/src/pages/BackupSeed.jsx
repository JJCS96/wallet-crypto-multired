import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import SecurityNotice from "../components/security/SecurityNotice";
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
          <SeedPhraseCard key={flow.createdAt} words={flow.words} />

          <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card">
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
            <p className="placeholder-kicker">Frase de recuperación</p>
            <h2 className="placeholder-title">Guárdala antes de continuar</h2>
            <p className="placeholder-copy">
              Esta frase es la ÚNICA manera de recuperar tu billetera. No la compartas con nadie.
            </p>
            <SecurityNotice type="seed-backup" style={{ marginTop: "18px", marginBottom: 0 }} />
            <div className="wallet-warning-card">
              <strong>Importante</strong>
              <p>
                Nunca compartas esta frase. Cualquier persona con estas palabras puede acceder a tu wallet.
              </p>
            </div>
            {error ? (
              <div className="auth-error" style={{ marginTop: "18px" }}>
                {error}
              </div>
            ) : null}
          </article>

          <article className="placeholder-card wallet-auth-card wallet-onboarding-card">
            <WalletEmptyState
              title="Confirma tu respaldo"
              description="Marca la casilla cuando hayas guardado tus 12 palabras en un lugar seguro fuera de NovaWallet."
              badge="Sin persistencia sensible"
              steps={[
                "Guarda la frase de recuperación en un lugar fuera del navegador.",
                "No la compartas con nadie ni la envíes por correo.",
                "El siguiente paso validará algunas palabras del respaldo.",
              ]}
            >
              <label className="wallet-recovery-checkbox" htmlFor="recovery-phrase-saved">
                <input
                  id="recovery-phrase-saved"
                  type="checkbox"
                  checked={hasSavedRecoveryPhrase}
                  onChange={(event) => setHasSavedRecoveryPhrase(event.target.checked)}
                />
                <span>He guardado mi frase de recuperación</span>
              </label>
              <div className="placeholder-actions" style={{ marginTop: "18px" }}>
                <button className="auth-button wallet-primary-btn" type="button" disabled={!hasSavedRecoveryPhrase} onClick={() => navigate(APP_ROUTES.confirmSeed)}>
                  Continuar
                </button>
                <button className="auth-button-secondary wallet-secondary-btn" type="button" onClick={handleDiscardAndRestart}>
                  Descartar y generar otra
                </button>
              </div>
            </WalletEmptyState>
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
