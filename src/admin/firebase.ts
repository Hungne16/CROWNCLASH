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
let configurationError = "Chưa kết nối Firebase. Chủ website cần điền cấu hình ứng dụng web.";
if (Object.values(config).every(v => v && !/YOUR_|REPLACE_/i.test(v))) {
  try {
    const app = getApps()[0] ?? initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    configurationError = "";
  } catch { configurationError = "Cấu hình Firebase chưa hợp lệ. Kiểm tra lại thông tin ứng dụng web."; }
}
export { auth as firebaseAuth, db };
export const authConfigurationError = configurationError;
export function accountError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return "Email hoặc mật khẩu chưa đúng.";
  if (/too-many-requests/.test(code)) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
  if (/network|unavailable/.test(code)) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  if (/permission-denied|unauthenticated/.test(code)) return "Tài khoản chưa được cấp quyền admin hoặc phiên đăng nhập đã hết hạn.";
  if (/expired-action-code|invalid-action-code/.test(code)) return "Liên kết đặt mật khẩu đã hết hạn hoặc không hợp lệ. Hãy yêu cầu gửi lại.";
  if (/user-disabled/.test(code)) return "Tài khoản đã bị vô hiệu hóa.";
  if (/operation-not-allowed/.test(code)) return "Chủ website cần bật đăng nhập Email/Password trong Firebase.";
  if (/configuration-not-found/.test(code)) return "Firebase Authentication chưa được khởi tạo. Mở Firebase Console → Authentication → Get started, rồi bật Email/Password.";
  if (/unauthorized-continue-uri|unauthorized-domain/.test(code)) return "Chủ website cần thêm tên miền này vào Authorized domains trong Firebase Authentication.";
  return error instanceof Error ? error.message : "Không thể kết nối Firebase.";
}
