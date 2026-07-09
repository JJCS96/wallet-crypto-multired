import { useRef, useState } from "react";

const SEED_WORD_COUNT = 12;

function normalizeSeedWord(value) {
  return value.trim().toLowerCase();
}

function getWordsFromPhrase(value) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SEED_WORD_COUNT);
}

function RestoreSeedForm({ loading, errorMessage, onPreview }) {
  const [seedWords, setSeedWords] = useState(Array(SEED_WORD_COUNT).fill(""));
  const inputRefs = useRef([]);
  const wordCount = seedWords.filter(Boolean).length;
  const seedPhrase = seedWords.join(" ").trim();
  const wordCountStatus = wordCount === SEED_WORD_COUNT ? "valid" : "warning";

  function focusWord(index) {
    inputRefs.current[index]?.focus();
  }

  function applyWordsFromIndex(startIndex, words) {
    setSeedWords((currentWords) => {
      const nextWords = [...currentWords];

      words.forEach((word, wordIndex) => {
        const targetIndex = startIndex + wordIndex;

        if (targetIndex < SEED_WORD_COUNT) {
          nextWords[targetIndex] = word;
        }
      });

      return nextWords;
    });

    focusWord(Math.min(startIndex + words.length, SEED_WORD_COUNT - 1));
  }

  function handleWordChange(index, value) {
    if (/\s/.test(value)) {
      const words = getWordsFromPhrase(value);
      applyWordsFromIndex(words.length === SEED_WORD_COUNT ? 0 : index, words);
      return;
    }

    const nextWord = normalizeSeedWord(value);

    setSeedWords((currentWords) => {
      const nextWords = [...currentWords];
      nextWords[index] = nextWord;
      return nextWords;
    });
  }

  function handleWordPaste(index, event) {
    const pastedValue = event.clipboardData.getData("text");
    const pastedWords = getWordsFromPhrase(pastedValue);

    if (pastedWords.length > 1) {
      event.preventDefault();
      applyWordsFromIndex(pastedWords.length === SEED_WORD_COUNT ? 0 : index, pastedWords);
    }
  }

  function handleWordKeyDown(index, event) {
    if (event.key === "Backspace" && !seedWords[index] && index > 0) {
      focusWord(index - 1);
      return;
    }

    if (event.key === " " && seedWords[index] && index < SEED_WORD_COUNT - 1) {
      event.preventDefault();
      focusWord(index + 1);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (wordCount !== SEED_WORD_COUNT) {
      return;
    }

    await onPreview(seedPhrase);
  }

  function handleClear() {
    setSeedWords(Array(SEED_WORD_COUNT).fill(""));
    focusWord(0);
  }

  return (
    <article className="placeholder-card wallet-auth-card wallet-onboarding-card restore-seed-card">
      <div className="restore-step-row">
        <span>1</span>
        <strong>Paso 1 de 1</strong>
      </div>

      <p className="placeholder-kicker">Importar frase de recuperacion</p>
      <h2 className="placeholder-title">Importar una billetera</h2>
      <p className="placeholder-copy">
        Ingresa tu frase semilla unicamente si estas en un entorno seguro. Usa las 12 palabras en el mismo orden en que las guardaste.
      </p>

      <div className="seed-security-inline">
        <strong>Nadie de NovaWallet te pedira tu frase de recuperacion.</strong>
        <span>No la compartas ni la guardes en lugares inseguros.</span>
      </div>

      {errorMessage ? (
        <div className="auth-error" style={{ marginTop: "18px" }}>
          {errorMessage}
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: "22px" }}>
        <div className="form-group">
          <label>Frase de recuperacion</label>
          <div className="seed-input-grid" aria-label="Frase de recuperacion de 12 palabras">
            {seedWords.map((word, index) => (
              <label className="seed-word-input-card" htmlFor={`restore-seed-word-${index}`} key={index}>
                <span>{index + 1}</span>
                <input
                  id={`restore-seed-word-${index}`}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  value={word}
                  onChange={(event) => handleWordChange(index, event.target.value)}
                  onPaste={(event) => handleWordPaste(index, event)}
                  onKeyDown={(event) => handleWordKeyDown(index, event)}
                  autoComplete="off"
                  spellCheck="false"
                  inputMode="text"
                  placeholder="Palabra"
                />
              </label>
            ))}
          </div>
          <p className={`wallet-seed-counter wallet-seed-counter--${wordCountStatus}`}>
            Palabras detectadas: <strong>{wordCount} / 12</strong>
            <span>{wordCount === SEED_WORD_COUNT ? "Frase completa." : "Completa las 12 palabras para continuar."}</span>
          </p>
        </div>

        <div className="wallet-auth-actions wallet-auth-actions--inline">
          <button className="auth-button wallet-primary-btn" type="submit" disabled={loading || wordCount !== SEED_WORD_COUNT}>
            {loading ? "Validando frase..." : "Continuar"}
          </button>
          <button className="auth-button-secondary wallet-secondary-btn" type="button" disabled={loading || wordCount === 0} onClick={handleClear}>
            Limpiar
          </button>
        </div>
      </form>
    </article>
  );
}

export default RestoreSeedForm;
