import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

// Valores por defecto para que la UI siga funcionando incluso si falta el documento.
const defaultSettings = {
  theme: "dark",
  language: "es",
  currency: "USD",
};

// Lee el documento `settings/{uid}` y devuelve una base conocida para el formulario.
export async function getUserSettings(uid) {
  const settingsReference = doc(db, "settings", uid);
  const settingsSnapshot = await getDoc(settingsReference);

  if (!settingsSnapshot.exists()) {
    return {
      uid,
      ...defaultSettings,
    };
  }

  return {
    uid,
    ...defaultSettings,
    ...settingsSnapshot.data(),
  };
}

// Guarda solo preferencias no sensibles usando merge para no romper el documento existente.
export async function saveUserSettings(uid, settings) {
  const settingsReference = doc(db, "settings", uid);

  await setDoc(
    settingsReference,
    {
      uid,
      theme: settings.theme,
      language: settings.language,
      currency: settings.currency,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    uid,
    ...defaultSettings,
    ...settings,
  };
}

export { defaultSettings };
