import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, serverTimestamp, addDoc, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { 
  APPROVAL_STATUS, 
  getStatusDisplay,
  getStatusBadgeColor 
} from '../../utils/approvalSystem';

// Import the new modular components
import DonorTabs from './donors/DonorTabs';
import DonorTable from './donors/DonorTable';
import DonorDetailModal from './donors/DonorDetailModal';
import ConfirmationModal from './donors/ConfirmationModal';
import MedicalDocumentReviewSection from './donors/MedicalDocumentReviewSection';

function DonorManagement() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    console.log("DonorManagement component mounted");
    fetchDonors(activeTab);
    return () => console.log("DonorManagement unmounting");
  }, [activeTab]);

  const fetchDonors = async (status) => {
    try {
      console.log("⏳ Fetching donors with status:", status);
      setLoading(true);
      setError(null);
      
      let donorsData = [];      let queryFilters = [];
        if (status === 'pending') {
        queryFilters = [
          "pending",
          "doctor-approved",
          "initial-doctor-approved",
          "pending-initial-admin-approval"
        ];
        // Add APPROVAL_STATUS values only if they're defined
        if (APPROVAL_STATUS.PENDING) queryFilters.push(APPROVAL_STATUS.PENDING);
        if (APPROVAL_STATUS.DOCTOR_APPROVED) queryFilters.push(APPROVAL_STATUS.DOCTOR_APPROVED);
        if (APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED) queryFilters.push(APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED);
        if (APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL) queryFilters.push(APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL);      } else if (status === 'approved') {
        queryFilters = [
          "admin-approved",
          "approved",
          "initially-approved"
        ];
        // Add APPROVAL_STATUS values only if they're defined
        if (APPROVAL_STATUS.ADMIN_APPROVED) queryFilters.push(APPROVAL_STATUS.ADMIN_APPROVED);
        if (APPROVAL_STATUS.FINAL_APPROVED) queryFilters.push(APPROVAL_STATUS.FINAL_APPROVED);
        if (APPROVAL_STATUS.INITIALLY_APPROVED) queryFilters.push(APPROVAL_STATUS.INITIALLY_APPROVED);      } else if (status === 'rejected') {
        queryFilters = [
          "doctor-rejected",
          "admin-rejected",
          "rejected",
          "initial-doctor-rejected",
          "initial-admin-rejected"
        ];
        // Add APPROVAL_STATUS values only if they're defined
        if (APPROVAL_STATUS.DOCTOR_REJECTED) queryFilters.push(APPROVAL_STATUS.DOCTOR_REJECTED);
        if (APPROVAL_STATUS.ADMIN_REJECTED) queryFilters.push(APPROVAL_STATUS.ADMIN_REJECTED);
        if (APPROVAL_STATUS.FINAL_REJECTED) queryFilters.push(APPROVAL_STATUS.FINAL_REJECTED);
        if (APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED) queryFilters.push(APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED);
        if (APPROVAL_STATUS.INITIAL_ADMIN_REJECTED) queryFilters.push(APPROVAL_STATUS.INITIAL_ADMIN_REJECTED);
      }
      
      console.log("Query filters:", queryFilters);
      
      for (const statusFilter of queryFilters) {
        const requestQuery = query(
          collection(db, 'medicalRecords'),
          where('requestStatus', '==', statusFilter),
          limit(50)
        );
        
        const requestSnapshot = await getDocs(requestQuery);
        console.log(`📋 Found ${requestSnapshot.size} donors with requestStatus=${statusFilter}`);
        
        const records = requestSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        donorsData = [...donorsData, ...records];
        
        const statusQuery = query(
          collection(db, 'medicalRecords'),
          where('status', '==', statusFilter),
          limit(50)
        );
        
        const statusSnapshot = await getDocs(statusQuery);
        console.log(`📋 Found ${statusSnapshot.size} donors with status=${statusFilter}`);
        
        const existingIds = new Set(donorsData.map(d => d.id));
        
        statusSnapshot.forEach(doc => {
          if (!existingIds.has(doc.id)) {
            donorsData.push({
              id: doc.id,
              ...doc.data()
            });
            existingIds.add(doc.id);
          }
        });
      }
        console.log(`🧑 Fetching user data for ${donorsData.length} donors`);
      
      // Add a counter for successful user data fetches
      let successfulUserFetches = 0;
      let failedUserFetches = 0;
      
      for (const donor of donorsData) {
        if (donor.donorId) {
          try {
            const userDocRef = doc(db, 'users', donor.donorId);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
              donor.userData = userDocSnap.data();
              successfulUserFetches++;
            } else {
              console.warn(`⚠️ User document not found for donor ${donor.id} (donorId: ${donor.donorId})`);
              failedUserFetches++;
            }
          } catch (userError) {
            console.warn(`⚠️ Error fetching user data for donor ${donor.id}:`, userError);
            failedUserFetches++;
          }
        } else {
          console.warn(`⚠️ No donorId found for donor ${donor.id}`);
          failedUserFetches++;
        }
      }
      
      console.log(`✅ User data fetch summary: ${successfulUserFetches} successful, ${failedUserFetches} failed`);
      console.log(`✅ Total donors loaded: ${donorsData.length}`);
      setDonors(donorsData);    } catch (error) {
      console.error('❌ Error fetching donors:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to load donors';
      if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again.';
      } else if (error.message) {
        errorMessage = `Error loading donors: ${error.message}`;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateDonorStatus = async (donorId, newStatus, isOverride = false) => {
    try {
      console.log(`🔄 Updating donor ${donorId} to status ${newStatus}, override: ${isOverride}`);
      setActionInProgress(true);
      
      if (newStatus === APPROVAL_STATUS.ADMIN_APPROVED && !adminComment.trim() && !isOverride) {
        toast.error('Please provide a comment for approval');
        setActionInProgress(false);
        return false;
      }
      
      let rejectionReason = '';
      if (newStatus === APPROVAL_STATUS.ADMIN_REJECTED && !isOverride) {
        rejectionReason = prompt('Please provide a reason for rejection:');
        if (!rejectionReason || !rejectionReason.trim()) {
          toast.error('Rejection reason is required');
          setActionInProgress(false);
          return false;
        }
      }
      
      const donorRef = doc(db, 'medicalRecords', donorId);
      const donorSnap = await getDoc(donorRef);
      
      if (!donorSnap.exists()) {
        toast.error('Donor record not found');
        setActionInProgress(false);
        return false;
      }
      
      const donorData = donorSnap.data();
      const previousStatus = donorData.requestStatus || donorData.status;
      
      const updateData = {
        requestStatus: newStatus,
        status: newStatus,
        updatedAt: serverTimestamp(),
        adminReviewed: true,
        adminId: auth.currentUser?.uid || 'admin'
      };
      
      if (newStatus === APPROVAL_STATUS.ADMIN_APPROVED) {
        updateData.adminComment = isOverride ? 'Admin confirmed doctor\'s approval' : adminComment;
        updateData.adminApprovalDate = serverTimestamp();
      } else if (newStatus === APPROVAL_STATUS.ADMIN_REJECTED) {
        updateData.adminComment = isOverride ? 'Admin confirmed doctor\'s rejection' : rejectionReason;
        updateData.rejectionReason = isOverride ? 'Admin confirmed doctor\'s rejection' : rejectionReason;
        updateData.rejectionDate = serverTimestamp();
      }
      
      console.log("📝 Update data:", updateData);
      
      await updateDoc(donorRef, updateData);
      console.log("✅ Database updated successfully");
      
      await addDoc(collection(db, 'approvalHistory'), {
        recordId: donorId,
        recordType: 'donor',
        previousStatus: previousStatus,
        newStatus: newStatus,
        changedBy: auth.currentUser?.uid || 'admin',
        timestamp: serverTimestamp(),
        reason: updateData.adminComment || updateData.rejectionReason || '',
        userRole: 'admin',
        isOverride: isOverride
      });
      
      console.log("📋 Approval history created");
      
      if (isOverride) {
        toast.success(`Confirmed doctor's ${newStatus === APPROVAL_STATUS.ADMIN_APPROVED ? 'approval' : 'rejection'}`);
      } else {
        toast.success(`Donor has been ${newStatus.replace('-', ' ')}`);
      }
      
      await fetchDonors(activeTab);
      setActionInProgress(false);
      return true;
    } catch (error) {
      console.error('❌ Error updating donor status:', error);
      toast.error('Failed to update donor: ' + error.message);
      setActionInProgress(false);
      return false;
    }
  };

  const overrideStatus = async (donorId, isApproving) => {
    try {
      setActionInProgress(true);
      
      const donorRef = doc(db, 'medicalRecords', donorId);
      const donorSnap = await getDoc(donorRef);
      
      if (!donorSnap.exists()) {
        toast.error('Donor record not found');
        setActionInProgress(false);
        return false;
      }
      
      const donorData = donorSnap.data();
      const previousStatus = donorData.requestStatus || donorData.status;
      const isDoctorApproved = previousStatus === APPROVAL_STATUS.DOCTOR_APPROVED;
      const isDoctorRejected = previousStatus === APPROVAL_STATUS.DOCTOR_REJECTED;
      
      if ((isDoctorApproved && !isApproving) || (isDoctorRejected && isApproving)) {
        const overrideReason = prompt(`Please provide a reason for overriding the doctor's ${isDoctorApproved ? 'approval' : 'rejection'}:`);
        if (!overrideReason || !overrideReason.trim()) {
          toast.error('Override reason is required');
          setActionInProgress(false);
          return false;
        }
        
        const newStatus = isApproving ? APPROVAL_STATUS.ADMIN_APPROVED : APPROVAL_STATUS.ADMIN_REJECTED;
        
        const updateData = {
          requestStatus: newStatus,
          status: newStatus,
          updatedAt: serverTimestamp(),
          adminReviewed: true,
          adminId: auth.currentUser?.uid || 'admin',
          adminComment: overrideReason,
          adminOverride: true,
          overrideReason: overrideReason
        };
        
        if (isApproving) {
          updateData.adminApprovalDate = serverTimestamp();
        } else {
          updateData.rejectionReason = overrideReason;
          updateData.rejectionDate = serverTimestamp();
        }
        
        await updateDoc(donorRef, updateData);
        
        await addDoc(collection(db, 'approvalHistory'), {
          recordId: donorId,
          recordType: 'donor',
          previousStatus: previousStatus,
          newStatus: newStatus,
          changedBy: auth.currentUser?.uid || 'admin',
          timestamp: serverTimestamp(),
          reason: overrideReason,
          userRole: 'admin',
          isOverride: true,
          overrideAction: `Admin overrode doctor's ${isDoctorApproved ? 'approval' : 'rejection'}`
        });
        
        toast.success(`Successfully overrode doctor's ${isDoctorApproved ? 'approval' : 'rejection'}`);
        await fetchDonors(activeTab);
        setActionInProgress(false);
        return true;
      } else {
        toast.error('Invalid override action');
        setActionInProgress(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Error overriding status:', error);
      toast.error('Failed to override: ' + error.message);
      setActionInProgress(false);
      return false;
    }
  };

  const openConfirmationModal = (action, donor) => {
    setSelectedDonor(donor);
    setConfirmationAction(action);
    setConfirmationModalOpen(true);
  };

  const closeConfirmationModal = () => {
    setConfirmationModalOpen(false);
    setConfirmationAction(null);
  };
  const handleConfirmation = async () => {
    let success = false;
    
    if (confirmationAction === 'confirmApproval') {
      success = await updateDonorStatus(selectedDonor.id, APPROVAL_STATUS.ADMIN_APPROVED, true);
    } else if (confirmationAction === 'confirmRejection') {
      success = await updateDonorStatus(selectedDonor.id, APPROVAL_STATUS.ADMIN_REJECTED, true);
    } else if (confirmationAction === 'overrideApproval') {
      success = await overrideStatus(selectedDonor.id, false); // Override to reject
    } else if (confirmationAction === 'overrideRejection') {
      success = await overrideStatus(selectedDonor.id, true); // Override to approve
    } else if (confirmationAction === 'initialApprove') {
      success = await handleInitialApproval(selectedDonor.id);
    } else if (confirmationAction === 'initialReject') {
      success = await handleInitialRejection(selectedDonor.id);
    }
    
    if (success) {
      closeConfirmationModal();
      if (showDetailModal) {
        closeDetailModal();
      }
    }
  };

  const handleInitialApproval = async (donorId) => {
    try {
      setActionInProgress(true);
      
      const { createApprovalNotification } = await import('../../utils/approvalSystem');
      
      const donorRef = doc(db, 'medicalRecords', donorId);
      const donorSnap = await getDoc(donorRef);
      
      if (!donorSnap.exists()) {
        toast.error('Donor record not found');
        setActionInProgress(false);
        return false;
      }
      
      const donorData = donorSnap.data();
      const previousStatus = donorData.requestStatus || donorData.status;
      
      const updateData = {
        requestStatus: APPROVAL_STATUS.INITIALLY_APPROVED,
        status: APPROVAL_STATUS.INITIALLY_APPROVED,
        updatedAt: serverTimestamp(),
        adminReviewed: true,
        adminId: auth.currentUser?.uid || 'admin',
        adminComment: 'Administration initially approved your request',
        initialAdminApprovalDate: serverTimestamp(),
        eligibleForAppointments: true
      };
      
      await updateDoc(donorRef, updateData);
      
      // Create approval history
      await addDoc(collection(db, 'approvalHistory'), {
        recordId: donorId,
        recordType: 'donor',
        previousStatus: previousStatus,
        newStatus: APPROVAL_STATUS.INITIALLY_APPROVED,
        changedBy: auth.currentUser?.uid || 'admin',
        timestamp: serverTimestamp(),
        reason: 'Initial admin approval granted',
        userRole: 'admin',
        action: 'initialApprove'
      });
      
      // Send notification to donor
      if (donorData.donorId) {
        await createApprovalNotification(donorData.donorId, APPROVAL_STATUS.INITIALLY_APPROVED);
      }
      
      toast.success('Donor initially approved successfully');
      await fetchDonors(activeTab);
      setActionInProgress(false);
      return true;
    } catch (error) {
      console.error('Error in initial approval:', error);
      toast.error('Failed to initially approve donor: ' + error.message);
      setActionInProgress(false);
      return false;
    }
  };

  const handleInitialRejection = async (donorId) => {
    try {
      setActionInProgress(true);
      
      const rejectionReason = prompt('Please provide a reason for initial rejection:');
      if (!rejectionReason || !rejectionReason.trim()) {
        toast.error('Rejection reason is required');
        setActionInProgress(false);
        return false;
      }
      
      const { createApprovalNotification } = await import('../../utils/approvalSystem');
      
      const donorRef = doc(db, 'medicalRecords', donorId);
      const donorSnap = await getDoc(donorRef);
      
      if (!donorSnap.exists()) {
        toast.error('Donor record not found');
        setActionInProgress(false);
        return false;
      }
      
      const donorData = donorSnap.data();
      const previousStatus = donorData.requestStatus || donorData.status;
      
      const updateData = {
        requestStatus: APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
        status: APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
        updatedAt: serverTimestamp(),
        adminReviewed: true,
        adminId: auth.currentUser?.uid || 'admin',
        adminComment: rejectionReason,
        rejectionReason: rejectionReason,
        initialAdminRejectionDate: serverTimestamp(),
        eligibleForAppointments: false
      };
      
      await updateDoc(donorRef, updateData);
      
      // Create approval history
      await addDoc(collection(db, 'approvalHistory'), {
        recordId: donorId,
        recordType: 'donor',
        previousStatus: previousStatus,
        newStatus: APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
        changedBy: auth.currentUser?.uid || 'admin',
        timestamp: serverTimestamp(),
        reason: rejectionReason,
        userRole: 'admin',
        action: 'initialReject'
      });
      
      // Send notification to donor
      if (donorData.donorId) {
        await createApprovalNotification(donorData.donorId, APPROVAL_STATUS.INITIAL_ADMIN_REJECTED);
      }
      
      toast.success('Donor initially rejected');
      await fetchDonors(activeTab);
      setActionInProgress(false);
      return true;
    } catch (error) {
      console.error('Error in initial rejection:', error);
      toast.error('Failed to initially reject donor: ' + error.message);
      setActionInProgress(false);
      return false;
    }
  };

  const viewDonorDetails = (donor) => {
    setSelectedDonor(donor);
    setAdminComment('');
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDonor(null);
    setAdminComment('');
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    
    if (typeof date === 'object' && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    } else if (date instanceof Date) {
      return date.toLocaleDateString();
    } else if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    
    return "N/A";
  };

  const getSafeValue = (donor, fieldPaths, defaultValue = "N/A") => {
    if (!donor) return defaultValue;
    
    if (Array.isArray(fieldPaths)) {
      for (const path of fieldPaths) {
        const value = getNestedValue(donor, path);
        if (value !== defaultValue) return value;
      }
      return defaultValue;
    }
    
    return getNestedValue(donor, fieldPaths, defaultValue);
  };
  
  const getNestedValue = (obj, path, defaultValue = "N/A") => {
    if (!obj) return defaultValue;
    
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value === undefined || value === null) return defaultValue;
      value = value[key];
    }
    
    if (value === undefined || value === null || value === "") return defaultValue;
    return value;
  };

  const getDonorName = (donor) => {
    const medicalFormName = getSafeValue(donor, 'donorName');
    if (medicalFormName !== "N/A") return medicalFormName;
    
    return getSafeValue(donor, ['userData.name', 'userData.fullName', 'userData.displayName']);
  };
  // Helper function to get donor email (keeping for future use)
  /*
  const getDonorEmail = (donor) => {
    const medicalFormEmail = getSafeValue(donor, 'email');
    if (medicalFormEmail !== "N/A") return medicalFormEmail;
    
    return getSafeValue(donor, ['userData.email', 'userData.userEmail']);
  };
  */

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Donor Management</h2>
      
      {/* Donor Tabs Component */}
      <DonorTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Loading state */}
      {loading ? (
        <div className="text-center p-4">
          <p className="text-gray-600">Loading donors...</p>
        </div>
      ) : (
        /* Donor Table Component */
        <DonorTable 
          donors={donors} 
          getStatusBadgeColor={getStatusBadgeColor} 
          getStatusDisplay={getStatusDisplay} 
          getSafeValue={getSafeValue}
          getDonorName={getDonorName}
          formatDate={formatDate}
          viewDonorDetails={viewDonorDetails}
          openConfirmationModal={openConfirmationModal}
        />
      )}
      
      {/* Donor Detail Modal Component */}
      {showDetailModal && (
        <DonorDetailModal 
          selectedDonor={selectedDonor} 
          closeDetailModal={closeDetailModal}
          adminComment={adminComment}
          setAdminComment={setAdminComment}
          openConfirmationModal={openConfirmationModal}
          actionInProgress={actionInProgress}
          updateDonorStatus={updateDonorStatus}
          getStatusBadgeColor={getStatusBadgeColor}
          getStatusDisplay={getStatusDisplay}
          getDonorName={getDonorName}
        />
      )}
      
      {/* Confirmation Modal Component */}
      <ConfirmationModal 
        confirmationModalOpen={confirmationModalOpen}
        selectedDonor={selectedDonor}
        confirmationAction={confirmationAction}
        closeConfirmationModal={closeConfirmationModal}
        handleConfirmation={handleConfirmation}
        actionInProgress={actionInProgress}
        getDonorName={getDonorName}
      />
      
      {/* Medical Document Review Section Component */}
      <MedicalDocumentReviewSection />
    </div>
  );
}

export default DonorManagement;