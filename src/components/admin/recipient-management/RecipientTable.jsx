import React from 'react';
import StatusBadge from './StatusBadge';
import { getRecipientName, getOrganType, getSafeValue } from './RecipientUtils';

const RecipientTable = ({ 
  recipients, 
  activeTab, 
  viewRecipientDetails, 
  handleAdminDecision, 
  actionInProgress 
}) => {
  if (recipients[activeTab].length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <p className="text-gray-500">No recipients found in this category</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left">Recipient Name</th>
            <th className="py-3 px-6 text-left">Blood Group</th>
            <th className="py-3 px-6 text-left">Age</th>
            <th className="py-3 px-6 text-left">Organ Type</th>
            <th className="py-3 px-6 text-left">Status</th>
            <th className="py-3 px-6 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-600 text-sm">
          {recipients[activeTab].map((recipient) => (
            <tr key={recipient.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="py-3 px-6 text-left">
                <div className="font-medium">{getRecipientName(recipient)}</div>
              </td>
              <td className="py-3 px-6 text-left">{getSafeValue(recipient, "bloodType")}</td>
              <td className="py-3 px-6 text-left">{getSafeValue(recipient, "age")}</td>
              <td className="py-3 px-6 text-left">{getOrganType(recipient)}</td>
              <td className="py-3 px-6 text-left">
                <StatusBadge status={recipient.requestStatus} />
              </td>
              <td className="py-3 px-6 text-center">
                <div className="flex item-center justify-center space-x-2">
                  <button
                    onClick={() => viewRecipientDetails(recipient)}
                    className="bg-teal-500 text-white px-3 py-1 rounded hover:bg-teal-600 disabled:bg-gray-300"
                    disabled={actionInProgress}
                    type="button"
                  >
                    View Details
                  </button>

                  {recipient.doctorReviewed && !recipient.adminReviewed && (
                    <button
                      onClick={() => {
                        if (window.confirm(
                          `Are you sure you want to confirm the doctor's ${
                            recipient.requestStatus === "doctor-approved" ? "approval" : "rejection"
                          }?`
                        )) {
                          handleAdminDecision(recipient.id, true);
                        }
                      }}
                      className={`text-white px-3 py-1 rounded hover:opacity-90 disabled:bg-gray-300 ${
                        recipient.requestStatus === "doctor-approved" ? "bg-green-500" : "bg-red-500"
                      }`}
                      disabled={actionInProgress}
                      type="button"
                    >
                      Confirm {recipient.requestStatus === "doctor-approved" ? "Approval" : "Rejection"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecipientTable;
