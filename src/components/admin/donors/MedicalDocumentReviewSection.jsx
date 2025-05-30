import React from 'react';
import MedicalDocumentReview from '../MedicalDocumentReview';

/**
 * Component for displaying the medical document review section
 */
const MedicalDocumentReviewSection = () => {
  return (
    <div className="mt-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Medical Document Review</h2>
        <p className="text-gray-600">Review and approve medical documents submitted by doctors</p>
      </div>
      <MedicalDocumentReview />
    </div>
  );
};

export default MedicalDocumentReviewSection;
