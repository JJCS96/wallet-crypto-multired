export function normalizeMnemonicValue(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSeedWord(value) {
  return value.trim().toLowerCase();
}

export function buildSeedConfirmationErrors(positions, answers, words) {
  return positions.reduce((result, position) => {
    const expectedWord = words[position];
    const userValue = normalizeSeedWord(answers[position] || "");

    if (!userValue) {
      result[position] = `Escribe la palabra #${position + 1}.`;
      return result;
    }

    if (userValue !== expectedWord) {
      result[position] = `La palabra #${position + 1} no coincide.`;
    }

    return result;
  }, {});
}

export function hasWalletAddresses(wallet) {
  return Boolean(wallet?.solanaAddress && wallet?.bitcoinAddress && wallet?.bnbAddress);
}
