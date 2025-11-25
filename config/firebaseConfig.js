// Firebase Configuration
// Firebase Console se apni config values yahan add karein
// Firebase Console: https://console.firebase.google.com/
// Project Settings > General > Your apps > Web app (</>) icon

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Configuration Object
// Yahan apni Firebase project ki config values add karein
const firebaseConfig = {
    apiKey: "AIzaSyDFlmH8op_QEDoBID-H0yzwgaw8LnL9oaM",
    authDomain: "doktap-c19da.firebaseapp.com",
    projectId: "doktap-c19da",
    storageBucket: "doktap-c19da.firebasestorage.app",
    messagingSenderId: "630936682274",
    appId: "1:630936682274:web:33dfaf9a9708506779af7b",
    measurementId: "G-DQJNJZS8X0",
    // Realtime Database URL - Firebase Console se get karein
    // Firebase Console → Realtime Database → Data tab → URL copy karein
    // Format: https://PROJECT_ID-default-rtdb.REGION.firebaseio.com/
    databaseURL: "https://doktap-c19da-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with AsyncStorage for auth persistence
// Try-catch for Expo Go compatibility
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Fallback if AsyncStorage not available (shouldn't happen but safe)
  console.log('AsyncStorage not available, using default auth');
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
}
export { auth };
export const realtimeDb = getDatabase(app); // Realtime Database
export const storage = getStorage(app);

export default app;

