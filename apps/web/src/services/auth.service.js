/**
 * Archivo: auth.service.js
 * Propósito: Encapsula autenticación con Firebase Auth y creación básica de perfil público.
 * Funcionalidades:
 * - Registro e inicio de sesión con email/contraseña o Google.
 * - Creación de documentos públicos de usuario y configuración.
 * - Cierre de sesión y recuperación de contraseña.
 */
// Importamos las funciones principales de Firebase Authentication.
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";

// Importamos funciones de Firestore para crear documentos en la base de datos.
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Importamos la conexión a Firebase Authentication y Firestore.
import { auth, db } from "../lib/firebase";

function getGoogleDisplayName(user) {
  return user.displayName || user.email?.split("@")[0] || "Usuario NovaWallet";
}

async function ensureUserProfileDocuments(user) {
  const userReference = doc(db, "users", user.uid);
  const settingsReference = doc(db, "settings", user.uid);
  const [userSnapshot, settingsSnapshot] = await Promise.all([
    getDoc(userReference),
    getDoc(settingsReference),
  ]);

  if (!userSnapshot.exists()) {
    await setDoc(userReference, {
      uid: user.uid,
      name: getGoogleDisplayName(user),
      email: user.email || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (!settingsSnapshot.exists()) {
    await setDoc(settingsReference, {
      uid: user.uid,
      theme: "dark",
      language: "es",
      currency: "USD",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Registra un nuevo usuario con correo y contraseña.
 *
 * Esta función:
 * 1. Crea el usuario en Firebase Authentication.
 * 2. Guarda información básica en la colección "users".
 * 3. Guarda configuración inicial en la colección "settings".
 *
 * Importante:
 * Nunca se debe guardar seed phrase, private keys ni datos críticos aquí.
 */
export async function registerWithEmail(email, password, name) {
  // Crea el usuario en Firebase Authentication.
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Guardamos el usuario creado para reutilizar sus datos.
  const user = credential.user;
  const normalizedName = name.trim();

  // Guardamos el nombre también en el perfil de Firebase.
  // Esto ayuda a mostrar un saludo más claro dentro del Dashboard.
  await updateProfile(user, {
    displayName: normalizedName,
  });

  // Creamos un documento en la colección "users".
  // El ID del documento será el UID del usuario.
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: normalizedName,
    email: user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Creamos un documento en la colección "settings".
  // Aquí guardamos preferencias básicas del usuario.
  await setDoc(doc(db, "settings", user.uid), {
    uid: user.uid,
    theme: "dark",
    language: "es",
    currency: "USD",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Retornamos el usuario creado para usarlo en la interfaz.
  return user;
}

/**
 * Inicia sesión con correo y contraseña.
 *
 * Esta función valida las credenciales usando Firebase Authentication.
 */
export async function loginWithEmail(email, password) {
  // Firebase valida si el correo y contraseña son correctos.
  const credential = await signInWithEmailAndPassword(auth, email, password);

  // Retornamos el usuario autenticado.
  return credential.user;
}

/**
 * Autentica la cuenta del usuario con Google.
 * La frase semilla sigue siendo el único mecanismo para crear o restaurar la Wallet.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  try {
    const credential = await signInWithPopup(auth, provider);
    await ensureUserProfileDocuments(credential.user);

    return credential.user;
  } catch (error) {
    const googleError = new Error(error?.code || "auth/google-sign-in-failed");
    googleError.code = error?.code || "auth/google-sign-in-failed";
    throw googleError;
  }
}

/**
 * Envía un correo de recuperación de contraseña.
 *
 * Firebase se encarga de enviar el enlace al correo indicado.
 */
export async function sendPasswordReset(email) {
  // Envía el correo de recuperación al email ingresado.
  await sendPasswordResetEmail(auth, email);
}

/**
 * Cierra la sesión del usuario actual.
 *
 * Después de ejecutar esto, Firebase elimina la sesión activa.
 */
export async function logout() {
  // Cierra sesión en Firebase Authentication.
  await signOut(auth);
}
