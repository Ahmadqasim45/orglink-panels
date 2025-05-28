// Test script for final approval workflow
import { db } from './src/firebase.js';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';

console.log('🧪 Testing Final Approval Workflow...');

// Test data
const testData = {
  donorId: "test-donor-final-" + Date.now(),
  donorName: "John Test Donor",
  doctorId: "test-doctor-final-" + Date.now(),
  doctorName: "Dr. Sarah Wilson",
  organToDonate: "Kidney",
  medicalStatus: "medically_fit",
  status: "pending_admin_review",
  notes: "Patient is in excellent health. All tests came back normal. Highly recommended for donation.",
  hasAttachment: true,
  fileName: "medical-report-complete.pdf",
  fileUrl: "https://via.placeholder.com/400x600/e8f5e8/2d5a2d?text=Medical+Report+APPROVED",
  appointmentDate: serverTimestamp(),
  createdAt: serverTimestamp(),
  doctorApproval: true,
  bloodType: "O+",
  age: 28,
  contactNumber: "+1234567890"
};

async function createTestScenario() {
  try {
    console.log('📋 Creating test medical document...');
    
    // Create medical document
    const docRef = await addDoc(collection(db, "medicalDocuments"), testData);
    console.log('✅ Test document created with ID:', docRef.id);
    
    // Create corresponding medical record
    const medicalRecord = {
      id: testData.donorId,
      donorName: testData.donorName,
      organToDonate: testData.organToDonate,
      requestStatus: "pending_admin_review",
      status: "pending_admin_review",
      medicalEvaluationStatus: "pending",
      progressPercentage: 75,
      createdAt: serverTimestamp(),
      doctorId: testData.doctorId,
      doctorName: testData.doctorName
    };
    
    await addDoc(collection(db, "medicalRecords"), medicalRecord);
    console.log('✅ Medical record created');
    
    // Create user record
    const userRecord = {
      id: testData.donorId,
      name: testData.donorName,
      email: `${testData.donorName.toLowerCase().replace(' ', '.')}@test.com`,
      role: "donor",
      donorStatus: "pending_admin_review",
      organToDonate: testData.organToDonate,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, "users"), userRecord);
    console.log('✅ User record created');
    
    console.log('🎯 Test scenario ready!');
    console.log('📍 Document ID:', docRef.id);
    console.log('👤 Donor ID:', testData.donorId);
    console.log('👨‍⚕️ Doctor ID:', testData.doctorId);
    
    return {
      documentId: docRef.id,
      donorId: testData.donorId,
      doctorId: testData.doctorId
    };
    
  } catch (error) {
    console.error('❌ Error creating test scenario:', error);
    throw error;
  }
}

async function checkWorkflowResults(testIds) {
  try {
    console.log('\n🔍 Checking workflow results...');
    
    // Check medical documents
    const medDocsQuery = query(
      collection(db, "medicalDocuments"),
      where("donorId", "==", testIds.donorId)
    );
    const medDocsSnapshot = await getDocs(medDocsQuery);
    medDocsSnapshot.forEach((doc) => {
      console.log('📄 Medical Document Status:', doc.data().status);
    });
    
    // Check medical records
    const medRecordsQuery = query(
      collection(db, "medicalRecords"),
      where("id", "==", testIds.donorId)
    );
    const medRecordsSnapshot = await getDocs(medRecordsQuery);
    medRecordsSnapshot.forEach((doc) => {
      console.log('🏥 Medical Record Status:', doc.data().status);
      console.log('📊 Progress:', doc.data().progressPercentage + '%');
    });
    
    // Check notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", testIds.donorId)
    );
    const notificationsSnapshot = await getDocs(notificationsQuery);
    console.log('🔔 Notifications sent:', notificationsSnapshot.size);
    
    // Check approval history
    const historyQuery = query(
      collection(db, "approvalHistory"),
      where("donorId", "==", testIds.donorId)
    );
    const historySnapshot = await getDocs(historyQuery);
    console.log('📚 History records:', historySnapshot.size);
    
  } catch (error) {
    console.error('❌ Error checking results:', error);
  }
}

// Run the test
async function runTest() {
  try {
    const testIds = await createTestScenario();
    
    console.log('\n🎮 Test scenario created! You can now:');
    console.log('1. Go to the admin panel');
    console.log('2. Find the test document');
    console.log('3. Test the approval/rejection workflow');
    console.log('4. Check the results using checkWorkflowResults()');
    
    // Store test IDs for later use
    global.testIds = testIds;
    
    // Set up a check function
    global.checkResults = () => checkWorkflowResults(testIds);
    
    console.log('\n💡 Run checkResults() after testing to see the results');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testFinalApproval = runTest;
  window.checkWorkflowResults = () => global.checkResults();
}

// Run immediately if in Node.js
if (typeof window === 'undefined') {
  runTest();
}

export { runTest, checkWorkflowResults };
