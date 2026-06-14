// Este archivo centraliza datos demo reutilizables para las pantallas protegidas.
// Cuando existan APIs o SDKs reales, la idea es reemplazar esta fuente sin rehacer la UI.

export const assets = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    amount: "0.2487",
    price: "$63,245.10",
    change: "+2.35%",
    value: "$15,729.56",
    color: "#f7931a",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    amount: "1.2500",
    price: "$3,215.45",
    change: "+1.12%",
    value: "$4,019.31",
    color: "#627eea",
  },
  {
    name: "Solana",
    symbol: "SOL",
    amount: "12.5000",
    price: "$146.35",
    change: "-0.85%",
    value: "$1,829.88",
    color: "#14f195",
  },
];

export const quickActions = [
  { label: "Wallet", to: "/dashboard/wallet", icon: "wallet" },
  { label: "Transferir", to: "/dashboard/transfer", icon: "transfer" },
  { label: "Historial", to: "/dashboard/history", icon: "history" },
  { label: "Ajustes", to: "/dashboard/settings", icon: "settings" },
];

export const walletNetworks = [
  {
    name: "Solana",
    symbol: "SOL",
    address: "7xKQ7s...solWallet",
    balance: "12.4800",
    value: "$1,872.00",
    change: "+2.18%",
    colorClassName: "wallet-network-dot wallet-network-dot--solana",
  },
  {
    name: "Bitcoin",
    symbol: "BTC",
    address: "bc1qexa...btcWallet",
    balance: "0.2487",
    value: "$15,729.56",
    change: "+1.04%",
    colorClassName: "wallet-network-dot wallet-network-dot--bitcoin",
  },
  {
    name: "BNB Chain",
    symbol: "BNB",
    address: "0xAbc1...bnbWallet",
    balance: "3.9200",
    value: "$2,116.80",
    change: "-0.42%",
    colorClassName: "wallet-network-dot wallet-network-dot--bnb",
  },
];

export const futureWalletSteps = [
  "Crear wallet con seed phrase de 12 o 24 palabras.",
  "Importar wallet existente de forma segura.",
  "Mostrar balances reales por red y conversion a USD.",
  "Preparar derivacion de direcciones para Solana, Bitcoin y BNB.",
];

export const networkOptions = [
  {
    value: "solana",
    label: "Solana",
    symbol: "SOL",
    usdPrice: 146.35,
    fee: 0.0005,
    balance: 12.48,
    addressHint: "Ej: 7xKQ7...WalletSolana",
  },
  {
    value: "bitcoin",
    label: "Bitcoin",
    symbol: "BTC",
    usdPrice: 63245.1,
    fee: 0.00012,
    balance: 0.2487,
    addressHint: "Ej: bc1qexamplewallet",
  },
  {
    value: "bnb",
    label: "BNB Chain",
    symbol: "BNB",
    usdPrice: 540.0,
    fee: 0.0009,
    balance: 3.92,
    addressHint: "Ej: 0xAbc123...",
  },
];

export const historyFilters = ["Todos", "Enviado", "Recibido", "Pendiente"];

export const historyPreview = [
  {
    id: "tx-1",
    type: "Enviado",
    network: "Solana",
    asset: "SOL",
    amount: "1.2500",
    amountUsd: "$187.50",
    status: "Confirmada",
    date: "2026-06-07 10:14",
    hash: "5Hk2...1kLm",
    detail: "Transferencia simulada a una direccion externa.",
  },
  {
    id: "tx-2",
    type: "Recibido",
    network: "Bitcoin",
    asset: "BTC",
    amount: "0.0487",
    amountUsd: "$3,081.20",
    status: "Confirmada",
    date: "2026-06-06 18:42",
    hash: "bc1q...x9P2",
    detail: "Entrada demo para la cuenta principal de Bitcoin.",
  },
  {
    id: "tx-3",
    type: "Pendiente",
    network: "BNB Chain",
    asset: "BNB",
    amount: "0.9200",
    amountUsd: "$496.80",
    status: "Pendiente",
    date: "2026-06-05 09:25",
    hash: "0xAb...f91C",
    detail: "Movimiento aun sin confirmacion final en esta maqueta.",
  },
  {
    id: "tx-4",
    type: "Enviado",
    network: "Solana",
    asset: "SOL",
    amount: "0.3400",
    amountUsd: "$51.00",
    status: "Fallida",
    date: "2026-06-04 14:02",
    hash: "8Pq1...Lm2R",
    detail: "Intento demo fallido para mostrar estados negativos.",
  },
];

export const dashboardModuleCards = [
  {
    title: "Wallet",
    description: "Cuentas demo por red y accesos al flujo futuro de crear o importar wallet.",
    value: "3 redes",
    to: "/dashboard/wallet",
  },
  {
    title: "Transferencias",
    description: "Formulario de envio con red, direccion, monto y resumen previo simulado.",
    value: "1 flujo",
    to: "/dashboard/transfer",
  },
  {
    title: "Historial",
    description: "Movimientos demo con estado, red, hash, filtros y fechas.",
    value: `${historyPreview.length} items`,
    to: "/dashboard/history",
  },
  {
    title: "Ajustes",
    description: "Preferencias no sensibles conectadas a Firestore para tema, idioma y moneda.",
    value: "3 prefs",
    to: "/dashboard/settings",
  },
];

// Tasas demo para reflejar cambios de moneda en la UI mientras no existe integracion real de mercado.
const currencyRates = {
  USD: 1,
  EUR: 0.92,
  COP: 3950,
};

function parseUsdString(value) {
  return Number(String(value).replace(/[$,]/g, ""));
}

// Convierte montos base USD a la moneda elegida y usa formato nativo del navegador.
export function formatCurrencyFromUsd(usdValue, currency = "USD") {
  const rate = currencyRates[currency] || currencyRates.USD;
  const convertedValue = usdValue * rate;

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(convertedValue);
}

export function getTotalWalletBalance(currency = "USD") {
  const totalValue = walletNetworks
    .map((network) => Number(network.value.replace(/[$,]/g, "")))
    .reduce((accumulator, currentValue) => accumulator + currentValue, 0);

  return formatCurrencyFromUsd(totalValue, currency);
}

export function getHistoryStatusSummary() {
  return {
    confirmed: historyPreview.filter((item) => item.status === "Confirmada").length,
    pending: historyPreview.filter((item) => item.status === "Pendiente").length,
    failed: historyPreview.filter((item) => item.status === "Fallida").length,
  };
}

// Estas funciones preparan datos derivados para no repetir conversiones en cada pantalla.
export function getFormattedAssets(currency = "USD") {
  return assets.map((asset) => ({
    ...asset,
    formattedPrice: formatCurrencyFromUsd(parseUsdString(asset.price), currency),
    formattedValue: formatCurrencyFromUsd(parseUsdString(asset.value), currency),
  }));
}

export function getFormattedWalletNetworks(currency = "USD") {
  return walletNetworks.map((network) => ({
    ...network,
    formattedValue: formatCurrencyFromUsd(parseUsdString(network.value), currency),
  }));
}

export function getFormattedHistory(currency = "USD") {
  return historyPreview.map((item) => ({
    ...item,
    formattedAmountUsd: formatCurrencyFromUsd(parseUsdString(item.amountUsd), currency),
  }));
}
