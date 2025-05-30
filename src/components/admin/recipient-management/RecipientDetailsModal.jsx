import React from 'react';
import PersonalInfoSection from './PersonalInfoSection';
import OrganRequestSection from './OrganRequestSection';
import MedicalInfoSection from './MedicalInfoSection';
import TransplantCenterSection from './TransplantCenterSection';
import ApprovalStatusSection from './ApprovalStatusSection';
import ActionButtons from './ActionButtons';

const RecipientDetailsModal = ({ 
  recipient, 
  closeDetailModal, 
  handleAdminDecision, 
  actionInProgress 
}) => {
  if (!recipient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recipient Details</h2>
          <button
            onClick={closeDetailModal}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
            type="button"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <PersonalInfoSection recipient={recipient} />
        <OrganRequestSection recipient={recipient} />
        <MedicalInfoSection recipient={recipient} />
        <TransplantCenterSection recipient={recipient} />
        <ApprovalStatusSection recipient={recipient} />

        {recipient.additionalNotes && (
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Additional Notes</h3>
            <p>{recipient.additionalNotes}</p>
          </section>
        )}

        <ActionButtons 
          recipient={recipient} 
          handleAdminDecision={handleAdminDecision} 
          closeDetailModal={closeDetailModal}
          actionInProgress={actionInProgress}
        />
      </div>
    </div>
  );
};

export default RecipientDetailsModal;
