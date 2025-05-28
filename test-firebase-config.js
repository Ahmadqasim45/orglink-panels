/**
 * Firebase Configuration Test
 * Simple test to check if Firebase is properly configured
 */

// Test Firebase configuration without React dependencies
const firebaseConfig = {
    apiKey: "AIzaSyABcrKZpDvuAXG70cEH18GkDFjmP8EcJvg",
    authDomain: "organdonor-82109.firebaseapp.com",
    projectId: "organdonor-82109",
    storageBucket: "organdonor-82109.appspot.com",
    messagingSenderId: "165856902258",
    appId: "1:165856902258:web:b6ffc2759baccd4f03d6eb",
    measurementId: "G-MP513N5BP3"
};

console.log('🔥 Firebase Configuration Test');
console.log('===============================\n');

console.log('📋 Configuration Details:');
console.log('API Key:', firebaseConfig.apiKey ? 'Present' : 'Missing');
console.log('Auth Domain:', firebaseConfig.authDomain);
console.log('Project ID:', firebaseConfig.projectId);
console.log('Storage Bucket:', firebaseConfig.storageBucket);
console.log('Messaging Sender ID:', firebaseConfig.messagingSenderId);
console.log('App ID:', firebaseConfig.appId);
console.log('');

// Validate required fields
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
    console.log('❌ Missing required fields:', missingFields.join(', '));
} else {
    console.log('✅ All required configuration fields are present');
}

// Check for common configuration issues
console.log('\n🔍 Configuration Validation:');

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.length < 30) {
    console.log('❌ API key appears to be invalid or too short');
} else {
    console.log('✅ API key format looks correct');
}

if (!firebaseConfig.authDomain.includes('firebaseapp.com')) {
    console.log('❌ Auth domain format appears incorrect');
} else {
    console.log('✅ Auth domain format looks correct');
}

if (!firebaseConfig.projectId || firebaseConfig.projectId.length < 5) {
    console.log('❌ Project ID appears to be invalid');
} else {
    console.log('✅ Project ID format looks correct');
}

console.log('\n💡 Troubleshooting Tips:');
console.log('1. Ensure Firebase Authentication is enabled in Firebase Console');
console.log('2. Check that your domain is added to authorized domains');
console.log('3. Verify your Firebase project is active and not deleted');
console.log('4. Check browser network connectivity');
console.log('5. Clear browser cache and cookies');
console.log('6. Check browser console for additional error details');

console.log('\n🌐 Project URLs:');
console.log('Firebase Console:', `https://console.firebase.google.com/project/${firebaseConfig.projectId}`);
console.log('Auth Settings:', `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`);
console.log('Firestore:', `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);

console.log('\n✅ Configuration test completed');
