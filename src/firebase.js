// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

// Your Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBp5hyB6_U0aKfsEZca4ZwOel9YvHbgm5E",
  authDomain: "senseguardian-c01d9.firebaseapp.com",
  databaseURL: "https://senseguardian-c01d9-default-rtdb.firebaseio.com",
  projectId: "senseguardian-c01d9",
  storageBucket: "senseguardian-c01d9.firebasestorage.app",
  messagingSenderId: "871361694205",
  appId: "1:871361694205:web:73506ea0acf55636573194",
 
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

