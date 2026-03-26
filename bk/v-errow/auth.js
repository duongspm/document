// ============================================================
//  shared/auth.js  —  Firebase Authentication
//  📁 VỊ TRÍ: docvault2/shared/auth.js  (TẠO FILE MỚI)
// ============================================================
import { getAuth, signInWithEmailAndPassword,
         createUserWithEmailAndPassword,
         signOut, onAuthStateChanged,
         updateProfile }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from "./firebase.js";

export const auth = getAuth(app);

// Đăng nhập
export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

// Đăng ký
export const registerUser = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred;
};

// Đăng xuất
export const logoutUser = () => signOut(auth);

// Lắng nghe trạng thái đăng nhập
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

// Lấy user hiện tại
export const currentUser = () => auth.currentUser;
