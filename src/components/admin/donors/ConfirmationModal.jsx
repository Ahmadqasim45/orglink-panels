import React from 'react';

/**
 * Modal component for confirming donor-related actions
 */
const ConfirmationModal = ({
  confirmationModalOpen,
  selectedDonor,
  confirmationAction,
  closeConfirmationModal,
  handleConfirmation,
  actionInProgress,
  getDonorName
}) => {
  if (!confirmationModalOpen || !selectedDonor) return null;
  
  return (
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
        
        {confirmationAction === 'initialApprove' && (
          <p className="mb-6">
            Are you sure you want to initially approve {getDonorName(selectedDonor)}? 
            This will allow them to schedule appointments.
          </p>
        )}
        
        {confirmationAction === 'initialReject' && (
          <p className="mb-6">
            Are you sure you want to initially reject {getDonorName(selectedDonor)}? 
            You will be asked to provide a reason for this rejection.
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
              confirmationAction === 'confirmApproval' || confirmationAction === 'overrideRejection' || confirmationAction === 'initialApprove'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            disabled={actionInProgress}
          >
            {actionInProgress ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
