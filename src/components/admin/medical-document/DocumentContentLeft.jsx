import React from 'react';
import DonorInfoSection from './DonorInfoSection';
import DoctorAssessmentSection from './DoctorAssessmentSection';
import StatusSection from './StatusSection';

const DocumentContentLeft = ({ document, formatDate, getStatusColor }) => {
  return (
    <div className="space-y-6">
      {/* Donor Information */}
      <DonorInfoSection document={document} formatDate={formatDate} />
      
      {/* Doctor Information */}
      <DoctorAssessmentSection document={document} formatDate={formatDate} />
      
      {/* Current Status */}
      <StatusSection 
        document={document} 
        formatDate={formatDate} 
        getStatusColor={getStatusColor} 
      />
    </div>
  );
};

export default DocumentContentLeft;
