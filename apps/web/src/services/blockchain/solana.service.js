/**
 * Archivo: solana.service.js
 * Propósito: Deriva direcciones y keypairs de Solana a partir de la frase semilla.
 * Funcionalidades:
 * - Usa la ruta de derivación configurada para Solana Devnet.
 * - Entrega keypairs solo al flujo local de firma.
 * - No persiste claves privadas ni frase semilla.
 */
import bip39 from "bip39";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { NETWORKS } from "../../constants/networks";

/**
 * Deriva el keypair de Solana desde la frase semilla usando la ruta de Devnet.
 * El resultado se usa en memoria para firmar y no se persiste.
 */
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
