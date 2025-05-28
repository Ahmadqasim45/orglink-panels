import { db } from '../../firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { APPROVAL_STATUS } from '../approvalsystem';

export const handleDoctorDecision = async ({ 
  formId, 
  decision, 
  doctorId, 
  hospitalName, 
  additionalInfo = '' 
}) => {
  const formRef = doc(db, "medicalForms", formId);
  let status;
  
  switch(decision) {
    case 'approve':
      status = APPROVAL_STATUS.DOCTOR_APPROVED;
      break;
    case 'reject':
      status = APPROVAL_STATUS.DOCTOR_REJECTED;
      break;
    case 'needsInfo':
      status = APPROVAL_STATUS.NEEDS_INFO;
      break;
    default:
      throw new Error('Invalid decision type');
  }

  // Update form status
  await updateDoc(formRef, {
    status,
    doctorStatus: decision,
    doctorId,
    hospitalName,
    additionalInfoRequired: decision === 'needsInfo' ? additionalInfo : '',
    updatedAt: serverTimestamp(),
    updatedBy: doctorId,
    updatedByRole: 'doctor'
  });

  // Add to history
  await addDoc(collection(db, "approvalHistory"), {
    formId,
    status,
    timestamp: serverTimestamp(),
    userId: doctorId,
    userRole: 'doctor',
    hospitalName,
    comment: additionalInfo || `${decision} by doctor`,
    isInfoRequest: decision === 'needsInfo'
  });
};

export const handleAdminDecision = async ({
  formId,
  decision,
  adminId,
  doctorDecision,
  override = false,
  justification = ''
}) => {
  const formRef = doc(db, "medicalForms", formId);
  let status;

  if (override) {
    status = APPROVAL_STATUS.ADMIN_OVERRIDE;
  } else {
    status = decision === 'approve' ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
  }

  // Update form status
  await updateDoc(formRef, {
    status,
    adminStatus: decision,
    adminDecision: status,
    override,
    overrideJustification: override ? justification : '',
    finalizedAt: !override ? serverTimestamp() : null,
    finalizedBy: !override ? adminId : null,
    finalizedByRole: !override ? 'admin' : null,
    finalDecision: !override,
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
    updatedByRole: 'admin'
  });

  // Add to history
  await addDoc(collection(db, "approvalHistory"), {
    formId,
    previousStatus: doctorDecision,
    newStatus: status,
    timestamp: serverTimestamp(),
    userId: adminId,
    userRole: 'admin',
    isOverride: override,
    justification: override ? justification : '',
    comment: override 
      ? 'Returned to doctor for review' 
      : `Final ${decision} by admin`
  });
};

export const handleInfoSubmission = async (formId, userId, newInfo) => {
  const formRef = doc(db, "medicalForms", formId);

  await updateDoc(formRef, {
    status: APPROVAL_STATUS.PENDING_DOCTOR_REVIEW,
    additionalInfo: newInfo,
    additionalInfoRequired: '',
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    updatedByRole: 'recipient'
  });

  await addDoc(collection(db, "approvalHistory"), {
    formId,
    status: APPROVAL_STATUS.PENDING_DOCTOR_REVIEW,
    timestamp: serverTimestamp(),
    userId,
    userRole: 'recipient',
    comment: 'Additional information provided',
    additionalInfo: newInfo
  });
};