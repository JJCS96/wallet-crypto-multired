const MOCK_BALANCES = {
  solana: 10,
  bitcoin: 0.05,
  bnb: 2,
};

export async function getMockBalanceByNetwork(networkId) {
  return {
    network: networkId,
    balance: MOCK_BALANCES[networkId] || 0,
    source: "simulated",
  };
}

export function getAllMockBalances() {
  return { ...MOCK_BALANCES };
}
