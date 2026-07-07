import bip39 from "bip39";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { NETWORKS } from "../../constants/networks";

export function deriveSolanaKeypair(mnemonic) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath(NETWORKS.solana.derivationPath, seed.toString("hex")).key;
  return Keypair.fromSeed(derivedSeed.slice(0, 32));
}

export function deriveSolanaWallet(mnemonic) {
  const keypair = deriveSolanaKeypair(mnemonic);

  return {
    address: keypair.publicKey.toBase58(),
    derivationPath: NETWORKS.solana.derivationPath,
  };
}
