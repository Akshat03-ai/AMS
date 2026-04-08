// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";    
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBnBibAARKraUSR_zeU7v6PLcxJs-3AOcs",
  authDomain: "asset-management-system-ca288.firebaseapp.com",
  projectId: "asset-management-system-ca288",
  storageBucket: "asset-management-system-ca288.firebasestorage.app",
  messagingSenderId: "170397375398",
  appId: "1:170397375398:web:c09ef7aaa63fd5bba80d67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);