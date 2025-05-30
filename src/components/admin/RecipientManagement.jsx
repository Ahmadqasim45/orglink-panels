"use client"

import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../../firebase";
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  orderBy 
} from "firebase/firestore";
import { toast } from "react-toastify";
import { APPROVAL_STATUS } from "../../utils/approvalSystem";

import TabNavigation from './recipient-management/TabNavigation';
import RecipientTable from './recipient-management/RecipientTable';
import RecipientDetailsModal from './recipient-management/RecipientDetailsModal';
import ErrorAlert from './recipient-management/ErrorAlert';
import LoadingSpinner from './recipient-management/LoadingSpinner';

function RecipientManagement() {
  const [recipients, setRecipients] = useState({
    pending: [],
    approved: [],
    rejected: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  // Helper functions moved to ./recipient-management/RecipientUtils.js

  const fetchRecipients = useCallback(async () => {
    try {
      setLoading(true);
      const recipientsQuery = query(
        collection(db, "recipients"),
        orderBy("updatedAt", "desc")
      );

      const snapshot = await getDocs(recipientsQuery);
      const categorizedRecipients = {
        pending: [],
        approved: [],
        rejected: []
      };      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        
        // Check final admin status first
        if (data.adminReviewed) {
          if (data.requestStatus === "admin-approved" || data.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED) {
            categorizedRecipients.approved.push(data);
          } else if (data.requestStatus === "rejected" || data.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED) {
            categorizedRecipients.rejected.push(data);
          }
        } else if (data.doctorReviewed || 
                   data.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ||
                   data.requestStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL ||
                   data.requestStatus === "doctor-approved") {
          // Include recipients pending initial admin approval
          categorizedRecipients.pending.push(data);
        } else if (data.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ||
                   data.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ||
                   data.requestStatus === APPROVAL_STATUS.INITIAL_ADMIN_REJECTED) {
          categorizedRecipients.rejected.push(data);
        }
      });

      setRecipients(categorizedRecipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      setError("Failed to load recipients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleAdminDecision = async (recipientId, followDoctorDecision = true, comment = "") => {
    try {
      setActionInProgress(true);
      
      const recipientRef = doc(db, "recipients", recipientId);
      const recipientDoc = await getDoc(recipientRef);
      
      if (!recipientDoc.exists()) {
        toast.error("Recipient not found");
        return;
      }
      
      const recipientData = recipientDoc.data();
      const wasDoctorApproved = recipientData.requestStatus === "doctor-approved";
      
      let newStatus;
      if (followDoctorDecision) {
        newStatus = wasDoctorApproved ? "admin-approved" : "rejected";
      } else {
        newStatus = wasDoctorApproved ? "rejected" : "admin-approved";
      }
      
      await updateDoc(recipientRef, {
        requestStatus: newStatus,
        adminReviewed: true,
        adminReviewDate: new Date(),
        adminComment: comment || (followDoctorDecision ? 
          `Admin confirmed doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}` : 
          `Admin overrode doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}`),
        updatedAt: new Date()
      });

      await addDoc(collection(db, "approvalHistory"), {
        recipientId: recipientId,
        previousStatus: recipientData.requestStatus,
        newStatus: newStatus,
        timestamp: new Date(),
        updatedBy: auth.currentUser.uid,
        updatedRole: 'admin',
        hospitalName: recipientData.hospitalAssociation || "Unknown hospital",
        doctorDecision: recipientData.requestStatus,
        adminAction: followDoctorDecision ? 'confirmed' : 'overrode',
        comment: comment || (followDoctorDecision ? 
          `Admin confirmed doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}` : 
          `Admin overrode doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}`),
        isFinalDecision: true
      });

      try {
        if (recipientData.userId) {
          await addDoc(collection(db, "notifications"), {
            userId: recipientData.userId,
            title: "Application Status Update",
            message: `Your organ/tissue request has been ${newStatus === "admin-approved" ? "approved" : "rejected"}`,
            status: "unread",
            createdAt: new Date()
          });
        }
        
        if (recipientData.doctorId) {
          await addDoc(collection(db, "notifications"), {
            userId: recipientData.doctorId,
            title: "Application Status Update",
            message: `The application for ${recipientData.fullName || "a recipient"} has been ${followDoctorDecision ? 'confirmed' : 'overridden'} by admin`,
            status: "unread",
            createdAt: new Date()
          });
        }
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError);
      }

      toast.success(`Request ${newStatus === "admin-approved" ? "approved" : "rejected"} successfully`);
      await fetchRecipients();
      
      if (showDetailModal) {
        closeDetailModal();
      }
    } catch (error) {
      console.error("Error in admin decision:", error);
      toast.error("Failed to process admin decision");
    } finally {
      setActionInProgress(false);
    }
  };
  // Recipient information helper functions moved to ./recipient-management/RecipientUtils.js
  const viewRecipientDetails = (recipient) => {
    setSelectedRecipient(recipient);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setTimeout(() => setSelectedRecipient(null), 300);
  };

  const clearError = () => {
    setError(null);
  };
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Recipient Management</h2>

      <ErrorAlert error={error} clearError={clearError} />
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} actionInProgress={actionInProgress} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <RecipientTable 
          recipients={recipients} 
          activeTab={activeTab}
          viewRecipientDetails={viewRecipientDetails}
          handleAdminDecision={handleAdminDecision}
          actionInProgress={actionInProgress}
        />
      )}

      {showDetailModal && (
        <RecipientDetailsModal 
          recipient={selectedRecipient}
          closeDetailModal={closeDetailModal}
          handleAdminDecision={handleAdminDecision}
          actionInProgress={actionInProgress}
        />
      )}
    </div>
  );
}

export default RecipientManagement;
