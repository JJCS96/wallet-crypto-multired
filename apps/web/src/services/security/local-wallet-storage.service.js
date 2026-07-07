const pendingWalletFlows = new Map();

export function getPendingWalletFlow(uid) {
  return pendingWalletFlows.get(uid) || null;
}

export function setPendingWalletFlow(uid, payload) {
  pendingWalletFlows.set(uid, payload);
}

export function clearPendingWalletFlow(uid) {
  pendingWalletFlows.delete(uid);
}

export function clearAllPendingWalletFlows() {
  pendingWalletFlows.clear();
}

export function updatePendingWalletFlow(uid, updater) {
  const currentValue = getPendingWalletFlow(uid);

  if (!currentValue) {
    return null;
  }

  const nextValue = updater(currentValue);
  pendingWalletFlows.set(uid, nextValue);
  return nextValue;
}
