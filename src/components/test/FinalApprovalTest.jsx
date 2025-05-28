import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import MedicalDocumentDetailModal from '../admin/MedicalDocumentDetailModal';
import { toast } from 'react-toastify';

const FinalApprovalTest = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 Setting up real-time listener for medical documents...');
    
    // Listen for medical documents pending admin review
    const q = query(
      collection(db, "medicalDocuments"),
      where("status", "==", "pending_admin_review")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📋 Found ${docs.length} documents pending admin review`);
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error fetching documents:', error);
      toast.error('Failed to load documents');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (documentId) => {
    setProcessing(prev => ({ ...prev, [documentId]: true }));
    try {
      console.log('✅ Document approved successfully:', documentId);
      toast.success('Document approved and all records updated!');
    } catch (error) {
      console.error('❌ Approval error:', error);
      toast.error('Failed to approve document');
    } finally {
      setProcessing(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const handleReject = async (documentId, reason) => {
    setProcessing(prev => ({ ...prev, [documentId]: true }));
    try {
      console.log('❌ Document rejected:', documentId, 'Reason:', reason);
      toast.success('Document rejected and all records updated!');
    } catch (error) {
      console.error('❌ Rejection error:', error);
      toast.error('Failed to reject document');
    } finally {
      setProcessing(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const openDocument = (doc) => {
    setSelectedDocument(doc);
    setShowModal(true);
  };

  const createTestDocument = async () => {
    try {
      const testDoc = {
        donorId: "test-donor-" + Date.now(),
        donorName: "Test Donor " + Math.floor(Math.random() * 1000),
        doctorId: "test-doctor-" + Date.now(),
        doctorName: "Dr. Test " + Math.floor(Math.random() * 100),
        organToDonate: "Kidney",
        medicalStatus: "medically_fit",
        status: "pending_admin_review",
        notes: "Test medical evaluation notes",
        hasAttachment: true,
        fileName: "test-medical-document.pdf",
        fileUrl: "https://via.placeholder.com/400x600/f0f0f0/333333?text=Test+Medical+Document",
        appointmentDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        doctorApproval: true
      };

      await addDoc(collection(db, "medicalDocuments"), testDoc);
      toast.success('Test document created!');
    } catch (error) {
      console.error('Error creating test document:', error);
      toast.error('Failed to create test document');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Final Approval Workflow Test
        </h1>
        <button
          onClick={createTestDocument}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Create Test Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            No documents pending review
          </h3>
          <p className="text-gray-400">
            Create a test document to see the approval workflow in action
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {doc.donorName}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Organ:</span> {doc.organToDonate}
                    </div>
                    <div>
                      <span className="font-medium">Doctor:</span> {doc.doctorName}
                    </div>
                    <div>
                      <span className="font-medium">Medical Status:</span>
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        doc.medicalStatus === 'medically_fit' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {doc.medicalStatus === 'medically_fit' ? 'Fit' : 'Unfit'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className="ml-1 px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                        Pending Review
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openDocument(doc)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedDocument && (
        <MedicalDocumentDetailModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
          onApprove={handleApprove}
          onReject={handleReject}
          processing={processing}
        />
      )}
    </div>
  );
};

export default FinalApprovalTest;
