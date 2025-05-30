import React from 'react';

const StatusSection = ({ document, formatDate, getStatusColor }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-gray-800 mb-3">Current Status</h3>
      <div className="space-y-2">
        <div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status)}`}>
            {document.status === 'pending_admin_review' ? 'Pending Admin Review' :
             document.status === 'approved' ? 'Approved' :
             document.status === 'rejected' ? 'Rejected' : document.status}
          </span>
        </div>
        {document.adminActionDate && (
          <div>
            <span className="text-sm text-gray-500">Action Date:</span>
            <p className="font-medium text-gray-900">{formatDate(document.adminActionDate)}</p>
          </div>
        )}
        {document.rejectionReason && (
          <div>
            <span className="text-sm text-gray-500">Rejection Reason:</span>
            <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-red-800">
              {document.rejectionReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusSection;
