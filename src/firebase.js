import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// トト・システムのFirebase設定キー
const firebaseConfig = {
  apiKey: "AIzaSyARtBbB63BhF_BK6PmjO_wEshHH7nTiKu0",
  authDomain: "toto-app-1a71a.firebaseapp.com",
  projectId: "toto-app-1a71a",
  storageBucket: "toto-app-1a71a.firebasestorage.app",
  messagingSenderId: "406997214008",
  appId: "1:406997214008:web:7c572f0f7ec54be5b217cd"
};

// Firebaseとデータベースの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };