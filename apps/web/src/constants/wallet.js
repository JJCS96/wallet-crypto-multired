import { NETWORKS } from "./networks";

export const WALLET_COLLECTION_NAME = "wallets";
export const WALLET_DOCUMENT_ID = "main";
export const WALLET_CONFIRMATION_WORDS_COUNT = 3;
export const WALLET_FLOW_TTL_MS = 15 * 60 * 1000;

export const WALLET_FLOW_STAGES = {
  seedVisible: "seed_visible",
  backupReview: "backup_review",
};

export const WALLET_ADDRESS_FIELDS = {
  solanaAddress: NETWORKS.solana.label,
  bitcoinAddress: NETWORKS.bitcoin.label,
  bnbAddress: NETWORKS.bnb.label,
};
