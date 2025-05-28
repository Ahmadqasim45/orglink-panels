import React, { useState } from 'react';
import { 
  FaTimes, 
  FaUser, 
  FaHeart, 
  FaCalendar, 
  FaFileImage, 
  FaCheck, 
  FaExclamationTriangle,
  FaStethoscope,
  FaEye
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { db } from '../../firebase';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp
} from 'firebase/firestore';
import { APPROVAL_STATUS } from '../../utils/approvalSystem';

const MedicalDocumentDetailModal = ({ 
  isOpen, 
  onClose, 
  document, 
  onApprove, 
  onReject, 
  processing 
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  if (!isOpen || !document) return null;
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Handle approve with complete Firebase integration
  const handleApprove = async () => {
    if (document.medicalStatus !== 'medically_fit') {
      toast.error("Cannot approve a donor who is medically unfit");
      return;
    }

    try {
      console.log('🏥 Starting final approval process for document:', document.id);
      const timestamp = serverTimestamp();
      
      // Step 1: Update medical document status
      const medicalDocRef = doc(db, "medicalDocuments", document.id);
      await updateDoc(medicalDocRef, {
        status: APPROVAL_STATUS.FINAL_APPROVED,
        adminActionDate: timestamp,
        adminComment: "Medical evaluation approved. Donor is finally approved.",
        finalApprovalDate: timestamp,
        progressStatus: 100
      });
      console.log('✅ Medical document updated');

      // Step 2: Find and update donor record in medicalRecords
      if (document.donorId) {
        const donorRef = doc(db, "medicalRecords", document.donorId);
        await updateDoc(donorRef, {
          requestStatus: APPROVAL_STATUS.FINAL_APPROVED,
          status: APPROVAL_STATUS.FINAL_APPROVED,
          medicalEvaluationStatus: 'completed',
          finalAdminApproved: true,
          finalAdminComment: "Medical evaluation approved. Donor is finally approved.",
          finalEvaluationDate: timestamp,
          progressPercentage: 100,
          adminActionDate: timestamp
        });
        console.log('✅ Donor record updated');
      }

      // Step 3: Update donor in users collection if needed
      if (document.donorId) {
        try {
          const donorUserRef = doc(db, "users", document.donorId);
          await updateDoc(donorUserRef, {
            donorStatus: APPROVAL_STATUS.FINAL_APPROVED,
            lastStatusUpdate: timestamp
          });
          console.log('✅ Donor user status updated');
        } catch (error) {
          console.log('ℹ️ Could not update user status (user may not exist):', error.message);
        }
      }

      // Step 4: Send notification to donor
      await addDoc(collection(db, "notifications"), {
        userId: document.donorId,
        title: "🎉 Final Medical Approval Completed!",
        message: "Congratulations! Your medical evaluation has been finally approved by admin. You are now an active donor in our system.",
        type: "approval",
        subtype: "final_approval",
        read: false,
        createdAt: timestamp,
        priority: "high",
        metadata: {
          documentId: document.id,
          approvalDate: timestamp,
          approvalType: "final",
          donorName: document.donorName
        }
      });
      console.log('✅ Donor notification sent');

      // Step 5: Send notification to doctor
      if (document.doctorId) {
        await addDoc(collection(db, "notifications"), {
          userId: document.doctorId,
          title: "Donor Final Approval Completed",
          message: `Medical evaluation for donor ${document.donorName || 'Unknown'} has received final approval from admin.`,
          type: "approval",
          subtype: "final_approval",
          read: false,
          createdAt: timestamp,
          metadata: {
            documentId: document.id,
            donorId: document.donorId,
            donorName: document.donorName,
            approvalDate: timestamp
          }
        });
        console.log('✅ Doctor notification sent');
      }

      // Step 6: Create approval history record
      await addDoc(collection(db, "approvalHistory"), {
        documentId: document.id,
        donorId: document.donorId,
        doctorId: document.doctorId,
        action: "final_approval",
        status: APPROVAL_STATUS.FINAL_APPROVED,
        comment: "Medical evaluation approved. Donor is finally approved.",
        processedBy: "admin",
        processedAt: timestamp,
        donorName: document.donorName,
        doctorName: document.doctorName,
        organToDonate: document.organToDonate
      });
      console.log('✅ Approval history recorded');

      toast.success("🎉 Donor has been finally approved! All records updated.");
      
      // Call parent callback if provided
      if (onApprove) {
        await onApprove(document.id);
      }
      
      onClose();
    } catch (error) {
      console.error("❌ Error in final approval:", error);
      toast.error(`Failed to process final approval: ${error.message}`);
    }
  };
  // Handle reject with reason with complete Firebase integration
  const handleRejectWithReason = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      console.log('🚫 Starting final rejection process for document:', document.id);
      const timestamp = serverTimestamp();
      
      // Step 1: Update medical document status
      const medicalDocRef = doc(db, "medicalDocuments", document.id);
      await updateDoc(medicalDocRef, {
        status: APPROVAL_STATUS.FINAL_REJECTED,
        adminActionDate: timestamp,
        rejectionReason: rejectionReason,
        adminComment: `Medical evaluation rejected: ${rejectionReason}`,
        finalRejectionDate: timestamp,
        progressStatus: 0
      });
      console.log('✅ Medical document updated with rejection');

      // Step 2: Update donor record in medicalRecords
      if (document.donorId) {
        const donorRef = doc(db, "medicalRecords", document.donorId);
        await updateDoc(donorRef, {
          requestStatus: APPROVAL_STATUS.FINAL_REJECTED,
          status: APPROVAL_STATUS.FINAL_REJECTED,
          medicalEvaluationStatus: 'rejected',
          finalAdminRejected: true,
          finalRejectionReason: rejectionReason,
          finalAdminComment: `Medical evaluation rejected: ${rejectionReason}`,
          finalEvaluationDate: timestamp,
          progressPercentage: 0,
          adminActionDate: timestamp
        });
        console.log('✅ Donor record updated with rejection');
      }

      // Step 3: Update donor in users collection if needed
      if (document.donorId) {
        try {
          const donorUserRef = doc(db, "users", document.donorId);
          await updateDoc(donorUserRef, {
            donorStatus: APPROVAL_STATUS.FINAL_REJECTED,
            rejectionReason: rejectionReason,
            lastStatusUpdate: timestamp
          });
          console.log('✅ Donor user status updated with rejection');
        } catch (error) {
          console.log('ℹ️ Could not update user status (user may not exist):', error.message);
        }
      }

      // Step 4: Send notification to donor
      await addDoc(collection(db, "notifications"), {
        userId: document.donorId,
        title: "Medical Evaluation Result",
        message: `Your medical evaluation has been reviewed. Unfortunately, it was not approved. Reason: ${rejectionReason}`,
        type: "rejection",
        subtype: "final_rejection",
        read: false,
        createdAt: timestamp,
        priority: "high",
        metadata: {
          documentId: document.id,
          rejectionDate: timestamp,
          rejectionReason: rejectionReason,
          donorName: document.donorName
        }
      });
      console.log('✅ Donor rejection notification sent');

      // Step 5: Send notification to doctor
      if (document.doctorId) {
        await addDoc(collection(db, "notifications"), {
          userId: document.doctorId,
          title: "Donor Medical Evaluation Rejected",
          message: `Medical evaluation for donor ${document.donorName || 'Unknown'} has been rejected by admin. Reason: ${rejectionReason}`,
          type: "rejection",
          subtype: "final_rejection",
          read: false,
          createdAt: timestamp,
          metadata: {
            documentId: document.id,
            donorId: document.donorId,
            donorName: document.donorName,
            rejectionDate: timestamp,
            rejectionReason: rejectionReason
          }
        });
        console.log('✅ Doctor rejection notification sent');
      }

      // Step 6: Create rejection history record
      await addDoc(collection(db, "approvalHistory"), {
        documentId: document.id,
        donorId: document.donorId,
        doctorId: document.doctorId,
        action: "final_rejection",
        status: APPROVAL_STATUS.FINAL_REJECTED,
        comment: `Medical evaluation rejected: ${rejectionReason}`,
        rejectionReason: rejectionReason,
        processedBy: "admin",
        processedAt: timestamp,
        donorName: document.donorName,
        doctorName: document.doctorName,
        organToDonate: document.organToDonate
      });
      console.log('✅ Rejection history recorded');

      toast.success("Rejection processed successfully. All records updated.");
      
      // Call parent callback if provided
      if (onReject) {
        await onReject(document.id, rejectionReason);
      }
      
      setShowRejectModal(false);
      setRejectionReason('');
      onClose();
    } catch (error) {
      console.error("❌ Error in final rejection:", error);
      toast.error(`Failed to process rejection: ${error.message}`);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_admin_review': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b px-6 py-4 bg-white">
            <h2 className="text-xl font-bold text-gray-800">Medical Document Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Document Info */}
              <div className="space-y-6">
                
                {/* Donor Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <FaUser className="mr-2 text-blue-600" />
                    Donor Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Name:</span>
                      <p className="font-medium text-gray-900">{document.donorName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Organ to Donate:</span>
                      <p className="font-medium text-gray-900 flex items-center">
                        <FaHeart className="mr-1 text-red-500" />
                        {document.organToDonate}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Appointment Date:</span>
                      <p className="font-medium text-gray-900 flex items-center">
                        <FaCalendar className="mr-1 text-blue-500" />
                        {formatDate(document.appointmentDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Doctor Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <FaStethoscope className="mr-2 text-green-600" />
                    Doctor's Assessment
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Doctor Name:</span>
                      <p className="font-medium text-gray-900">{document.doctorName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Medical Status:</span>
                      <div className="mt-1">
                        {document.medicalStatus === 'medically_fit' ? (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <FaCheck className="inline mr-1" />
                            Medically Fit
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            <FaExclamationTriangle className="inline mr-1" />
                            Medically Unfit
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Medical Notes:</span>
                      <p className="mt-1 p-3 bg-white border rounded text-gray-900">
                        {document.notes || 'No notes provided'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Submitted On:</span>
                      <p className="font-medium text-gray-900">{formatDate(document.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Current Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Current Status</h3>
                  <div className="space-y-2">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status)}`}>
                        {document.status === 'pending_admin_review' ? 'Pending Admin Review' :
                         document.status === 'approved' ? 'Approved' :
                         document.status === 'rejected' ? 'Rejected' : document.status}
                      </span>
                    </div>
                    {document.adminActionDate && (
                      <div>
                        <span className="text-sm text-gray-500">Action Date:</span>
                        <p className="font-medium text-gray-900">{formatDate(document.adminActionDate)}</p>
                      </div>
                    )}
                    {document.rejectionReason && (
                      <div>
                        <span className="text-sm text-gray-500">Rejection Reason:</span>
                        <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                          {document.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Attached Document */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <FaFileImage className="mr-2 text-purple-600" />
                    Attached Medical Document
                  </h3>
                  
                  {document.hasAttachment && document.fileUrl ? (
                    <div className="space-y-4">
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{document.fileName}</p>
                            <p className="text-sm text-gray-500">Medical Document Image</p>
                          </div>
                          <button
                            onClick={() => setShowImageModal(true)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center text-sm"
                          >
                            <FaEye className="mr-1" />
                            View Full Size
                          </button>
                        </div>
                        
                        {/* Image Preview */}
                        <div className="relative">
                          <img
                            src={document.fileUrl}
                            alt="Medical Document"
                            className="w-full h-64 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setShowImageModal(true)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-20 rounded transition-opacity">
                            <span className="text-white text-sm font-medium">Click to enlarge</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <FaFileImage className="mx-auto text-gray-400 text-3xl mb-2" />
                      <p className="text-gray-500">No document was attached</p>
                    </div>
                  )}
                </div>

                {/* Decision Helper */}
                {document.status === 'pending_admin_review' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Admin Decision Guide</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Medical Status:</strong> {document.medicalStatus === 'medically_fit' ? 'Fit' : 'Unfit'}</p>
                      <p><strong>Has Document:</strong> {document.hasAttachment ? 'Yes' : 'No'}</p>
                      <p><strong>Doctor's Notes:</strong> {document.notes ? 'Provided' : 'None'}</p>
                    </div>
                    
                    {document.medicalStatus === 'medically_fit' ? (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                        ✓ Doctor marked as medically fit - Consider for approval
                      </div>
                    ) : (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                        ✗ Doctor marked as medically unfit - Consider for rejection
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Action Buttons */}
          {document.status === 'pending_admin_review' && (
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing[document.id]}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {processing[document.id] ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <FaExclamationTriangle className="mr-2" />
                      Reject Donor
                    </>
                  )}
                </button>
                
                {document.medicalStatus === 'medically_fit' && (
                  <button
                    onClick={handleApprove}
                    disabled={processing[document.id]}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {processing[document.id] ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      <>
                        <FaCheck className="mr-2" />
                        Approve Donor
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Rejection</h3>
              <p className="text-gray-600 mb-4">Please provide a reason for rejecting this donor:</p>
              
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows="4"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectWithReason}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && document.fileUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-60 flex justify-center items-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors z-10"
            >
              <FaTimes size={20} />
            </button>
            <img
              src={document.fileUrl}
              alt="Medical Document Full Size"
              className="max-w-full max-h-full object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default MedicalDocumentDetailModal;
