import { getMnemonicWords, validateMnemonicPhrase } from "../services/security/mnemonic.service";

export function getMnemonicValidationResult(mnemonic) {
  const words = getMnemonicWords(mnemonic);
  const validWordCounts = [12, 15, 18, 21, 24];

  if (words.length === 0) {
    return {
      isValid: false,
      message: "Escribe tu seed phrase para continuar.",
      words,
    };
  }

  if (!validWordCounts.includes(words.length)) {
    return {
      isValid: false,
      message:
        "La frase semilla está incompleta o tiene un número de palabras inválido. Revisa que esté completa y en el orden correcto.",
      words,
    };
  }

  if (!validateMnemonicPhrase(mnemonic)) {
    return {
      isValid: false,
      message:
        "La frase semilla no es válida. Revisa el orden y la escritura exacta de cada palabra.",
      words,
    };
  }

  return {
    isValid: true,
    message: "",
    words,
  };
}
