import { useState } from "react";

function SeedPhraseCard({ words }) {
  const [copyStatus, setCopyStatus] = useState("");

  async function handleCopyPhrase() {
    if (!navigator.clipboard) {
      setCopyStatus("Copia manualmente las palabras en orden.");
      return;
    }

    try {
      await navigator.clipboard.writeText(words.join(" "));
      setCopyStatus("Frase copiada temporalmente al portapapeles.");
    } catch {
      setCopyStatus("No se pudo copiar. Copia manualmente las palabras en orden.");
    }
  }

  return (
    <article className="placeholder-card placeholder-card--accent wallet-auth-card wallet-onboarding-card seed-phrase-wallet-card">
      <div className="seed-card-badge">Generada localmente</div>
      <p className="placeholder-kicker">Frase de recuperación</p>
      <h2 className="placeholder-title">Tus 12 palabras</h2>
      <p className="placeholder-copy">
        Esta frase es la única manera de recuperar tu billetera. NovaWallet no la guarda en Firebase
        ni en el navegador.
      </p>

      <div className="seed-secret-warning">
        <strong>No compartas tu frase de recuperación</strong>
        <span>Si alguien tiene estas palabras, puede controlar tu wallet.</span>
      </div>

      <div className="seed-word-grid">
        {words.map((word, index) => (
          <div className="seed-word-item" key={`${index + 1}-${word}`}>
            <span>
              {index + 1}
            </span>
            <strong>{word}</strong>
          </div>
        ))}
      </div>

      <div className="placeholder-actions" style={{ marginTop: "18px" }}>
        <button className="auth-button-secondary wallet-secondary-btn" type="button" onClick={handleCopyPhrase}>
          Copiar frase
        </button>
      </div>

      {copyStatus ? <p className="wallet-seed-counter wallet-seed-copy-status">{copyStatus}</p> : null}
    </article>
  );
}

export default SeedPhraseCard;
