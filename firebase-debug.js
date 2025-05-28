/**
 * Firebase Authentication Debug Script
 * Tests Firebase connection and authentication functionality
 */

import { auth, db } from './src/firebase.js';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  connectFirestoreEmulator
} from 'firebase/firestore';

console.log('🔥 Firebase Authentication Debug Script');
console.log('=====================================\n');

// Test Firebase configuration
console.log('📋 Firebase Configuration:');
console.log('Project ID:', db.app.options.projectId);
console.log('Auth Domain:', db.app.options.authDomain);
console.log('API Key:', db.app.options.apiKey ? 'Present' : 'Missing');
console.log('');

// Test Firestore connection
async function testFirestoreConnection() {
  try {
    console.log('🔌 Testing Firestore connection...');
    
    // Try to read from a collection
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log(`✅ Firestore connected successfully`);
    console.log(`📊 Found ${snapshot.size} users in database`);
    
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    return false;
  }
}

// Test authentication state
function testAuthState() {
  return new Promise((resolve) => {
    console.log('🔐 Testing authentication state...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('✅ User is authenticated:', user.uid);
        console.log('📧 Email:', user.email);
        console.log('✅ Email verified:', user.emailVerified);
        
        // Try to fetch user data
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('📋 User data found:', userData.role || 'No role');
          } else {
            console.log('⚠️ User document not found in Firestore');
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
        }
      } else {
        console.log('🚪 No user is currently authenticated');
      }
      
      unsubscribe();
      resolve(user);
    }, (error) => {
      console.error('❌ Auth state change error:', error);
      unsubscribe();
      resolve(null);
    });
  });
}

// Test login with dummy credentials (will fail but shows auth is working)
async function testAuthFlow() {
  try {
    console.log('🔑 Testing authentication flow...');
    
    // This will fail but should give us useful error info
    await signInWithEmailAndPassword(auth, 'test@example.com', 'wrongpassword');
  } catch (error) {
    console.log('📋 Auth test result (expected to fail):');
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      console.log('✅ Authentication system is working (credentials just wrong)');
    } else {
      console.log('❌ Authentication system may have issues');
    }
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Firebase debug tests...\n');
  
  try {
    // Test 1: Firestore connection
    const firestoreOk = await testFirestoreConnection();
    console.log('');
    
    // Test 2: Auth state
    await testAuthState();
    console.log('');
    
    // Test 3: Auth flow
    await testAuthFlow();
    console.log('');
    
    console.log('🏁 Debug tests completed');
    
    if (firestoreOk) {
      console.log('✅ Firebase appears to be working correctly');
      console.log('💡 If you\'re still seeing authentication errors, check:');
      console.log('   - Network connectivity');
      console.log('   - Firebase project permissions');
      console.log('   - User credentials');
      console.log('   - Browser console for additional errors');
    } else {
      console.log('❌ Firebase connection issues detected');
      console.log('💡 Check your Firebase configuration and network');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  window.firebaseDebug = {
    runTests,
    testFirestoreConnection,
    testAuthState,
    testAuthFlow
  };
  
  console.log('🛠️ Debug functions available on window.firebaseDebug');
  console.log('💡 Run window.firebaseDebug.runTests() to start debugging');
}

export { runTests, testFirestoreConnection, testAuthState, testAuthFlow };
