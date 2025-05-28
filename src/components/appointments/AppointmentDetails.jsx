import React, { useEffect, useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const AppointmentDetails = ({ isOpen, onClose, appointment, onCancel, onComplete, onReschedule, userRole, viewDetailsOnly = false }) => {
  const [doctorInfo, setDoctorInfo] = useState({ 
    doctorName: appointment?.doctorName || "Loading doctor info...", 
    hospitalName: appointment?.hospitalName || "Loading hospital..." 
  });
  const [loadingProviderInfo, setLoadingProviderInfo] = useState(true);
  
  // Fetch additional data when the modal opens - using same approach as AppointmentModal
  useEffect(() => {
    if (isOpen && appointment) {
      console.log("Appointment details modal opened, fetching provider details", appointment);
      
      const fetchProviderInfo = async () => {
        try {
          // Check if appointment has doctorId
          if (appointment.doctorId) {
            console.log("Found doctorId, fetching hospital and doctor info:", appointment.doctorId);
            
            // Try to get hospital data first
            try {
              const hospitalsRef = collection(db, "hospitals");
              const hospitalQuery = query(hospitalsRef, where("userId", "==", appointment.doctorId));
              const hospitalSnapshot = await getDocs(hospitalQuery);
              
              if (!hospitalSnapshot.empty) {
                const hospitalData = hospitalSnapshot.docs[0].data();
                console.log("Hospital data found:", hospitalData);
                
                // If the hospital has doctor info, use it
                let formattedDoctorName = appointment.doctorName || "Unknown Doctor";
                let hospitalName = hospitalData.hospitalName || hospitalData.name || "Unknown Hospital";
                
                if (hospitalData.doctorName) {
                  console.log("Doctor name found in hospital record:", hospitalData.doctorName);
                  formattedDoctorName = `Dr. ${hospitalData.doctorName}`;
                  
                  if (hospitalData.doctorSpecialization) {
                    formattedDoctorName += ` (${hospitalData.doctorSpecialization})`;
                  }
                }
                
                setDoctorInfo({
                  doctorName: formattedDoctorName,
                  hospitalName: hospitalName
                });
                setLoadingProviderInfo(false);
                return;
              }
            } catch (hospitalError) {
              console.error("Error fetching hospital data:", hospitalError);
            }
            
            // If we didn't find doctor info in hospital data, try user collection
            console.log("Fetching doctor info for doctorId:", appointment.doctorId);
            const doctorRef = doc(db, "users", appointment.doctorId);
            const doctorSnap = await getDoc(doctorRef);
            
            if (doctorSnap.exists()) {
              const doctorData = doctorSnap.data();
              console.log("Doctor data fetched:", doctorData);
              
              // Format the doctor name using the same process as in AppointmentModal
              let formattedDoctorName = "Dr. ";
              let hospitalName = "Unknown Hospital";
              
              // Use same doctor naming logic as AppointmentModal
              if (doctorData.firstName && doctorData.lastName) {
                formattedDoctorName += `${doctorData.firstName} ${doctorData.lastName}`;
              } else if (doctorData.displayName) {
                formattedDoctorName += doctorData.displayName;
              } else if (doctorData.name) {
                formattedDoctorName += doctorData.name;
              } else if (doctorData.email) {
                formattedDoctorName += doctorData.email;
              } else {
                formattedDoctorName = appointment.doctorName || "Doctor Name Not Available";
              }
              
              // Try to get hospital name using same approach
              if (doctorData.hospitalName) {
                hospitalName = doctorData.hospitalName;
              } else if (doctorData.hospital) {
                if (typeof doctorData.hospital === 'string') {
                  hospitalName = doctorData.hospital;
                } else if (doctorData.hospital?.name) {
                  hospitalName = doctorData.hospital.name;
                }
              }
              
              setDoctorInfo({
                doctorName: formattedDoctorName,
                hospitalName: hospitalName
              });
            } else {
              console.log("No doctor document found in database, using appointment data");
              setDoctorInfo({
                doctorName: appointment.doctorName || "Unknown Doctor",
                hospitalName: appointment.hospitalName || "Unknown Hospital"
              });
            }
          } else {
            console.log("No doctorId found, using existing appointment data");
            setDoctorInfo({
              doctorName: appointment.doctorName || "Doctor information not available",
              hospitalName: appointment.hospitalName || "Hospital information not available"
            });
          }
        } catch (error) {
          console.error("Error fetching provider info:", error);
        } finally {
          setLoadingProviderInfo(false);
        }
      };
      
      fetchProviderInfo();
    }
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;
  
  // Helper function to determine if the appointment is for a donor
  const isDonorAppointment = () => {
    return appointment.patientType === 'donor' || 
           appointment.type === 'donor' || 
           !!appointment.donorId || 
           !!appointment.organToDonate || 
           (appointment.appointmentType && appointment.appointmentType.toLowerCase().includes('donor'));
  };  // Simple helper functions to get display values from doctorInfo state
  const getDoctorDisplayValue = () => {
    return doctorInfo.doctorName || 'Not assigned';
  };
  
  const getHospitalDisplayValue = () => {
    return doctorInfo.hospitalName || 'Not specified';
  };
  
  // Function to safely render any value
  const safeRender = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'object' && value !== null) {
      // Check if it's our problematic object
      if ('patientId' in value && 'patientType' in value && 'purpose' in value && 'existingAppointment' in value) {
        return value.purpose || 'No purpose specified';
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full mr-3 ${
              appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
              appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {appointment.status === 'completed' ? 
                <i className="fas fa-check"></i> :
                appointment.status === 'cancelled' ? 
                <i className="fas fa-times"></i> :
                <i className="fas fa-calendar-check"></i>
              }
            </span>
            {appointment.status === 'completed' ? 'Completed' : 
             appointment.status === 'cancelled' ? 'Cancelled' : 
             'Scheduled'} Appointment            <span className="ml-2 text-base font-normal text-gray-500">
              ({isDonorAppointment() ? 'Donor' : 'Recipient'})
            </span>
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        {/* Content - scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Date and Time Section - Enhanced with more details */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <i className="far fa-calendar-alt mr-2"></i> Appointment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-md shadow-sm">
                <h5 className="text-md font-medium text-gray-700 mb-2">Schedule Information</h5>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Date:</span> {typeof appointment.date === 'string' ? appointment.date : formatDate(appointment.date)}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Time:</span> {appointment.time || 'Not specified'}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Duration:</span> {appointment.duration || '30 minutes'}
                </p>
                {appointment.appointmentType && (
                  <p className="text-gray-600">
                    <span className="font-medium">Type:</span> {appointment.appointmentType}
                  </p>
                )}
              </div>
              <div className="bg-white p-4 rounded-md shadow-sm">
                <h5 className="text-md font-medium text-gray-700 mb-2">Appointment Information</h5>                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Purpose:</span> {
                    typeof appointment.purpose === 'object' && appointment.purpose !== null 
                      ? safeRender(appointment.purpose) 
                      : appointment.purpose || appointment.appointmentPurpose || appointment.reason || 'Not specified'
                  }
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {appointment.status || 'scheduled'}
                  </span>
                </p>
                {appointment.scheduledBy && (
                  <p className="text-gray-600">
                    <span className="font-medium">Scheduled By:</span> {appointment.scheduledBy}
                  </p>
                )}
                {appointment.followUpAppointment && (
                  <p className="text-gray-600">
                    <span className="font-medium">Follow-Up Appointment:</span> {appointment.followUpAppointment === true ? 'Yes' : 'No'}
                  </p>                )}
              </div>
            </div>
          </div>

          {/* Patient Information - Enhanced with more details */}
          <div className="bg-green-50 p-4 rounded-lg mb-6">            <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">              <i className="fas fa-user mr-2"></i> 
              {isDonorAppointment() ? 'Donor' : 'Recipient'} Information
            </h4>
            <div className="bg-white p-4 rounded-md shadow-sm">
              {/* Basic Info Section */}
              <div className="mb-4 pb-3 border-b border-gray-100">
                <h5 className="text-md font-medium text-gray-700 mb-2">Basic Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">                  <p className="text-gray-600">
                    <span className="font-medium">Name:</span> {
                      appointment.patientName || 
                      appointment.donorName || 
                      appointment.recipientName || 
                      'Not specified'
                    }
                  </p>
                  {appointment.bloodType && (
                    <p className="text-gray-600">
                      <span className="font-medium">Blood Type:</span> 
                      <span className="ml-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-bold">{appointment.bloodType}</span>
                    </p>
                  )}                  {(appointment.email || appointment.patientEmail) && (
                    <p className="text-gray-600">
                      <span className="font-medium">Email:</span> {appointment.email || appointment.patientEmail}
                    </p>
                  )}
                  {(appointment.phone || appointment.contactNumber || appointment.patientPhone) && (
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {appointment.phone || appointment.contactNumber || appointment.patientPhone}
                    </p>
                  )}
                  {appointment.age && (
                    <p className="text-gray-600">
                      <span className="font-medium">Age:</span> {appointment.age} years
                    </p>
                  )}
                  {appointment.gender && (
                    <p className="text-gray-600">
                      <span className="font-medium">Gender:</span> {appointment.gender}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Type-specific Information */}
              <div>                <h5 className="text-md font-medium text-gray-700 mb-2">
                  {isDonorAppointment() ? 'Donation' : 'Transplant'} Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {isDonorAppointment() ? (
                    <>                      <p className="text-gray-600">
                        <span className="font-medium">Organ to Donate:</span> 
                        <span className="ml-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">
                          {appointment.organToDonate || appointment.organType || appointment.organ || 'Not specified'}
                        </span>
                      </p>
                      {appointment.donationReason && (
                        <p className="text-gray-600 md:col-span-2">
                          <span className="font-medium">Donation Reason:</span> 
                          <span className="block mt-1 p-2 bg-gray-50 rounded text-sm">{appointment.donationReason}</span>
                        </p>
                      )}
                      {appointment.donorAvailability && (
                        <p className="text-gray-600">
                          <span className="font-medium">Availability:</span> {appointment.donorAvailability}
                        </p>
                      )}
                    </>
                  ) : (
                    <>                      <p className="text-gray-600">
                        <span className="font-medium">Requested Organ:</span> 
                        <span className="ml-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">
                          {appointment.organType || appointment.organ || appointment.organToDonate || 'Not specified'}
                        </span>
                      </p>
                      {appointment.urgencyLevel && (
                        <p className="text-gray-600">
                          <span className="font-medium">Urgency Level:</span> 
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                            ${appointment.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' : 
                              appointment.urgencyLevel === 'urgent' ? 'bg-orange-100 text-orange-800' : 
                              appointment.urgencyLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}`}>
                            <span className="capitalize">{appointment.urgencyLevel}</span>
                          </span>
                        </p>
                      )}                      {appointment.waitingSince && (
                        <p className="text-gray-600">
                          <span className="font-medium">Waiting Since:</span> {appointment.waitingSince}
                        </p>
                      )}
                      {appointment.diagnosisDate && (
                        <p className="text-gray-600">
                          <span className="font-medium">Diagnosis Date:</span> {appointment.diagnosisDate}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
            {/* Doctor/Hospital Information - Enhanced with more details */}
          <div className="bg-purple-50 p-4 rounded-lg mb-6">
            <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
              <i className="fas fa-hospital-user mr-2"></i> Medical Provider Information              <span className="ml-2 text-xs text-gray-600">
                {loadingProviderInfo ? "(Loading provider information...)" : 
                `(Provider data: ${doctorInfo.doctorName}, ${doctorInfo.hospitalName})`}
              </span>
            </h4>
            <div className="bg-white p-4 rounded-md shadow-sm">
              {/* Doctor Information */}
              <div className="mb-4 pb-3 border-b border-gray-100">                <h5 className="text-md font-medium text-gray-700 mb-2">Doctor Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">                  <p className="text-gray-600">
                    <span className="font-medium">Doctor:</span> 
                    {loadingProviderInfo ? (
                      <span className="ml-1">Loading...</span>
                    ) : doctorInfo.doctorName === "Unknown Doctor" || doctorInfo.doctorName === "Doctor information not available" ? (
                      <span className="ml-1 font-semibold text-gray-500">Not assigned</span>
                    ) : (
                      <span className="ml-1 font-semibold text-green-700 bg-green-50 px-2 py-1 rounded flex-wrap">
                        <i className="fas fa-user-md mr-1"></i> {doctorInfo.doctorName}
                      </span>
                    )}
                  </p>{(appointment.doctorSpecialization || appointment.specialization || appointment.doctorSpeciality) && (
                    <p className="text-gray-600">
                      <span className="font-medium">Specialization:</span> {
                        appointment.doctorSpecialization || appointment.specialization || appointment.doctorSpeciality
                      }
                    </p>
                  )}
                  {appointment.doctorEmail && (
                    <p className="text-gray-600">
                      <span className="font-medium">Email:</span> {appointment.doctorEmail}
                    </p>
                  )}
                  {appointment.doctorPhone && (
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {appointment.doctorPhone}
                    </p>
                  )}
                </div>
              </div>
                {/* Hospital/Clinic Information */}
              <div>
                <h5 className="text-md font-medium text-gray-700 mb-2">Facility Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">                  <p className="text-gray-600 md:col-span-2">
                    <span className="font-medium">Hospital/Clinic:</span> 
                    {loadingProviderInfo ? (
                      <span className="ml-1">Loading...</span>
                    ) : doctorInfo.hospitalName === "Unknown Hospital" || doctorInfo.hospitalName === "Hospital information not available" ? (
                      <span className="ml-1 font-semibold text-gray-500">Not specified</span>
                    ) : (
                      <span className="ml-1 font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                        {doctorInfo.hospitalName}
                      </span>
                    )}                  </p>
                  {(appointment.hospitalPhone || appointment.facilityPhone || appointment.contactPhone) && (
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {appointment.hospitalPhone || appointment.facilityPhone || appointment.contactPhone}
                    </p>
                  )}
                  {(appointment.hospitalEmail || appointment.facilityEmail || appointment.contactEmail) && (
                    <p className="text-gray-600">
                      <span className="font-medium">Email:</span> {appointment.hospitalEmail || appointment.facilityEmail || appointment.contactEmail}
                    </p>
                  )}
                  {appointment.hospitalDepartment && (
                    <p className="text-gray-600">
                      <span className="font-medium">Department:</span> {appointment.hospitalDepartment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Notes Section - if available */}
          {appointment.notes && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                <i className="fas fa-sticky-note mr-2"></i> Notes
              </h4>
              <div className="bg-white p-3 rounded-md shadow-sm">
                <p className="text-gray-600 whitespace-pre-line">{appointment.notes}</p>
              </div>
            </div>
          )}
          
          {/* Medical Information - if available */}
          {(appointment.medicalNotes || appointment.medicalCondition) && (
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                <i className="fas fa-notes-medical mr-2"></i> Medical Information
              </h4>
              <div className="bg-white p-3 rounded-md shadow-sm">
                {appointment.medicalCondition && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Medical Condition:</span> {appointment.medicalCondition}
                  </p>
                )}
                {appointment.medicalNotes && (
                  <div className="mt-2">
                    <p className="font-medium text-gray-600">Medical Notes:</p>
                    <p className="text-gray-600 mt-1 whitespace-pre-line">{appointment.medicalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Appointment History - if available */}
          {appointment.appointmentHistory && appointment.appointmentHistory.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <i className="fas fa-history mr-2"></i> Appointment History
              </h4>
              <div className="bg-white p-3 rounded-md shadow-sm max-h-48 overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {appointment.appointmentHistory
                    .sort((a, b) => {
                      const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date || 0);
                      const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date || 0);
                      return dateB - dateA;
                    })
                    .map((apt, index) => {
                      const aptDate = apt.date?.seconds 
                        ? new Date(apt.date.seconds * 1000).toLocaleDateString()
                        : typeof apt.date === 'string' ? apt.date : 'Unknown date';
                      return (
                        <li key={index} className="py-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{aptDate} {apt.time || ''}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              apt.status === "completed" ? "bg-green-100 text-green-800" : 
                              apt.status === "cancelled" ? "bg-red-100 text-red-800" : 
                              "bg-blue-100 text-blue-800"
                            }`}>
                              {apt.status || "scheduled"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{safeRender(apt.purpose) || 'No purpose specified'}</div>
                          {apt.notes && <div className="text-sm italic mt-1 text-gray-500">{apt.notes}</div>}
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer with action buttons */}
        <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
          >
            Close
          </button>
            {!viewDetailsOnly && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <>
              <button
                onClick={() => {
                  onReschedule(appointment);
                  onClose();
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-200 flex items-center"
              >
                <i className="fas fa-calendar-alt mr-2"></i>
                Reschedule
              </button>
              
              <button
                onClick={() => {
                  onComplete(appointment);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center"
              >
                <i className="fas fa-check-circle mr-2"></i>
                Complete
              </button>
              
              <button
                onClick={() => {
                  onCancel(appointment);
                  onClose();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center"
              >                <i className="fas fa-times-circle mr-2"></i>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppointmentDetails;
