// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getAuth, signInAnonymously, connectAuthEmulator } from "firebase/auth";

// Your Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDG9gSjTiHU9eNyWmMNdGdOoSlS3fbjmto",
  authDomain: "sense-guardian.firebaseapp.com",
  databaseURL: "https://sense-guardian-default-rtdb.firebaseio.com",
  projectId: "sense-guardian",
  storageBucket: "sense-guardian.firebasestorage.app",
  messagingSenderId: "289457426539",
  appId: "1:289457426539:web:e9a4f6ba64bcb5c23e212e",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Sign in anonymously to allow database access
signInAnonymously(auth)
  .then(() => {
    console.log("Signed in anonymously to Firebase");
  })
  .catch((error) => {
    console.error("Error signing in anonymously:", error);
  });
