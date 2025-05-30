import React from 'react';

const DecisionGuideSection = ({ document }) => {
  if (document.status !== 'pending_admin_review') {
    return null;
  }
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-semibold text-blue-800 mb-2">Admin Decision Guide</h4>
      <div className="text-sm text-blue-700 space-y-1">
        <p><strong>Medical Status:</strong> {document.medicalStatus === 'medically_fit' ? 'Fit' : 'Unfit'}</p>
        <p><strong>Has Document:</strong> {document.hasAttachment ? 'Yes' : 'No'}</p>
        <p><strong>Doctor's Notes:</strong> {document.notes ? 'Provided' : 'None'}</p>
      </div>
      
      {document.medicalStatus === 'medically_fit' ? (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          ✓ Doctor marked as medically fit - Consider for approval
        </div>
      ) : (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          ✗ Doctor marked as medically unfit - Consider for rejection
        </div>
      )}
    </div>
  );
};

export default DecisionGuideSection;
