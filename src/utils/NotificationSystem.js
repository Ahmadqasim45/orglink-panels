import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { APPROVAL_STATUS } from './approvalSystem';

// Create notification
export const createNotification = async (userId, title, message, type = 'status_update') => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get user notifications
export const getUserNotifications = async (userId, limit = 20) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Generate notification message based on status
export const generateStatusNotification = (status, userRole = 'recipient') => {
  const notifications = {
    recipient: {
      // Initial Process
      [APPROVAL_STATUS.PENDING]: {
        title: 'Request Submitted',
        message: 'Your request has been submitted and is pending review.'
      },
      [APPROVAL_STATUS.UNDER_DOCTOR_REVIEW]: {
        title: 'Under Doctor Review',
        message: 'A doctor has started reviewing your request.'
      },

      // Doctor Initial Review
      [APPROVAL_STATUS.DOCTOR_APPROVED]: {
        title: 'Initial Approval by Doctor',
        message: 'Your request has been initially approved by the doctor and is now awaiting admin review.'
      },
      [APPROVAL_STATUS.DOCTOR_REJECTED]: {
        title: 'Initial Rejection by Doctor',
        message: 'Your request has been initially rejected by the doctor. The admin will review this decision.'
      },

      // Admin Review
      [APPROVAL_STATUS.ADMIN_CONFIRMED_APPROVAL]: {
        title: 'Admin Confirmed Approval',
        message: 'The admin has confirmed the doctor\'s approval. Awaiting final doctor confirmation.'
      },
      [APPROVAL_STATUS.ADMIN_REJECTED_DOCTOR_APPROVAL]: {
        title: 'Admin Rejected Approval',
        message: 'The admin has rejected the doctor\'s approval. The doctor will review this decision.'
      },
      [APPROVAL_STATUS.ADMIN_CONFIRMED_REJECTION]: {
        title: 'Admin Confirmed Rejection',
        message: 'The admin has confirmed the doctor\'s rejection. The doctor may appeal this decision.'
      },
      [APPROVAL_STATUS.ADMIN_OVERRIDE_REJECTION]: {
        title: 'Admin Overrode Rejection',
        message: 'The admin has overridden the doctor\'s rejection. Awaiting final doctor decision.'
      },

      // Final Doctor Decision
      [APPROVAL_STATUS.FINAL_APPROVED]: {
        title: 'Request Finally Approved',
        message: 'Congratulations! Your request has been finally approved by the doctor.'
      },
      [APPROVAL_STATUS.FINAL_REJECTED]: {
        title: 'Request Finally Rejected',
        message: 'Your request has been finally rejected by the doctor.'
      },

      // Appeal Process
      [APPROVAL_STATUS.DOCTOR_APPEAL]: {
        title: 'Doctor Submitted Appeal',
        message: 'The doctor has submitted an appeal for your case. Awaiting admin\'s final decision.'
      },
      [APPROVAL_STATUS.FINAL_APPEAL_APPROVED]: {
        title: 'Appeal Approved',
        message: 'The appeal for your case has been approved. This is the final decision.'
      },
      [APPROVAL_STATUS.FINAL_APPEAL_REJECTED]: {
        title: 'Appeal Rejected',
        message: 'The appeal for your case has been rejected. This is the final decision.'
      }
    },

    doctor: {
      // Admin Review Results
      [APPROVAL_STATUS.ADMIN_CONFIRMED_APPROVAL]: {
        title: 'Admin Confirmed Your Approval',
        message: 'The admin has confirmed your approval. Please make the final approval.'
      },
      [APPROVAL_STATUS.ADMIN_REJECTED_DOCTOR_APPROVAL]: {
        title: 'Admin Rejected Your Approval',
        message: 'The admin has rejected your approval. Please review the case again.'
      },
      [APPROVAL_STATUS.ADMIN_CONFIRMED_REJECTION]: {
        title: 'Admin Confirmed Your Rejection',
        message: 'The admin has confirmed your rejection. You may appeal this decision once.'
      },
      [APPROVAL_STATUS.ADMIN_OVERRIDE_REJECTION]: {
        title: 'Admin Overrode Your Rejection',
        message: 'The admin has overridden your rejection. Please review the case for final decision.'
      },

      // Appeal Results
      [APPROVAL_STATUS.FINAL_APPEAL_APPROVED]: {
        title: 'Appeal Approved',
        message: 'Your appeal has been approved by the admin. This is the final decision.'
      },
      [APPROVAL_STATUS.FINAL_APPEAL_REJECTED]: {
        title: 'Appeal Rejected',
        message: 'Your appeal has been rejected by the admin. This is the final decision.'
      }
    },

    admin: {
      // Cases Needing Review
      [APPROVAL_STATUS.DOCTOR_APPROVED]: {
        title: 'New Approval for Review',
        message: 'A doctor has approved a request that needs your review.'
      },
      [APPROVAL_STATUS.DOCTOR_REJECTED]: {
        title: 'New Rejection for Review',
        message: 'A doctor has rejected a request that needs your review.'
      },
      [APPROVAL_STATUS.DOCTOR_APPEAL]: {
        title: 'New Appeal for Review',
        message: 'A doctor has submitted an appeal that needs your final review.'
      }
    }
  };

  return notifications[userRole]?.[status] || {
    title: 'Status Update',
    message: 'Your request status has been updated.'
  };
};

// Send status update notification
export const sendStatusUpdateNotification = async (userId, status, userRole) => {
  const notification = generateStatusNotification(status, userRole);
  await createNotification(userId, notification.title, notification.message);
}; 