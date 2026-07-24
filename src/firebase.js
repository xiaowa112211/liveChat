import { initializeApp } from "firebase/app";[cite: 3]
import { getAuth } from "firebase/auth";[cite: 3]
import { getFirestore } from "firebase/firestore";[cite: 3]
import { getStorage } from "firebase/storage"; // <-- သစ်ထည့်ပါ

const firebaseConfig = {
  apiKey: "AIzaSyBsXInos_6ZAbTJRUIsxNKhcW3b6D2VrwI",[cite: 3]
  authDomain: "livechat-df05b.firebaseapp.com",[cite: 3]
  projectId: "livechat-df05b",[cite: 3]
  storageBucket: "livechat-df05b.firebasestorage.app",[cite: 3]
  messagingSenderId: "436491497643",[cite: 3]
  appId: "1:436491497643:web:d7ccae6441ec7b18b287ee",[cite: 3]
  measurementId: "G-T1TV6HW6RG"[cite: 3]
};

const app = initializeApp(firebaseConfig);[cite: 3]

export const auth = getAuth(app);[cite: 3]
export const db = getFirestore(app);[cite: 3]
export const storage = getStorage(app); // <-- Export လုပ်ပါ
