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
  deleteDoc,
         getDocs, query, orderBy,
         serverTimestamp, where,
         arrayUnion, arrayRemove, increment,
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

export function getDocument(id) {
  const docRef = doc(db, "documents", id);
  return getDoc(docRef);
}

export function addDocument(data) {
  const docsRef = collection(db, "documents");
  return addDoc(docsRef, data);
}

export function updateDocument(id, data) {
  const docRef = doc(db, "documents", id);
  return updateDoc(docRef, data);
}

export function deleteDocument(id) {
  const docRef = doc(db, "documents", id);
  return deleteDoc(docRef);
}
// ── Like / Dislike ───────────────────────────────────────────
export const toggleLike = async (docId, userId) => {
  const ref  = doc(db, DOCS_COL, docId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const likes    = data.likes    || [];
  const dislikes = data.dislikes || [];

  if (likes.includes(userId)) {
    // Bỏ like
    return updateDoc(ref, { likes: arrayRemove(userId) });
  } else {
    // Thêm like, bỏ dislike nếu có
    return updateDoc(ref, {
      likes:    arrayUnion(userId),
      dislikes: arrayRemove(userId),
    });
  }
};

export const toggleDislike = async (docId, userId) => {
  const ref  = doc(db, DOCS_COL, docId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const dislikes = data.dislikes || [];

  if (dislikes.includes(userId)) {
    return updateDoc(ref, { dislikes: arrayRemove(userId) });
  } else {
    return updateDoc(ref, {
      dislikes: arrayUnion(userId),
      likes:    arrayRemove(userId),
    });
  }
};

export const incrementView = (docId) =>
  updateDoc(doc(db, DOCS_COL, docId), { views: increment(1) });

export const COMMENTS_COL = "comments";

// Thêm bình luận
export const addComment = (docId, data) =>
  addDoc(collection(db, DOCS_COL, docId, COMMENTS_COL), {
    ...data,
    createdAt: serverTimestamp(),
    approved: false,    // Admin phê duyệt trước
    flagged: false,
  });

// Lắng nghe bình luận realtime (đã duyệt)
export const listenComments = (docId, cb) =>
  onSnapshot(
    query(
      collection(db, DOCS_COL, docId, COMMENTS_COL),
      where("approved", "==", true),
      orderBy("createdAt", "desc")
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

// Admin: lắng nghe TẤT CẢ comment (kể cả chờ duyệt)
export const listenAllComments = (docId, cb) =>
  onSnapshot(
    query(collection(db, DOCS_COL, docId, COMMENTS_COL), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

// Admin: phê duyệt / xoá / đánh dấu không phù hợp
export const approveComment  = (docId, cmtId) =>
  updateDoc(doc(db, DOCS_COL, docId, COMMENTS_COL, cmtId), { approved: true });
export const deleteComment   = (docId, cmtId) =>
  deleteDoc(doc(db, DOCS_COL, docId, COMMENTS_COL, cmtId));
export const flagComment     = (docId, cmtId, flag) =>
  updateDoc(doc(db, DOCS_COL, docId, COMMENTS_COL, cmtId), { flagged: flag });


