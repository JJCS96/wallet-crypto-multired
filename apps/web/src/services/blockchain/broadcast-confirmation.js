/**
 * Archivo: broadcast-confirmation.js
 * Propósito: Distingue una transacción rechazada de una que ya se transmitió pero no se confirmó a tiempo.
 * Funcionalidades:
 * - Envuelve la espera de confirmación con un límite de tiempo.
 * - Si la espera falla después del broadcast, lanza "broadcast-unconfirmed" con hash y explorer.
 * - Permite a la UI registrar el envío como pendiente en lugar de habilitar un reenvío duplicado.
 */
export const BROADCAST_UNCONFIRMED_ERROR = "broadcast-unconfirmed";

export function createBroadcastUnconfirmedError({ txHash, explorerUrl, cause }) {
  const error = new Error(BROADCAST_UNCONFIRMED_ERROR, cause ? { cause } : undefined);
  error.txHash = txHash;
  error.explorerUrl = explorerUrl;
  return error;
}

export function isBroadcastUnconfirmedError(error) {
  return error?.message === BROADCAST_UNCONFIRMED_ERROR && Boolean(error.txHash);
}

function withTimeout(promise, timeoutMs) {
  let timer;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Espera la confirmación de una transacción ya transmitida.
 * Los rechazos definitivos (isDefinitiveFailure) se propagan tal cual; cualquier otro fallo
 * (timeout, RPC caído, bloque expirado) se convierte en broadcast-unconfirmed porque la
 * transacción pudo haber llegado a la red y reenviarla podría duplicar el pago.
 */
export async function awaitBroadcastConfirmation(confirmationPromise, {
  txHash,
  explorerUrl,
  timeoutMs = 45000,
  isDefinitiveFailure = () => false,
}) {
  try {
    return await withTimeout(confirmationPromise, timeoutMs);
  } catch (error) {
    if (isDefinitiveFailure(error)) {
      throw new Error("transaction-rejected", { cause: error });
    }

    throw createBroadcastUnconfirmedError({ txHash, explorerUrl, cause: error });
  }
}
