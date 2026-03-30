// shared/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc, getDocs,
  query, orderBy, where,
  serverTimestamp, increment, runTransaction,
  limit, startAfter
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnPc_SS_dR0dXl7WPY1FNp_YgKoUyBl-E",
  authDomain: "my-creative-blog.firebaseapp.com",
  projectId: "my-creative-blog",
  storageBucket: "my-creative-blog.firebasestorage.app",
  messagingSenderId: "57335816842",
  appId: "1:57335816842:web:9212c8576d23e534c00373",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export function listenDocuments(callback) {
  const docsRef = collection(db, "documents");
  return onSnapshot(docsRef, (snapshot) => {
    const docs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(docs);
  });
}

// export function getDocument(id) {
//   const docRef = doc(db, "documents", id);
//   return getDoc(docRef);
// }

// export function addDocument(data) {
//   const docsRef = collection(db, "documents");
//   return addDoc(docsRef, data);
// }

// export function updateDocument(id, data) {
//   const docRef = doc(db, "documents", id);
//   return updateDoc(docRef, data);
// }

// export function deleteDocument(id) {
//   const docRef = doc(db, "documents", id);
//   return deleteDoc(docRef);
// }

// ── Collection names ─────────────────────────────────────────
export const COL = {
  DOCS:          "documents",
  COMMENTS:      "comments",
  NOTIFICATIONS: "notifications",
  ANALYTICS:     "analytics",
};

// ============================================================
//  DOCUMENTS
// ============================================================
export const addDocument = (data) =>
  addDoc(collection(db, COL.DOCS), {
    ...data,
    likes: 0, dislikes: 0,
    views: 0, commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const updateDocument = (id, data) =>
  updateDoc(doc(db, COL.DOCS, id), { ...data, updatedAt: serverTimestamp() });

export const deleteDocument = (id) => deleteDoc(doc(db, COL.DOCS, id));

export const getDocument = (id) => getDoc(doc(db, COL.DOCS, id));

// Lắng nghe realtime — sort theo likes DESC (trang client)
// export const listenDocuments = (cb) =>
//   onSnapshot(
//     query(collection(db, COL.DOCS), orderBy("likes", "desc"), orderBy("createdAt", "desc")),
//     snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
//   );

// Sort theo createdAt DESC (trang admin)
export const listenDocumentsAdmin = (cb) =>
  onSnapshot(
    query(collection(db, COL.DOCS), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

// Tăng view count
export const incrementView = (docId) =>
  updateDoc(doc(db, COL.DOCS, docId), { views: increment(1) });

// ============================================================
//  LIKES / DISLIKES  (không cần đăng nhập — dùng localStorage)
// ============================================================
// Lưu trạng thái reaction của user vào localStorage
// key: "dv_reaction_{docId}" → value: "like" | "dislike" | null

export function getUserReaction(docId) {
  return localStorage.getItem(`dv_reaction_${docId}`) || null;
}

export function setUserReaction(docId, type) {
  if (type) localStorage.setItem(`dv_reaction_${docId}`, type);
  else localStorage.removeItem(`dv_reaction_${docId}`);
}

/**
 * Toggle like/dislike trên Firestore bằng transaction
 * type: "like" | "dislike"
 */
export async function toggleReaction(docId, type) {
  const docRef    = doc(db, COL.DOCS, docId);
  const prev      = getUserReaction(docId);
  const opposite  = type === "like" ? "dislike" : "like";

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists()) throw new Error("Doc not found");
    const data = snap.data();

    let delta = {};

    if (prev === type) {
      // Bỏ reaction hiện tại
      delta[`${type}s`] = Math.max(0, (data[`${type}s`] || 0) - 1);
      setUserReaction(docId, null);
    } else {
      // Thêm reaction mới
      delta[`${type}s`] = (data[`${type}s`] || 0) + 1;
      // Nếu trước đó đã reaction ngược, trừ đi
      if (prev === opposite) {
        delta[`${opposite}s`] = Math.max(0, (data[`${opposite}s`] || 0) - 1);
      }
      setUserReaction(docId, type);
    }

    tx.update(docRef, delta);
  });

  // Trả về reaction hiện tại sau khi update
  return getUserReaction(docId);
}

// ============================================================
//  COMMENTS
// ============================================================
export const addComment = (data) =>
  addDoc(collection(db, COL.COMMENTS), {
    ...data,
    likes: 0,
    flagged: false,
    deleted: false,
    createdAt: serverTimestamp(),
  });

export const updateComment = (id, data) =>
  updateDoc(doc(db, COL.COMMENTS, id), data);

export const deleteComment = (id) =>
  updateDoc(doc(db, COL.COMMENTS, id), { deleted: true, deletedAt: serverTimestamp() });

export const hardDeleteComment = (id) => deleteDoc(doc(db, COL.COMMENTS, id));

export const flagComment = (id, flagged) =>
  updateDoc(doc(db, COL.COMMENTS, id), { flagged, flaggedAt: flagged ? serverTimestamp() : null });


// ----


// Lắng nghe comments của 1 document (realtime)
export const listenComments = (docId, cb) =>
  onSnapshot(
    query(
      collection(db, COL.COMMENTS),
      where("docId", "==", docId),
      where("deleted", "==", false),
      orderBy("createdAt", "asc")
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
 
// Lắng nghe TẤT CẢ comments (cho admin)
export const listenAllComments = (cb) =>
  onSnapshot(
    query(collection(db, COL.COMMENTS), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
 
// Like 1 comment
export async function toggleCommentLike(commentId) {
  const key    = `dv_clike_${commentId}`;
  const liked  = localStorage.getItem(key) === "1";
  const cRef   = doc(db, COL.COMMENTS, commentId);
 
  await updateDoc(cRef, { likes: increment(liked ? -1 : 1) });
  if (liked) localStorage.removeItem(key);
  else       localStorage.setItem(key, "1");
  return !liked;
}
 
export function getCommentLiked(commentId) {
  return localStorage.getItem(`dv_clike_${commentId}`) === "1";
}
 
// Cập nhật commentCount trên document
export const updateCommentCount = async (docId, delta) => {
  const ref = doc(db, COL.DOCS, docId);
  await updateDoc(ref, { commentCount: increment(delta) });
};
 
// ============================================================
//  NOTIFICATIONS (in-app)
// ============================================================
export const addNotification = (data) =>
  addDoc(collection(db, COL.NOTIFICATIONS), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
 
export const markNotifRead = (id) =>
  updateDoc(doc(db, COL.NOTIFICATIONS, id), { read: true });
 
export const listenNotifications = (cb) =>
  onSnapshot(
    query(collection(db, COL.NOTIFICATIONS), orderBy("createdAt", "desc"), limit(50)),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
 
// ============================================================
//  ANALYTICS — ghi lại page views theo ngày
// ============================================================
export async function recordPageView(page) {
  const today   = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const ref     = doc(db, COL.ANALYTICS, today);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        tx.update(ref, {
          total: increment(1),
          [`pages.${page}`]: increment(1),
        });
      } else {
        tx.set(ref, {
          date: today,
          total: 1,
          pages: { [page]: 1 },
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (e) { /* silent */ }
}
 
// Lấy analytics 30 ngày gần nhất
export const getAnalytics = async () => {
  const snap = await getDocs(
    query(collection(db, COL.ANALYTICS), orderBy("date", "desc"), limit(30))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
};