import { db } from '../firebase';
import { query, collection, where, getDocs } from 'firebase/firestore';

// Define approval status constants
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  DOCTOR_APPROVED: 'doctor-approved',
  DOCTOR_REJECTED: 'doctor-rejected',  ADMIN_APPROVED: 'admin-approved',
  ADMIN_REJECTED: 'admin-rejected',
  NEEDS_INFO: 'needs-info',
  PENDING_DOCTOR_REVIEW: 'pending-doctor-review',
  APPEAL_PENDING: 'appeal-pending',
  INITIAL_DOCTOR_APPROVED: 'initial-doctor-approved',
  INITIAL_DOCTOR_REJECTED: 'initial-doctor-rejected',
  PENDING_INITIAL_ADMIN_APPROVAL: 'pending-initial-admin-approval',
  INITIAL_ADMIN_APPROVED: 'initial-admin-approved',
  INITIAL_ADMIN_REJECTED: 'initial-admin-rejected',
  INITIALLY_APPROVED: 'initially-approved',
  MEDICAL_EVALUATION_IN_PROGRESS: 'medical-evaluation-in-progress',
  MEDICAL_EVALUATION_COMPLETED: 'medical-evaluation-completed',  PENDING_FINAL_ADMIN_REVIEW: 'pending-final-admin-review',
  FINAL_ADMIN_APPROVED: 'final-admin-approved',
  FINAL_ADMIN_REJECTED: 'final-admin-rejected'
};

