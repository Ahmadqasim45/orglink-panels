import React from 'react';

const AppointmentModalHeader = ({ currentPatient, patientName, currentPatientType }) => {
  return (
    <div className="AppointmentModal-header">
      <h2 className="text-2xl font-bold mb-2">
        {currentPatient 
          ? (currentPatient.status 
              ? `${currentPatient.isBeingViewed ? 'View' : 'Edit'} ${currentPatient.status === "completed" ? "Completed" : currentPatient.status === "cancelled" ? "Cancelled" : "Scheduled"} Appointment for ${patientName}`
              : `Schedule Appointment for ${patientName}`)
          : "Schedule New Appointment"}
        {currentPatientType && <span className="text-base font-normal ml-2 text-gray-500">({currentPatientType === "donor" ? "Donor" : "Recipient"})</span>}
      </h2>
      
      {/* View mode indicator at the top for better visibility */}
      {currentPatient && currentPatient.isBeingViewed && (
        <div className="mb-2 bg-purple-50 border border-purple-200 p-2 rounded-lg text-center">
          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Mode - Editing disabled
          </span>
        </div>
      )}
    </div>
  );
};

export default AppointmentModalHeader;
