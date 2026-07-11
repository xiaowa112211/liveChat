import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsXInos_6ZAbTJRUIsxNKhcW3b6D2VrwI",
  authDomain: "livechat-df05b.firebaseapp.com",
  projectId: "livechat-df05b",
  storageBucket: "livechat-df05b.firebasestorage.app",
  messagingSenderId: "436491497643",
  appId: "1:436491497643:web:d7ccae6441ec7b18b287ee",
  measurementId: "G-T1TV6HW6RG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);