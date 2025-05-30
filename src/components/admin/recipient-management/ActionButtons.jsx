import React from 'react';

const ActionButtons = ({ recipient, handleAdminDecision, closeDetailModal, actionInProgress }) => {
  return (
    <div className="mt-6 flex justify-end space-x-2">
      {recipient.doctorReviewed && !recipient.adminReviewed && (
        <>
          <button
            onClick={() => {
              const comment = window.prompt("Add a comment (optional):");
              handleAdminDecision(recipient.id, true, comment);
            }}
            className={`px-4 py-2 text-white rounded hover:opacity-90 disabled:bg-gray-300 ${
              recipient.requestStatus === "doctor-approved" ? "bg-green-500" : "bg-red-500"
            }`}
            disabled={actionInProgress}
            type="button"
          >
            Confirm {recipient.requestStatus === "doctor-approved" ? "Approval" : "Rejection"}
          </button>
          
          <button
            onClick={() => {
              const reason = window.prompt("Please provide reason for overriding doctor's decision:");
              if (reason) {
                handleAdminDecision(recipient.id, false, reason);
              }
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300"
            disabled={actionInProgress}
            type="button"
          >
            Override Doctor's Decision
          </button>
        </>
      )}
      
      <button
        onClick={closeDetailModal}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        type="button"
      >
        Close
      </button>
    </div>
  );
};

export default ActionButtons;
