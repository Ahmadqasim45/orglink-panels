import React from 'react';
import { FaTimes } from 'react-icons/fa';

const RejectionModal = ({ 
  showRejectModal, 
  rejectionReason, 
  setRejectionReason, 
  setShowRejectModal, 
  handleRejectWithReason 
}) => {
  if (!showRejectModal) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Rejection</h3>
          <p className="text-gray-600 mb-4">Please provide a reason for rejecting this donor:</p>
          
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            rows="4"
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectWithReason}
              disabled={!rejectionReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
