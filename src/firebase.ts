import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCcqj26gP720MgumMws-Nyx4bLrFpIwtyA",
  authDomain: "todoparagorras-5968e.firebaseapp.com",
  projectId: "todoparagorras-5968e",
  storageBucket: "todoparagorras-5968e.firebasestorage.app",
  messagingSenderId: "765727380045",
  appId: "1:765727380045:web:2c0ee1d03c3c435dc70204",
  measurementId: "G-YLB0VT5K0W"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Secondary app instance — used to create users without logging out the admin
const secondaryApp = getApps().find(a => a.name === 'secondary')
  ?? initializeApp(firebaseConfig, 'secondary');
export const secondaryAuth = getAuth(secondaryApp);

export default app;
