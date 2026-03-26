// shared/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
// https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
