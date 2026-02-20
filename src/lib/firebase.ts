import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAFRO6sU4j2Pc37U1IUWGFGgWntFC1SjAc",
  authDomain: "notiont-ccaa4.firebaseapp.com",
  projectId: "notiont-ccaa4",
  storageBucket: "notiont-ccaa4.firebasestorage.app",
  messagingSenderId: "106765390069",
  appId: "1:106765390069:web:6ca8b624a84de0370075bc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const database = getDatabase(app);
