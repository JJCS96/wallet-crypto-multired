export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  walletHome: "/wallet",
  createWallet: "/wallet/create",
  backupSeed: "/wallet/backup",
  confirmSeed: "/wallet/confirm",
  restoreWallet: "/wallet/restore",
  sendTransaction: "/wallet/send",
  receiveFunds: "/wallet/receive",
  transactionHistory: "/wallet/transactions",
  settings: "/wallet/settings",
};

export const APP_SIDEBAR_ROUTES = [
  { label: "Dashboard", path: APP_ROUTES.dashboard, badge: "DB" },
  { label: "Mi Wallet", path: APP_ROUTES.walletHome, badge: "MW" },
  { label: "Enviar", path: APP_ROUTES.sendTransaction, badge: "TX" },
  { label: "Recibir", path: APP_ROUTES.receiveFunds, badge: "RC" },
  { label: "Historial", path: APP_ROUTES.transactionHistory, badge: "HI" },
  { label: "Restaurar Wallet", path: APP_ROUTES.restoreWallet, badge: "RW" },
  { label: "Configuración", path: APP_ROUTES.settings, badge: "CF" },
];

export const APP_ONBOARDING_ROUTES = [
  { label: "Dashboard", path: APP_ROUTES.dashboard, badge: "DB" },
  { label: "Crear wallet", path: APP_ROUTES.createWallet, badge: "CW" },
  { label: "Respaldar seed", path: APP_ROUTES.backupSeed, badge: "BS" },
  { label: "Confirmar seed", path: APP_ROUTES.confirmSeed, badge: "CS" },
  { label: "Restaurar Wallet", path: APP_ROUTES.restoreWallet, badge: "RW" },
];
