import { clusterApiUrl } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet";
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER);
