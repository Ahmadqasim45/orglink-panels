import React from 'react';
import { sanitizeObject } from './utils';

const ModalFooter = ({ 
  currentPatient, 
  forceCloseModal, 
  onSubmit, 
  actionInProgress,
  scheduleData,
  selectedPatientId,
  purpose,
  patientType,
  currentPatientType
}) => {
  return (
    <div className="AppointmentModal-footer">
      <div className="flex justify-end space-x-2">
        <button
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
          onClick={forceCloseModal}
        >
          {(currentPatient && !currentPatient.isBeingViewed) ? "Cancel" : "Close"}
        </button>
        
        {(!currentPatient || !currentPatient.isBeingViewed) && (
          <button
            className={`px-4 py-2 text-white rounded-md transition-colors duration-200 ${
              actionInProgress ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={() => {
              if (onSubmit && typeof onSubmit === 'function') {
                // Get patient ID to use
                const patientId = selectedPatientId || (currentPatient ? currentPatient.id : null);
                
                // Create a properly structured data object to prevent rendering issues
                const appointmentData = {
                  purpose: purpose,
                  patientId: patientId,
                  
                  // CRITICAL FIX: Set both donor/recipient IDs based on patient type
                  // This ensures the correct ID is available in createRecipientAppointment/createDonorAppointment
                  donorId: (currentPatient ? currentPatientType : patientType) === 'donor' ? patientId : null,
                  recipientId: (currentPatient ? currentPatientType : patientType) === 'recipient' ? patientId : null,
                  
                  patientType: currentPatient ? currentPatientType : patientType, // Use currentPatientType if editing existing patient
                  type: currentPatient ? currentPatientType : patientType // Use currentPatientType if editing existing patient
                };
                // Sanitize the data to ensure it's safe for React rendering
                const safeData = sanitizeObject(appointmentData);
                
                // Submit the sanitized data
                onSubmit(safeData);
              }
            }}
            disabled={actionInProgress || !scheduleData.date || !scheduleData.time || (!selectedPatientId && !currentPatient)}
          >
            {actionInProgress ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              currentPatient ? 'Schedule Appointment' : 'Schedule Appointment'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ModalFooter;
