import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCo3lqPV6NTWhWSO5SJvrl4c0vaD4smmo",
  authDomain: "gen-lang-client-0588300165.firebaseapp.com",
  projectId: "gen-lang-client-0588300165",
  storageBucket: "gen-lang-client-0588300165.firebasestorage.app",
  messagingSenderId: "657877635997",
  appId: "1:657877635997:web:d3b4b45484a32ce18cd574"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Customize Google Provider
googleProvider.setCustomParameters({
  prompt: "select_account"
});
