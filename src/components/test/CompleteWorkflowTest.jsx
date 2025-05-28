// Complete Workflow Test Component
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import MedicalDocumentDetailModal from '../admin/MedicalDocumentDetailModal';

const CompleteWorkflowTest = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState({});
  const [testResults, setTestResults] = useState({});

  // Load test documents
  useEffect(() => {
    const loadTestDocuments = async () => {
      try {
        const q = query(
          collection(db, "medicalDocuments"),
          where("status", "==", "pending_admin_review")
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setDocuments(docs);
          console.log(`📋 Loaded ${docs.length} pending documents`);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error loading documents:", error);
        toast.error("Failed to load test documents");
      }
    };

    loadTestDocuments();
  }, []);

  // Test individual approval
  const testApproval = async (docId) => {
    setProcessing(prev => ({ ...prev, [docId]: true }));
    
    try {
      // Find the document
      const document = documents.find(d => d.id === docId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Simulate approval by opening modal
      setSelectedDocument(document);
      setModalOpen(true);
      
      setTestResults(prev => ({
        ...prev,
        [docId]: { status: 'ready_for_approval', timestamp: new Date() }
      }));

    } catch (error) {
      console.error("Test approval error:", error);
      setTestResults(prev => ({
        ...prev,
        [docId]: { status: 'error', error: error.message, timestamp: new Date() }
      }));
    }
    
    setProcessing(prev => ({ ...prev, [docId]: false }));
  };

  // Verify collection updates after approval/rejection
  const verifyCollectionUpdates = async (docId, expectedStatus) => {
    try {
      // Check medicalDocuments
      const docRef = doc(db, "medicalDocuments", docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return { success: false, error: "Document not found" };
      }

      const docData = docSnap.data();
      const results = {
        medicalDocument: docData.status === expectedStatus,
        hasTimestamp: !!docData.adminActionDate,
        hasComment: !!docData.adminComment
      };

      // Check medicalRecords if donorId exists
      if (docData.donorId) {
        const donorRef = doc(db, "medicalRecords", docData.donorId);
        const donorSnap = await getDoc(donorRef);
        
        if (donorSnap.exists()) {
          const donorData = donorSnap.data();
          results.medicalRecord = donorData.status === expectedStatus;
          results.progressUpdated = expectedStatus === 'FINAL_APPROVED' ? 
            donorData.progressPercentage === 100 : 
            donorData.progressPercentage === 0;
        }
      }

      // Check notifications
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("metadata.documentId", "==", docId)
      );
      const notificationsSnap = await getDocs(notificationsQuery);
      results.notificationsSent = notificationsSnap.size > 0;

      // Check approval history
      const historyQuery = query(
        collection(db, "approvalHistory"),
        where("documentId", "==", docId)
      );
      const historySnap = await getDocs(historyQuery);
      results.historyCreated = historySnap.size > 0;

      return { success: true, results };

    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle modal approval callback
  const handleModalApprove = async (docId) => {
    console.log(`✅ Modal approval completed for document: ${docId}`);
    
    // Wait a moment for Firebase to process
    setTimeout(async () => {
      const verification = await verifyCollectionUpdates(docId, 'FINAL_APPROVED');
      setTestResults(prev => ({
        ...prev,
        [docId]: {
          status: 'approved',
          verification,
          timestamp: new Date()
        }
      }));
    }, 2000);
  };

  // Handle modal rejection callback
  const handleModalReject = async (docId, reason) => {
    console.log(`❌ Modal rejection completed for document: ${docId}, reason: ${reason}`);
    
    // Wait a moment for Firebase to process
    setTimeout(async () => {
      const verification = await verifyCollectionUpdates(docId, 'FINAL_REJECTED');
      setTestResults(prev => ({
        ...prev,
        [docId]: {
          status: 'rejected',
          verification,
          reason,
          timestamp: new Date()
        }
      }));
    }, 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🧪 Complete Final Approval Workflow Test
        </h1>

        {/* Test Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">Test Instructions:</h2>
          <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
            <li>Click "Test Approval" on any document to open the modal</li>
            <li>Use the modal's "Approve Donor" or "Reject Donor" buttons</li>
            <li>Verify that all collections get updated properly</li>
            <li>Check the verification results below</li>
          </ol>
        </div>

        {/* Test Documents */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Pending Documents ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No pending documents found.</p>
              <p className="text-sm mt-2">
                Run the test data script first: <code>node test-final-approval-complete.js</code>
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {documents.map(doc => {
                const testResult = testResults[doc.id];
                
                return (
                  <div key={doc.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {doc.donorName} - {doc.organToDonate}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Doctor: {doc.doctorName} | Status: {doc.medicalStatus}
                        </p>
                        <p className="text-xs text-gray-500">ID: {doc.id}</p>
                      </div>
                      
                      <button
                        onClick={() => testApproval(doc.id)}
                        disabled={processing[doc.id]}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {processing[doc.id] ? 'Processing...' : 'Test Approval'}
                      </button>
                    </div>

                    {/* Test Results */}
                    {testResult && (
                      <div className="mt-3 p-3 bg-white border rounded">
                        <h4 className="font-medium text-gray-700 mb-2">Test Results:</h4>
                        
                        <div className="text-sm space-y-1">
                          <div className="flex items-center">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              testResult.status === 'approved' ? 'bg-green-500' :
                              testResult.status === 'rejected' ? 'bg-red-500' :
                              testResult.status === 'ready_for_approval' ? 'bg-yellow-500' :
                              'bg-gray-500'
                            }`}></span>
                            <span>Status: {testResult.status}</span>
                          </div>
                          
                          {testResult.reason && (
                            <div className="text-red-600">
                              Reason: {testResult.reason}
                            </div>
                          )}
                          
                          {testResult.verification && (
                            <div className="mt-2">
                              <h5 className="font-medium text-gray-600">Database Verification:</h5>
                              <div className="ml-4 space-y-1">
                                {Object.entries(testResult.verification.results || {}).map(([key, value]) => (
                                  <div key={key} className="flex items-center">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                      value ? 'bg-green-500' : 'bg-red-500'
                                    }`}></span>
                                    <span className="text-xs">
                                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}: {value ? '✓' : '✗'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              {testResult.verification.error && (
                                <div className="text-red-600 text-xs mt-1">
                                  Error: {testResult.verification.error}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            Tested at: {testResult.timestamp?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Real-time Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800">Pending Documents</h3>
            <p className="text-2xl font-bold text-blue-600">{documents.length}</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800">Tests Completed</h3>
            <p className="text-2xl font-bold text-green-600">
              {Object.values(testResults).filter(r => r.status === 'approved' || r.status === 'rejected').length}
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800">Success Rate</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {Object.values(testResults).length > 0 ? 
                Math.round((Object.values(testResults).filter(r => 
                  r.verification?.success && Object.values(r.verification.results || {}).every(v => v)
                ).length / Object.values(testResults).length) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Medical Document Detail Modal */}
      <MedicalDocumentDetailModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onApprove={handleModalApprove}
        onReject={handleModalReject}
        processing={processing}
      />
    </div>
  );
};

export default CompleteWorkflowTest;
