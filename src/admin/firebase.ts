import { initializeApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};
let auth: Auth | null = null;
let db: Firestore | null = null;
let configurationError = "Firebase is not connected. The site owner needs to enter the web app configuration.";
if (Object.values(config).every(v => v && !/YOUR_|REPLACE_/i.test(v))) {
  try {
    const app = getApps()[0] ?? initializeApp(config);
    auth = getAuth(app);
    auth.languageCode = "en";
    db = getFirestore(app);
    configurationError = "";
  } catch { configurationError = "Invalid Firebase configuration. Check the web app settings."; }
}
export { auth as firebaseAuth, db };
export const authConfigurationError = configurationError;
export function accountError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return "Incorrect email or password.";
  if (/too-many-requests/.test(code)) return "Too many attempts. Try again in a few minutes.";
  if (/network|unavailable/.test(code)) return "Could not reach the server. Check your connection and try again.";
  if (/permission-denied|unauthenticated/.test(code)) return "Admin access is missing or your session has expired.";
  if (/expired-action-code|invalid-action-code/.test(code)) return "This password reset link is invalid or expired. Request a new one.";
  if (/user-disabled/.test(code)) return "This account is disabled.";
  if (/operation-not-allowed/.test(code)) return "The site owner needs to enable Email/Password sign-in in Firebase.";
  if (/configuration-not-found/.test(code)) return "Set up Firebase Authentication. In Firebase Console, open Authentication, select Get started, and enable Email/Password.";
  if (/unauthorized-continue-uri|unauthorized-domain/.test(code)) return "Add this domain to Authorized domains in Firebase Authentication.";
  return error instanceof Error ? error.message : "Could not connect to Firebase.";
}
