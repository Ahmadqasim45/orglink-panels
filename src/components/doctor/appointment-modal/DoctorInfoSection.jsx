import React from 'react';
import { auth } from '../../../firebase';

const DoctorInfoSection = ({ loadingDoctorInfo, doctorInfo }) => {
  return (
    <div className="mb-4 bg-green-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Appointment Provider</h3>
      
      <p className="flex items-start mb-2">
        <span className="font-medium min-w-[80px]">Doctor:</span>
        <span className="doctor-name ml-2">
          {loadingDoctorInfo 
            ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading doctor information...
              </span>
            ) 
            : (
              <span className="font-medium text-green-800">
                {doctorInfo.doctorName && doctorInfo.doctorName !== "Dr. " 
                  ? doctorInfo.doctorName 
                  : auth.currentUser?.displayName 
                    ? `Dr. ${auth.currentUser.displayName}` 
                    : auth.currentUser?.email 
                      ? `Dr. (${auth.currentUser.email})` 
                      : "No doctor name available"
                }
              </span>
            )
          }
        </span>
      </p>
      
      <p className="flex items-start">
        <span className="font-medium min-w-[80px]">Hospital:</span> 
        <span className="hospital-name ml-2">
          {loadingDoctorInfo 
            ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading hospital information...
              </span>
            )
            : doctorInfo.hospitalName ? (
              <span className="font-medium text-green-800">{doctorInfo.hospitalName}</span>
            ) : (
              <span className="text-red-600">No hospital name available</span>
            )
          }
        </span>
      </p>
    </div>
  );
};

export default DoctorInfoSection;
