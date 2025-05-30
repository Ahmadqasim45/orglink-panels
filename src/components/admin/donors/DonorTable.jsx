import React from 'react';
import { APPROVAL_STATUS } from '../../../utils/approvalSystem';

/**
 * Component for displaying the donor list in a table
 */
const DonorTable = ({ 
  donors, 
  getStatusBadgeColor, 
  getStatusDisplay, 
  getSafeValue,
  getDonorName,
  formatDate,
  viewDonorDetails,
  openConfirmationModal 
}) => {
  return (
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
  );
};

export default DonorTable;
