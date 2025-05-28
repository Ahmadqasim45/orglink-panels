/**
 * Firebase Configuration Validator and Fixer
 * Checks and validates Firebase setup
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Enhanced Firebase configuration with validation
const firebaseConfig = {
    apiKey: "AIzaSyABcrKZpDvuAXG70cEH18GkDFjmP8EcJvg",
    authDomain: "organdonor-82109.firebaseapp.com",
    projectId: "organdonor-82109",
    storageBucket: "organdonor-82109.appspot.com",
    messagingSenderId: "165856902258",
    appId: "1:165856902258:web:b6ffc2759baccd4f03d6eb",
    measurementId: "G-MP513N5BP3"
};

// Validate configuration
function validateFirebaseConfig(config) {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missing = requiredFields.filter(field => !config[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing Firebase configuration fields: ${missing.join(', ')}`);
    }
    
    console.log('✅ Firebase configuration is valid');
    return true;
}

// Initialize Firebase with error handling
let app, auth, db, storage;

try {
    console.log('🔥 Initializing Firebase...');
    
    // Validate configuration first
    validateFirebaseConfig(firebaseConfig);
    
    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
    
    // Initialize Auth with error handling
    try {
        auth = getAuth(app);
        console.log('✅ Firebase Auth initialized');
        
        // Set up auth state persistence
        auth.setPersistence && auth.setPersistence('local');
        
    } catch (authError) {
        console.error('❌ Firebase Auth initialization failed:', authError);
        throw new Error(`Firebase Auth setup failed: ${authError.message}`);
    }
    
    // Initialize Firestore with error handling
    try {
        db = getFirestore(app);
        console.log('✅ Firestore initialized');
    } catch (dbError) {
        console.error('❌ Firestore initialization failed:', dbError);
        throw new Error(`Firestore setup failed: ${dbError.message}`);
    }
    
    // Initialize Storage with error handling
    try {
        storage = getStorage(app);
        console.log('✅ Firebase Storage initialized');
    } catch (storageError) {
        console.error('❌ Storage initialization failed:', storageError);
        throw new Error(`Storage setup failed: ${storageError.message}`);
    }
    
    console.log('🎉 All Firebase services initialized successfully');
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    
    // Provide helpful error messages
    if (error.message.includes('API key')) {
        console.error('💡 Check if your Firebase API key is correct and the project exists');
    } else if (error.message.includes('auth')) {
        console.error('💡 Check if Firebase Authentication is enabled in your Firebase console');
    } else if (error.message.includes('firestore')) {
        console.error('💡 Check if Firestore is enabled in your Firebase console');
    }
    
    // Create fallback objects to prevent app crashes
    auth = null;
    db = null;
    storage = null;
}

// Add connection status checker
export const checkFirebaseConnection = async () => {
    console.log('🔍 Checking Firebase connection...');
    
    const results = {
        app: !!app,
        auth: !!auth,
        firestore: !!db,
        storage: !!storage,
        errors: []
    };
    
    // Test Auth connection
    if (auth) {
        try {
            await auth.authStateReady();
            console.log('✅ Auth connection verified');
        } catch (error) {
            console.error('❌ Auth connection failed:', error);
            results.errors.push(`Auth: ${error.message}`);
        }
    }
    
    // Test Firestore connection
    if (db) {
        try {
            await db._delegate._databaseId;
            console.log('✅ Firestore connection verified');
        } catch (error) {
            console.error('❌ Firestore connection failed:', error);
            results.errors.push(`Firestore: ${error.message}`);
        }
    }
    
    return results;
};

// Error boundary for Firebase operations
export const withFirebaseErrorHandling = (operation, errorMessage = 'Firebase operation failed') => {
    return async (...args) => {
        try {
            return await operation(...args);
        } catch (error) {
            console.error(`❌ ${errorMessage}:`, error);
            
            // Handle specific Firebase errors
            if (error.code === 'permission-denied') {
                throw new Error('Access denied. Please check your permissions.');
            } else if (error.code === 'unavailable') {
                throw new Error('Service temporarily unavailable. Please try again.');
            } else if (error.code === 'unauthenticated') {
                throw new Error('Authentication required. Please log in.');
            } else {
                throw new Error(`${errorMessage}: ${error.message}`);
            }
        }
    };
};

export { app, auth, db, storage };
export default app;
