// Importamos las funciones principales de Firebase Authentication.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";

// Importamos funciones de Firestore para crear documentos en la base de datos.
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Importamos la conexión a Firebase Authentication y Firestore.
import { auth, db } from "../lib/firebase";

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
