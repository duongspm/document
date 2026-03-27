// ============================================================
//  shared/firebase.js  —  Firebase khởi tạo & helpers
// ============================================================
import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc,
         addDoc, updateDoc, deleteDoc, getDoc,
         getDocs, query, orderBy, onSnapshot,
         serverTimestamp, where }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCnPc_SS_dR0dXl7WPY1FNp_YgKoUyBl-E",
  authDomain:        "my-creative-blog.firebaseapp.com",
  projectId:         "my-creative-blog",
  storageBucket:     "my-creative-blog.firebasestorage.app",
  messagingSenderId: "57335816842",
  appId:             "1:57335816842:web:9212c8576d23e534c00373",
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);

export const DOCS_COL = "documents";

// ── CRUD helpers ────────────────────────────────────────────
export const addDocument    = (data)     => addDoc(collection(db, DOCS_COL), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateDocument = (id, data) => updateDoc(doc(db, DOCS_COL, id), { ...data, updatedAt: serverTimestamp() });
export const deleteDocument = (id)       => deleteDoc(doc(db, DOCS_COL, id));
export const getDocument    = (id)       => getDoc(doc(db, DOCS_COL, id));

// Real-time listener (sorted by createdAt desc)
export const listenDocuments = (cb) =>
  onSnapshot(query(collection(db, DOCS_COL), orderBy("createdAt", "desc")), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
