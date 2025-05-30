import React, { useState } from 'react';
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

// Import modular components
import DocumentHeader from './medical-document/DocumentHeader';
import DocumentBody from './medical-document/DocumentBody';
import ActionButtonsFooter from './medical-document/ActionButtonsFooter';
import RejectionModal from './medical-document/RejectionModal';
import ImageModal from './medical-document/ImageModal';

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
          <DocumentHeader onClose={onClose} />

          {/* Body */}
          <DocumentBody 
            document={document} 
            formatDate={formatDate} 
            getStatusColor={getStatusColor}
            setShowImageModal={setShowImageModal} 
          />

          {/* Footer - Action Buttons */}
          <ActionButtonsFooter 
            document={document}
            onClose={onClose}
            setShowRejectModal={setShowRejectModal}
            handleApprove={handleApprove}
            processing={processing}
          />
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <RejectionModal 
        showRejectModal={showRejectModal}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        setShowRejectModal={setShowRejectModal}
        handleRejectWithReason={handleRejectWithReason}
      />

      {/* Image Modal */}
      <ImageModal 
        showImageModal={showImageModal}
        fileUrl={document?.fileUrl}
        setShowImageModal={setShowImageModal}
      />
    </>
  );
};

export default MedicalDocumentDetailModal;
