import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyABcrKZpDvuAXG70cEH18GkDFjmP8EcJvg",
    authDomain: "organdonor-82109.firebaseapp.com",
    projectId: "organdonor-82109",
    storageBucket: "organdonor-82109.appspot.com",
    messagingSenderId: "165856902258",
    appId: "1:165856902258:web:b6ffc2759baccd4f03d6eb",
    measurementId: "G-MP513N5BP3"
};

// Initialize Firebase services with error handling
let app, auth, db, storage;

try {
    console.log('🔥 Initializing Firebase...');
    
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('✅ Firebase initialized successfully');
    
    // Test auth readiness asynchronously
    auth.authStateReady().then(() => {
        console.log('✅ Firebase Auth is ready');
    }).catch((error) => {
        console.error('⚠️ Firebase Auth readiness issue:', error);
    });
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    
    // Re-throw to ensure the app fails fast if Firebase is broken
    throw new Error(`Firebase setup failed: ${error.message}`);
}

// Export Firebase services
export { auth, db, storage };
export default app;

// Export connection checker function
export const checkFirebaseConnection = async () => {
    const status = {
        initialized: !!app,
        authReady: false,
        firestoreReady: false,
        errors: []
    };
    
    if (auth) {
        try {
            await auth.authStateReady();
            status.authReady = true;
        } catch (error) {
            status.errors.push(`Auth: ${error.message}`);
        }
    }
    
    if (db) {
        try {
            status.firestoreReady = true;
        } catch (error) {
            status.errors.push(`Firestore: ${error.message}`);
        }
    }
    
    return status;
};

// Debug information for troubleshooting
if (typeof window !== 'undefined') {
    window.firebaseDebug = {
        config: firebaseConfig,
        app,
        auth,
        db,
        storage,
        checkConnection: checkFirebaseConnection
    };
    console.log('🛠️ Firebase debug info available at window.firebaseDebug');
}