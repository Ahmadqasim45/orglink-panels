import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, getDoc, serverTimestamp, addDoc, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { 
  APPROVAL_STATUS, 
  getStatusColor,
  getStatusDisplay,
  getStatusBadgeColor 
} from '../../utils/approvalSystem';
import MedicalDocumentReview from './MedicalDocumentReview';

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
      
      let donorsData = [];
      let queryFilters = [];
        if (status === 'pending') {
        queryFilters = [
          APPROVAL_STATUS.PENDING,
          APPROVAL_STATUS.DOCTOR_APPROVED,
          APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED,
          APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL,
          "pending",
          "doctor-approved",
          "initial-doctor-approved",
          "pending-initial-admin-approval"
        ];
      } else if (status === 'approved') {
        queryFilters = [
          APPROVAL_STATUS.ADMIN_APPROVED,
          APPROVAL_STATUS.FINAL_APPROVED,
          APPROVAL_STATUS.INITIALLY_APPROVED,
          "admin-approved",
          "approved",
          "initially-approved"
        ];
      } else if (status === 'rejected') {
        queryFilters = [
          APPROVAL_STATUS.DOCTOR_REJECTED,
          APPROVAL_STATUS.ADMIN_REJECTED,
          APPROVAL_STATUS.FINAL_REJECTED,
          APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED,
          APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
          "doctor-rejected",
          "admin-rejected",
          "rejected",
          "initial-doctor-rejected",
          "initial-admin-rejected"
        ];
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

  const getDonorEmail = (donor) => {
    const medicalFormEmail = getSafeValue(donor, 'email');
    if (medicalFormEmail !== "N/A") return medicalFormEmail;
    
    return getSafeValue(donor, ['userData.email', 'userData.userEmail']);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Donor Management</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
      
      <div className="mb-6 border-b">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 ${
                activeTab === 'pending'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Requests
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 ${
                activeTab === 'approved'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('approved')}
            >
              Approved
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 ${
                activeTab === 'rejected'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected
            </button>
          </li>
        </ul>
      </div>
      
      {loading ? (
        <div className="text-center py-4">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Donor Name</th>
                <th className="py-3 px-6 text-left">Blood Group</th>
                <th className="py-3 px-6 text-left">Age</th>
                <th className="py-3 px-6 text-left">Donation Type</th>
                <th className="py-3 px-6 text-left">Status</th>
                <th className="py-3 px-6 text-left">Submitted</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {donors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 px-6 text-center">
                    No donors found in this category
                  </td>
                </tr>
              ) : (
                donors.map((donor) => (
                  <tr key={donor.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left">
                      <div className="font-medium">{getDonorName(donor)}</div>
                    </td>
                    <td className="py-3 px-6 text-left">{getSafeValue(donor, ['bloodType', 'bloodGroup'])}</td>
                    <td className="py-3 px-6 text-left">{getSafeValue(donor, 'age')}</td>
                    <td className="py-3 px-6 text-left">{getSafeValue(donor, ['donorType', 'organType'])}</td>
                    <td className="py-3 px-6 text-left">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(donor.requestStatus || donor.status)}`}>
                        {getStatusDisplay(donor.requestStatus || donor.status)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-left">{formatDate(donor.submittedAt)}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center space-x-2">
                        <button
                          onClick={() => viewDonorDetails(donor)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                          View Details
                        </button>
                          {/* Initial Admin Approval Buttons */}
                        {(donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED || 
                          donor.requestStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL ||
                          donor.status === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ||
                          donor.status === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL) && (
                          <>
                            <button
                              onClick={() => openConfirmationModal('initialApprove', donor)}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            >
                              Initially Approve
                            </button>
                            <button
                              onClick={() => openConfirmationModal('initialReject', donor)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            >
                              Initially Reject
                            </button>
                          </>
                        )}

                        {/* Final Admin Approval Buttons */}
                        {(donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || donor.status === APPROVAL_STATUS.DOCTOR_APPROVED) && (
                          <button
                            onClick={() => openConfirmationModal('confirmApproval', donor)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                          >
                            Confirm Approval
                          </button>
                        )}
                        
                        {(donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || donor.status === APPROVAL_STATUS.DOCTOR_APPROVED) && (
                          <button
                            onClick={() => openConfirmationModal('overrideApproval', donor)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          >
                            Override Approval
                          </button>
                        )}
                        
                        {(donor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED || donor.status === APPROVAL_STATUS.DOCTOR_REJECTED) && (
                          <button
                            onClick={() => openConfirmationModal('confirmRejection', donor)}
                            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                          >
                            Confirm Rejection
                          </button>
                        )}
                        
                        {(donor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED || donor.status === APPROVAL_STATUS.DOCTOR_REJECTED) && (
                          <button
                            onClick={() => openConfirmationModal('overrideRejection', donor)}
                            className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                          >
                            Override Rejection
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {showDetailModal && selectedDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Donor Medical Information</h3>
              <button
                onClick={closeDetailModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Approval Status</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-sm font-medium mr-2">Status:</span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeColor(selectedDonor.requestStatus || selectedDonor.status)}`}>
                    {getStatusDisplay(selectedDonor.requestStatus || selectedDonor.status)}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Approval Progress</span>                    <span className="text-sm font-medium text-gray-700">
                      {selectedDonor.requestStatus === APPROVAL_STATUS.PENDING ? "0%" :
                       selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "25%" :
                       selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL ? "35%" :
                       selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ? "50%" :
                       selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "75%" :
                       selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || selectedDonor.status === APPROVAL_STATUS.ADMIN_APPROVED ? "100%" :
                       selectedDonor.requestStatus === APPROVAL_STATUS.REJECTED || 
                       selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_ADMIN_REJECTED ||
                       selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ? "0%" : "0%"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                         style={{ width: 
                          selectedDonor.requestStatus === APPROVAL_STATUS.PENDING ? "5%" :
                          selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "25%" :
                          selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL ? "35%" :
                          selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ? "50%" :
                          selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "75%" :
                          selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || selectedDonor.status === APPROVAL_STATUS.ADMIN_APPROVED ? "100%" :
                          "0%" 
                        }}></div>
                  </div>
                </div>
                
                {selectedDonor.doctorComment && (
                  <div className="mt-2 bg-white p-3 rounded-md border border-blue-200">
                    <p className="font-medium text-blue-800">Medical Team Notes:</p>
                    <p className="italic">{selectedDonor.doctorComment}</p>
                  </div>
                )}
                
                {selectedDonor.adminComment && (
                  <div className="mt-2 bg-white p-3 rounded-md border border-green-200">
                    <p className="font-medium text-green-800">Admin Notes:</p>
                    <p className="italic">{selectedDonor.adminComment}</p>
                  </div>
                )}
                
                {(selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || selectedDonor.status === APPROVAL_STATUS.DOCTOR_APPROVED) && (
                  <div className="mt-4">
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800 font-medium">Doctor has approved this donor</p>
                      <p className="text-sm text-yellow-700 mt-1">You can confirm this approval or override it with a rejection.</p>
                    </div>
                    
                    <div className="flex space-x-2 mb-4">
                      <button
                        onClick={() => openConfirmationModal('confirmApproval', selectedDonor)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex-1"
                        disabled={actionInProgress}
                      >
                        Confirm Approval
                      </button>
                      <button
                        onClick={() => openConfirmationModal('overrideApproval', selectedDonor)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex-1"
                        disabled={actionInProgress}
                      >
                        Override with Rejection
                      </button>
                    </div>
                    
                    <label htmlFor="adminComment" className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Comment (required for manual approval):
                    </label>
                    <textarea
                      id="adminComment"
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Enter comments or instructions for the donor..."
                    ></textarea>
                  </div>
                )}
                
                {(selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED || selectedDonor.status === APPROVAL_STATUS.DOCTOR_REJECTED) && (
                  <div className="mt-4">
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 font-medium">Doctor has rejected this donor</p>
                      <p className="text-sm text-red-700 mt-1">You can confirm this rejection or override it with an approval.</p>
                    </div>
                    
                    <div className="flex space-x-2 mb-4">
                      <button
                        onClick={() => openConfirmationModal('confirmRejection', selectedDonor)}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1"
                        disabled={actionInProgress}
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => openConfirmationModal('overrideRejection', selectedDonor)}
                        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 flex-1"
                        disabled={actionInProgress}
                      >
                        Override with Approval
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
            
            <div className="mt-6 flex justify-end space-x-2">
              {(selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || selectedDonor.status === APPROVAL_STATUS.DOCTOR_APPROVED) && !confirmationModalOpen && (
                <>
                  <button
                    onClick={async () => {
                      const success = await updateDonorStatus(
                        selectedDonor.id, 
                        APPROVAL_STATUS.ADMIN_APPROVED
                      );
                      if (success) {
                        closeDetailModal();
                      }
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    disabled={!adminComment.trim() || actionInProgress}
                  >
                    Manual Approve
                  </button>
                  <button
                    onClick={async () => {
                      const success = await updateDonorStatus(
                        selectedDonor.id, 
                        APPROVAL_STATUS.ADMIN_REJECTED
                      );
                      if (success) {
                        closeDetailModal();
                      }
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    disabled={actionInProgress}
                  >
                    Manual Reject
                  </button>
                </>
              )}
              <button
                onClick={closeDetailModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                disabled={actionInProgress}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {confirmationModalOpen && selectedDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Action</h3>
            
            {confirmationAction === 'confirmApproval' && (
              <p className="mb-6">
                Are you sure you want to confirm the doctor's approval for {getDonorName(selectedDonor)}?
              </p>
            )}
            
            {confirmationAction === 'confirmRejection' && (
              <p className="mb-6">
                Are you sure you want to confirm the doctor's rejection for {getDonorName(selectedDonor)}?
              </p>
            )}
            
            {confirmationAction === 'overrideApproval' && (
              <p className="mb-6">
                Are you sure you want to override the doctor's approval and reject {getDonorName(selectedDonor)}?
                You will be asked to provide a reason for this override.
              </p>
            )}
            
            {confirmationAction === 'overrideRejection' && (
              <p className="mb-6">
                Are you sure you want to override the doctor's rejection and approve {getDonorName(selectedDonor)}?
                You will be asked to provide a reason for this override.
              </p>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirmationModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmation}
                className={`px-4 py-2 text-white rounded ${
                  confirmationAction === 'confirmApproval' || confirmationAction === 'overrideRejection'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                disabled={actionInProgress}
              >
                {actionInProgress ? 'Processing...' : 'Confirm'}
              </button>
            </div>          </div>
        </div>
      )}
      
      {/* Medical Document Review Section */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Medical Document Review</h2>
          <p className="text-gray-600">Review and approve medical documents submitted by doctors</p>
        </div>
        <MedicalDocumentReview />
      </div>
    </div>
  );
}

export default DonorManagement;