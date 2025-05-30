import React from 'react';
import { APPROVAL_STATUS } from '../../../utils/approvalSystem';

/**
 * Modal component for viewing detailed donor information
 */
const DonorDetailModal = ({ 
  selectedDonor, 
  closeDetailModal, 
  adminComment, 
  setAdminComment, 
  openConfirmationModal, 
  actionInProgress,
  updateDonorStatus,
  getStatusBadgeColor,
  getStatusDisplay,
  getDonorName
}) => {
  if (!selectedDonor) return null;
  
  return (
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
                <span className="text-sm font-medium text-gray-700">Approval Progress</span>
                <span className="text-sm font-medium text-gray-700">
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
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
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
          {(selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || selectedDonor.status === APPROVAL_STATUS.DOCTOR_APPROVED) && (
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
  );
};

export default DonorDetailModal;
