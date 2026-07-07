export const NETWORKS = {
  solana: {
    id: "solana",
    label: "Solana Devnet",
    shortLabel: "SOL",
    derivationPath: "m/44'/501'/0'/0'",
  },
  bitcoin: {
    id: "bitcoin",
    label: "Bitcoin Testnet",
    shortLabel: "BTC",
    derivationPath: "m/84'/1'/0'/0/0",
    explorerAddressBaseUrl: "https://mempool.space/testnet/address/",
    explorerTxBaseUrl: "https://mempool.space/testnet/tx/",
  },
  bnb: {
    id: "bnb",
    label: "BNB Smart Chain Testnet",
    shortLabel: "tBNB",
    chainId: 97,
    derivationPath: "m/44'/60'/0'/0/0",
    explorerAddressBaseUrl: "https://testnet.bscscan.com/address/",
    explorerTxBaseUrl: "https://testnet.bscscan.com/tx/",
  },
};

export const SUPPORTED_NETWORK_IDS = Object.keys(NETWORKS);
