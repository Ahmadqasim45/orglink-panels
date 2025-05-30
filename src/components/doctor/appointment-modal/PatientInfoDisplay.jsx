import React from 'react';
import DebugInfo from './DebugInfo';
import AppointmentHistorySection from './AppointmentHistorySection';

const PatientInfoDisplay = ({ 
  currentPatient,
  currentPatientType,
  patientName,
  patientDetails,
  scheduleData,
  purpose
}) => {
  return (
    <div className="mb-4 bg-blue-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">
        {currentPatientType === "donor" ? "Donor" : "Recipient"} Information
      </h3>
      
      {/* Note about data source */}
      {currentPatient.isEnhancedWithFirstAppointment && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-3 text-sm">
          <p className="font-medium">Note: Showing information from first appointment</p>
          <p className="text-xs">Important details are pulled from the patient's first appointment to ensure continuity of care.</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-2">
        {/* Name */}
        <div className="py-1 border-b border-blue-100">
          <span className="font-medium text-blue-700">Name:</span> 
          <span className="ml-2">{patientName}</span>
        </div>
        
        {/* ID - Only show in view mode */}
        <div className="py-1 border-b border-blue-100">
          <span className="font-medium text-blue-700">ID:</span> 
          <span className="ml-2 font-mono text-sm">{currentPatient.id}</span>
        </div>
        
        {/* Contact Information - Show if available */}
        {(currentPatient.email || currentPatient.contactEmail || currentPatient.userData?.email || patientDetails?.email) && (
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Email:</span> 
            <span className="ml-2">
              {currentPatient.email || currentPatient.contactEmail || currentPatient.userData?.email || patientDetails?.email}
            </span>
          </div>
        )}
        
        {(currentPatient.phone || currentPatient.contactPhone || currentPatient.userData?.phoneNumber || patientDetails?.phone) && (
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Phone:</span> 
            <span className="ml-2">
              {currentPatient.phone || currentPatient.contactPhone || currentPatient.userData?.phoneNumber || patientDetails?.phone}
            </span>
          </div>
        )}
        
        {/* Age/DOB - Show if available */}
        {(currentPatient.age || currentPatient.dateOfBirth || patientDetails?.age || patientDetails?.dateOfBirth) && (
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">{currentPatient.dateOfBirth || patientDetails?.dateOfBirth ? "Date of Birth:" : "Age:"}</span> 
            <span className="ml-2">
              {currentPatient.dateOfBirth || patientDetails?.dateOfBirth || currentPatient.age || patientDetails?.age || "Not specified"}
            </span>
          </div>
        )}
        
        {/* Gender - Show if available */}
        {(currentPatient.gender || patientDetails?.gender) && (
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Gender:</span> 
            <span className="ml-2 capitalize">
              {currentPatient.gender || patientDetails?.gender}
            </span>
          </div>
        )}
        
        {/* Blood Type */}
        <div className="py-1 border-b border-blue-100">
          <span className="font-medium text-blue-700">Blood Type:</span> 
          <span className="ml-2 font-medium">
            {(() => {
              // Try multiple possible field names for blood type
              const bloodValue = 
                currentPatient.bloodType || 
                currentPatient.blood_type ||
                patientDetails?.bloodType || 
                patientDetails?.blood_type ||
                currentPatient.patientData?.bloodType || 
                currentPatient.data?.bloodType;
              
              // Apply appropriate formatting if we found a value
              if (bloodValue) {
                return <span className="text-blue-700">{bloodValue.toUpperCase()}</span>;
              }
              
              return <span className="text-red-500">Not specified</span>;
            })()}
          </span>
        </div>
        
        {/* Organ Related Information - Different for donor vs recipient */}
        {currentPatientType === "donor" ? (
          <>
            <div className="py-1 border-b border-blue-100">
              <span className="font-medium text-blue-700">Organ to Donate:</span> 
              <span className="ml-2 capitalize font-medium">
                {(() => {
                  // Try multiple possible field names for organ type in donor records
                  const organValue = 
                    currentPatient.organToDonate || 
                    currentPatient.organ ||
                    currentPatient.organType ||
                    currentPatient.donorInfo?.organToDonate || 
                    patientDetails?.organToDonate || 
                    patientDetails?.organ ||
                    patientDetails?.organType;
                  
                  // Apply appropriate formatting if we found a value
                  if (organValue) {
                    return <span className="text-green-700">{organValue}</span>;
                  }
                  
                  return <span className="text-red-500">Not specified</span>;
                })()}
              </span>
            </div>
            
            {/* Donor specific fields */}
            {(currentPatient.donationReason || patientDetails?.donationReason) && (
              <div className="py-1 border-b border-blue-100">
                <span className="font-medium text-blue-700">Donation Reason:</span> 
                <span className="ml-2">
                  {currentPatient.donationReason || patientDetails?.donationReason}
                </span>
              </div>
            )}
            
            {(currentPatient.donorStatus || patientDetails?.donorStatus) && (
              <div className="py-1 border-b border-blue-100">
                <span className="font-medium text-blue-700">Donor Status:</span> 
                <span className="ml-2 capitalize">
                  {currentPatient.donorStatus || patientDetails?.donorStatus}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="py-1 border-b border-blue-100">
              <span className="font-medium text-blue-700">Requested Organ:</span> 
              <span className="ml-2 capitalize font-medium">
                {(() => {
                  // Try multiple possible field names for organ type in recipient records
                  const organValue = 
                    currentPatient.organType || 
                    currentPatient.organ ||
                    currentPatient.requestedOrgan ||
                    currentPatient.recipientInfo?.organType || 
                    patientDetails?.organType || 
                    patientDetails?.organ ||
                    patientDetails?.requestedOrgan;
                  
                  // Apply appropriate formatting if we found a value
                  if (organValue) {
                    return <span className="text-green-700">{organValue}</span>;
                  }
                  
                  return <span className="text-red-500">Not specified</span>;
                })()}
              </span>
            </div>
            
            {/* Recipient specific fields */}
            {(currentPatient.medicalCondition || patientDetails?.medicalCondition) && (
              <div className="py-1 border-b border-blue-100">
                <span className="font-medium text-blue-700">Medical Condition:</span> 
                <span className="ml-2">
                  {currentPatient.medicalCondition || patientDetails?.medicalCondition}
                </span>
              </div>
            )}
            
            {(currentPatient.urgencyLevel || patientDetails?.urgencyLevel) && (
              <div className="py-1 border-b border-blue-100">
                <span className="font-medium text-blue-700">Urgency Level:</span> 
                <span className="ml-2 capitalize">
                  {currentPatient.urgencyLevel || patientDetails?.urgencyLevel}
                </span>
              </div>
            )}
          </>
        )}
        
        {/* Medical Notes - Show if available */}
        {(currentPatient.medicalNotes || patientDetails?.medicalNotes) && (
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Medical Notes:</span> 
            <div className="mt-1 text-sm bg-white p-2 rounded border border-blue-100">
              {currentPatient.medicalNotes || patientDetails?.medicalNotes}
            </div>
          </div>
        )}
        
        {/* Debug information section */}
        <DebugInfo 
          patientName={patientName} 
          currentPatientType={currentPatientType} 
          currentPatient={currentPatient} 
        />
        
        {/* Appointment Information - Group these together */}
        <div className="mt-3 pt-2 border-t-2 border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Appointment Details</h4>
          
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Date:</span> 
            <span className="ml-2">{scheduleData.date}</span>
          </div>
          
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Time:</span> 
            <span className="ml-2">{scheduleData.time}</span>
          </div>
          
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Purpose:</span> 
            <span className="ml-2">{currentPatient.purpose || purpose}</span>
          </div>
          
          {/* Notes - Show if available */}
          {currentPatient.notes && (
            <div className="py-1 border-b border-blue-100">
              <span className="font-medium text-blue-700">Appointment Notes:</span> 
              <div className="mt-1 text-sm bg-white p-2 rounded border border-blue-100">
                {currentPatient.notes}
              </div>
            </div>
          )}
          
          {/* Status */}
          <div className="py-1 border-b border-blue-100">
            <span className="font-medium text-blue-700">Status:</span> 
            <span className={`ml-2 capitalize ${
              currentPatient.status === "scheduled" ? "text-blue-600 font-medium" : 
              currentPatient.status === "completed" ? "text-green-600 font-medium" : 
              currentPatient.status === "cancelled" ? "text-red-600 font-medium" : ""
            }`}>
              {currentPatient.status || "Not specified"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Appointment History */}
      {currentPatient.appointmentHistory && currentPatient.appointmentHistory.length > 1 && (
        <AppointmentHistorySection appointmentHistory={currentPatient.appointmentHistory} />
      )}
      
      {/* View mode indicator */}
      {currentPatient.isBeingViewed && (
        <div className="mt-3 pt-2 border-t border-blue-200 text-center">
          <div className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-700">
              This is <span className="font-bold text-purple-800">View Mode</span>. To edit, close this view and click <span className="font-semibold text-blue-600">Edit</span> from the list.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInfoDisplay;
