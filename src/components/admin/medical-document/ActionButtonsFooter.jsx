import React from 'react';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const ActionButtonsFooter = ({ 
  document, 
  onClose, 
  setShowRejectModal, 
  handleApprove, 
  processing 
}) => {
  if (document.status !== 'pending_admin_review') {
    return (
      <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }
  
  return (
    <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
      <button
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Close
      </button>
      
      <div className="flex space-x-3">
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={processing[document.id]}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {processing[document.id] ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Rejecting...
            </>
          ) : (
            <>
              <FaExclamationTriangle className="mr-2" />
              Reject Donor
            </>
          )}
        </button>
        
        {document.medicalStatus === 'medically_fit' && (
          <button
            onClick={handleApprove}
            disabled={processing[document.id]}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {processing[document.id] ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Approving...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" />
                Approve Donor
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionButtonsFooter;
