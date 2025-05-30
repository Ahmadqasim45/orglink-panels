import React from 'react';
import { FaStethoscope, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const DoctorAssessmentSection = ({ document, formatDate }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
        <FaStethoscope className="mr-2 text-green-600" />
        Doctor's Assessment
      </h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm text-gray-500">Doctor Name:</span>
          <p className="font-medium text-gray-900">{document.doctorName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Medical Status:</span>
          <div className="mt-1">
            {document.medicalStatus === 'medically_fit' ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <FaCheck className="inline mr-1" />
                Medically Fit
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <FaExclamationTriangle className="inline mr-1" />
                Medically Unfit
              </span>
            )}
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-500">Medical Notes:</span>
          <p className="mt-1 p-3 bg-white border rounded text-gray-900">
            {document.notes || 'No notes provided'}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Submitted On:</span>
          <p className="font-medium text-gray-900">{formatDate(document.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};

export default DoctorAssessmentSection;
