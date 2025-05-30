import React from 'react';
import { FaUser, FaHeart, FaCalendar } from 'react-icons/fa';

const DonorInfoSection = ({ document, formatDate }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
        <FaUser className="mr-2 text-blue-600" />
        Donor Information
      </h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm text-gray-500">Name:</span>
          <p className="font-medium text-gray-900">{document.donorName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Organ to Donate:</span>
          <p className="font-medium text-gray-900 flex items-center">
            <FaHeart className="mr-1 text-red-500" />
            {document.organToDonate}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Appointment Date:</span>
          <p className="font-medium text-gray-900 flex items-center">
            <FaCalendar className="mr-1 text-blue-500" />
            {formatDate(document.appointmentDate)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DonorInfoSection;
