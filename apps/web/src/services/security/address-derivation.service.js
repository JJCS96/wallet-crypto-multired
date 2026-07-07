import { deriveSolanaWallet } from "../blockchain/solana.service";
import { deriveBitcoinWallet } from "../blockchain/bitcoin.service";
import { deriveBnbWallet } from "../blockchain/bnb.service";
import { normalizeMnemonicPhrase } from "./mnemonic.service";

export function deriveWalletAddresses(mnemonic) {
  const normalizedMnemonic = normalizeMnemonicPhrase(mnemonic);
  const solana = deriveSolanaWallet(normalizedMnemonic);
  const bitcoin = deriveBitcoinWallet(normalizedMnemonic);
  const bnb = deriveBnbWallet(normalizedMnemonic);

  return {
    solanaAddress: solana.address,
    bitcoinAddress: bitcoin.address,
    bnbAddress: bnb.address,
    derivationMeta: {
      solana,
      bitcoin,
      bnb,
    },
  };
}