// Get color styling for a status
export const getStatusColor = (status) => {
  switch (status) {
    case APPROVAL_STATUS.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case APPROVAL_STATUS.DOCTOR_APPROVED:
      return 'bg-blue-100 text-blue-800';
    case APPROVAL_STATUS.DOCTOR_REJECTED:
      return 'bg-red-100 text-red-800';
    case APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED:
      return 'bg-blue-50 text-blue-800';
    case APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED:
      return 'bg-red-100 text-red-800';
    case APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL:
      return 'bg-orange-100 text-orange-800';
    case APPROVAL_STATUS.INITIAL_ADMIN_APPROVED:
      return 'bg-green-50 text-green-800';
    case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
      return 'bg-red-200 text-red-800';    case APPROVAL_STATUS.INITIALLY_APPROVED:
      return 'bg-green-100 text-green-800';    case APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS:
      return 'bg-purple-100 text-purple-800';
    case APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED:
      return 'bg-blue-100 text-blue-800';
    case APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW:
      return 'bg-orange-100 text-orange-800';    case APPROVAL_STATUS.FINAL_ADMIN_APPROVED:
      return 'bg-green-100 text-green-800';    case APPROVAL_STATUS.FINAL_ADMIN_REJECTED:
      return 'bg-red-100 text-red-800';
    case 'Final Admin Approved':
      return 'bg-green-100 text-green-800';
    case 'Final Admin Rejected':
      return 'bg-red-100 text-red-800';    case APPROVAL_STATUS.ADMIN_APPROVED:
      return 'bg-green-100 text-green-800';
    case APPROVAL_STATUS.ADMIN_REJECTED:
      return 'bg-red-200 text-red-800';
    case APPROVAL_STATUS.NEEDS_INFO:
      return 'bg-purple-100 text-purple-800';
    case APPROVAL_STATUS.PENDING_DOCTOR_REVIEW:
      return 'bg-blue-100 text-blue-800';
    case APPROVAL_STATUS.APPEAL_PENDING:
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get display text for a status
export const getStatusDisplay = (status) => {
  const statusDisplayMap = {
    [APPROVAL_STATUS.PENDING]: 'Pending Review',
    [APPROVAL_STATUS.DOCTOR_APPROVED]: 'Doctor Approved',
    [APPROVAL_STATUS.DOCTOR_REJECTED]: 'Doctor Rejected',
    [APPROVAL_STATUS.ADMIN_APPROVED]: 'Admin Approved',
    [APPROVAL_STATUS.ADMIN_REJECTED]: 'Admin Rejected',
    [APPROVAL_STATUS.NEEDS_INFO]: 'Additional Information Needed',
    [APPROVAL_STATUS.PENDING_DOCTOR_REVIEW]: 'Pending Doctor Review',
    [APPROVAL_STATUS.APPEAL_PENDING]: 'Appeal Pending',
    [APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED]: 'Doctor Initially Approved',
    [APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED]: 'Doctor Rejected',
    [APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL]: 'Pending Initial Admin Approval',
    [APPROVAL_STATUS.INITIAL_ADMIN_APPROVED]: 'Initial Admin Approved',
    [APPROVAL_STATUS.INITIAL_ADMIN_REJECTED]: 'Initial Admin Rejected',
    [APPROVAL_STATUS.INITIALLY_APPROVED]: 'Initially Approved',
    [APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS]: 'Medical Evaluation In Progress',
    [APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED]: 'Medical Evaluation Completed',
    [APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW]: 'Pending Final Admin Review',
    [APPROVAL_STATUS.FINAL_ADMIN_APPROVED]: 'Final Admin Approved',
    [APPROVAL_STATUS.FINAL_ADMIN_REJECTED]: 'Final Admin Rejected',
    'Final Admin Approved': 'Final Admin Approved',
    'Final Admin Rejected': 'Final Admin Rejected'
  };

  return statusDisplayMap[status] || 'Unknown Status';
};

// Get admin user IDs from firestore
export const getAdminIds = async () => {
  try {
    const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const adminSnapshot = await getDocs(adminQuery);
    return adminSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching admin IDs:', error);
    return [];
  }
};

// For backward compatibility
export const getStatusBadgeColor = getStatusColor;
export const getStatusColorClass = getStatusColor;
export const getStatusDisplayText = getStatusDisplay;

// Helper functions for approval flow
export const isDoctorActionDisabled = (status) => {
  return ![APPROVAL_STATUS.PENDING, APPROVAL_STATUS.ADMIN_REJECTED].includes(status);
};

export const isAdminActionRequired = (status) => {
  return [
    APPROVAL_STATUS.DOCTOR_APPROVED, 
    APPROVAL_STATUS.DOCTOR_REJECTED, 
    APPROVAL_STATUS.APPEAL_PENDING,
    APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED,
    APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL
  ].includes(status);
};

export const isFinalStatus = (status) => {
  return [
    APPROVAL_STATUS.INITIALLY_APPROVED,
    APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
    APPROVAL_STATUS.FINAL_ADMIN_APPROVED,
    APPROVAL_STATUS.FINAL_ADMIN_REJECTED,
    'Final Admin Approved',
    'Final Admin Rejected'
  ].includes(status);
};

export const getNextStatus = (currentStatus, action, userRole) => {
  const statusFlow = {
    doctor: {
      approve: {
        [APPROVAL_STATUS.PENDING]: APPROVAL_STATUS.DOCTOR_APPROVED,
        [APPROVAL_STATUS.ADMIN_REJECTED]: APPROVAL_STATUS.APPEAL_PENDING
      },
      initialApprove: {
        [APPROVAL_STATUS.PENDING]: APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED
      },
      reject: {
        [APPROVAL_STATUS.PENDING]: APPROVAL_STATUS.DOCTOR_REJECTED
      },
      initialReject: {
        [APPROVAL_STATUS.PENDING]: APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED
      },
      needsInfo: {
        [APPROVAL_STATUS.PENDING]: APPROVAL_STATUS.NEEDS_INFO
      }
    },    admin: {
      approve: {
        [APPROVAL_STATUS.DOCTOR_APPROVED]: APPROVAL_STATUS.ADMIN_APPROVED,
        [APPROVAL_STATUS.DOCTOR_REJECTED]: APPROVAL_STATUS.ADMIN_REJECTED,
        [APPROVAL_STATUS.APPEAL_PENDING]: APPROVAL_STATUS.ADMIN_APPROVED,
        [APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED]: APPROVAL_STATUS.INITIALLY_APPROVED,
        [APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL]: APPROVAL_STATUS.INITIALLY_APPROVED,
        [APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW]: APPROVAL_STATUS.FINAL_ADMIN_APPROVED,
        [APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED]: APPROVAL_STATUS.FINAL_ADMIN_APPROVED
      },
      initialApprove: {
        [APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED]: APPROVAL_STATUS.INITIALLY_APPROVED,
        [APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL]: APPROVAL_STATUS.INITIALLY_APPROVED
      },
      reject: {
        [APPROVAL_STATUS.DOCTOR_APPROVED]: APPROVAL_STATUS.ADMIN_REJECTED,
        [APPROVAL_STATUS.DOCTOR_REJECTED]: APPROVAL_STATUS.ADMIN_REJECTED,
        [APPROVAL_STATUS.APPEAL_PENDING]: APPROVAL_STATUS.ADMIN_REJECTED,
        [APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED]: APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
        [APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL]: APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
        [APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW]: APPROVAL_STATUS.FINAL_ADMIN_REJECTED,
        [APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED]: APPROVAL_STATUS.FINAL_ADMIN_REJECTED
      },
      initialReject: {
        [APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED]: APPROVAL_STATUS.INITIAL_ADMIN_REJECTED,
        [APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL]: APPROVAL_STATUS.INITIAL_ADMIN_REJECTED
      }
    },
    recipient: {
      submit: {
        [APPROVAL_STATUS.NEEDS_INFO]: APPROVAL_STATUS.PENDING_DOCTOR_REVIEW
      }
    }
  };

  return statusFlow[userRole]?.[action]?.[currentStatus] || currentStatus;
};

// Automatically transition INITIAL_DOCTOR_APPROVED to PENDING_INITIAL_ADMIN_APPROVAL
export const triggerAutomaticStatusTransition = async (recordId, currentStatus) => {
  if (currentStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED) {
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const recordRef = doc(db, 'medicalRecords', recordId);
      await updateDoc(recordRef, {
        requestStatus: APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL,
        status: APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL,
        updatedAt: serverTimestamp(),
        autoTransitioned: true,
        autoTransitionDate: serverTimestamp()
      });
      
      return APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL;
    } catch (error) {
      console.error('Error in automatic status transition:', error);
      return currentStatus;
    }
  }
  return currentStatus;
};

// Check if user can schedule appointments based on approval status
export const canScheduleAppointments = (approvalStatus, userRole) => {
  if (userRole === 'doctor') {
    return true; // Doctors can always schedule appointments
  }
    if (userRole === 'donor') {
    return approvalStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
           approvalStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED ||
           approvalStatus === 'Final Admin Approved';
  }
  
  return false;
};

// Create notification based on status change
export const createApprovalNotification = async (userId, newStatus) => {
  try {
    const { createNotification } = await import('./NotificationSystem');
    
    let title = '';
    let message = '';
      switch (newStatus) {
      case APPROVAL_STATUS.INITIALLY_APPROVED:
        title = 'Initial Admin Approval';
        message = 'You are initially approved by administration. Appointment scheduled by hospital soon stay tuned.';
        break;
      case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
        title = 'Application Rejected';
        message = 'You are not eligible for donation initially - administration reject you.';
        break;
      case APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL:
        title = 'Pending Admin Review';
        message = 'Your application is now pending initial administration approval.';
        break;      case APPROVAL_STATUS.FINAL_ADMIN_APPROVED:
      case 'Final Admin Approved':
        title = 'Final Admin Approval';
        message = 'Congratulations! You have been finally approved by the administration after medical evaluation.';
        break;
      case APPROVAL_STATUS.FINAL_ADMIN_REJECTED:
      case 'Final Admin Rejected':
        title = 'Final Admin Rejection';
        message = 'Your application has been finally rejected by the administration after medical evaluation.';
        break;
      default:
        return; // No notification needed for other statuses
    }
    
    await createNotification(userId, title, message, 'approval_update');
  } catch (error) {
    console.error('Error creating approval notification:', error);
  }
};