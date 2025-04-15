import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCT6oX1RuGc0sSUEOD7tE4d_jxHZY8YjXQ",
  authDomain: "geo-attentendence-app.firebaseapp.com",
  projectId: "geo-attentendence-app",
  storageBucket: "geo-attentendence-app.appspot.com",
  messagingSenderId: "835384490983",
  appId: "1:835384490983:web:3df9ea0a517703ba37db42"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);