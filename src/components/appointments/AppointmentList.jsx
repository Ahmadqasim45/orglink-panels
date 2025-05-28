import React, { useState, useEffect } from 'react';
import AppointmentDetails from './AppointmentDetails';
import { formatDate } from '../../utils/dateUtils';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { loadUserAppointments } from '../../utils/appointmentSystemConnector';
import DocumentUploadModal from '../doctor/DocumentUploadModal';

const AppointmentList = ({ 
  appointments, 
  onEdit, 
  onCancel, 
  onComplete, 
  onReschedule, 
  userRole, 
  viewDetailsOnly = false, 
  onViewDetails = null,
  currentUserId = null, // Add currentUserId to verify permissions
  isDonorView = false // Flag to hide document button in donor view
}) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedAppointmentForDoc, setSelectedAppointmentForDoc] = useState(null);
  const [appointmentDoctorInfo, setAppointmentDoctorInfo] = useState({});
  const [loadingDoctorInfo, setLoadingDoctorInfo] = useState(true);
  const [filteredByPermission, setFilteredByPermission] = useState(false);
  const [documentUploaded, setDocumentUploaded] = useState({});
  const [loadingDocStatus, setLoadingDocStatus] = useState(true);// Check if user is admin/doctor (they can see all appointments)
  const isAdminOrDoctor = userRole === 'admin' || userRole === 'doctor';
  // Function to check document status for a specific appointment or all appointments
  const checkDocumentStatus = async (specificAppointmentId = null) => {
    if (!appointments.length || !(userRole === 'doctor' || userRole === 'admin')) {
      setLoadingDocStatus(false);
      return;
    }
    
    try {
      setLoadingDocStatus(true);
      // If a specific appointment ID is provided, only check that one
      const appointmentIds = specificAppointmentId ? 
        [specificAppointmentId] : 
        appointments.map(apt => apt.id);
      
      const documentStatus = {...documentUploaded}; // Keep existing status
      
      for (const appointmentId of appointmentIds) {
        const docQuery = query(
          collection(db, "donorUploadDocuments"),
          where("appointmentId", "==", appointmentId)
        );
        
        const querySnapshot = await getDocs(docQuery);
        documentStatus[appointmentId] = !querySnapshot.empty;
      }
      
      setDocumentUploaded(documentStatus);
    } catch (error) {
      console.error("Error checking document status:", error);
    } finally {
      setLoadingDocStatus(false);
    }
  };

  // Handle document upload completion
  const handleDocumentUploaded = (appointmentId) => {
    // Update the document status for this specific appointment
    checkDocumentStatus(appointmentId);
  };
  
  // Check if documents have been uploaded for appointments
  useEffect(() => {
    checkDocumentStatus();
  }, [appointments, userRole]);
  
  // Track when appointments are being filtered by permissions
  useEffect(() => {
    if (!isAdminOrDoctor && currentUserId && appointments.length > 0) {
      // Check if any appointments would be filtered out due to permissions
      const totalAppointments = appointments.length;
      const visibleAppointments = appointments.filter(appointment => {
        const appointmentUserId = appointment.recipientId || 
                                appointment.donorId || 
                                appointment.patientId || 
                                appointment.userId;
        
        // Try string comparison
        const appointmentUserIdStr = String(appointmentUserId || '').trim();
        const userIdStr = String(currentUserId || '').trim();
        
        // Try numeric comparison
        const appointmentUserIdNum = parseFloat(appointmentUserId);
        const userIdNum = parseFloat(currentUserId);
        const numericMatch = !isNaN(appointmentUserIdNum) && !isNaN(userIdNum) && 
                          appointmentUserIdNum === userIdNum;
                          
        return appointmentUserIdStr === userIdStr || numericMatch || appointment.matchCriteria;
      }).length;
      
      // Update state based on filtering
      setFilteredByPermission(visibleAppointments < totalAppointments);
      
      console.log(`Filtering appointments: ${visibleAppointments} visible out of ${totalAppointments} total`);
    } else {
      setFilteredByPermission(false);
    }
  }, [appointments, currentUserId, isAdminOrDoctor]);
  
  // Filter appointments based on status and user permissions
  const filteredAppointments = appointments.filter(appointment => {
    // First check appointment status filter
    if (filter !== 'all' && appointment.status !== filter) {
      return false;
    }
    
    // If admin/doctor, they can see all appointments
    if (isAdminOrDoctor) {
      return true;
    }
    
    // For regular users, verify they only see their own appointments
    if (currentUserId) {
      // Extract all possible fields where user ID might be stored
      const appointmentUserId = appointment.recipientId || 
                              appointment.donorId || 
                              appointment.patientId || 
                              appointment.userId;
                              
      // Try string-based comparison
      const userIdStr = String(currentUserId || '').trim();
      const appointmentUserIdStr = String(appointmentUserId || '').trim();
      
      // Try numeric comparison as fallback
      const userIdNum = parseFloat(currentUserId);
      const appointmentUserIdNum = parseFloat(appointmentUserId);
      const numericIdsMatch = !isNaN(userIdNum) && !isNaN(appointmentUserIdNum) && 
                           userIdNum === appointmentUserIdNum;
        // Special case - check for matchCriteria if it was set during querying
      if (appointment.matchCriteria) {
        // A match was already confirmed during the appointment query
        return true;
      }
        // Return true if either string or numeric ID matches
      const isAuthorized = appointmentUserIdStr === userIdStr || numericIdsMatch;
      
      // Log authorization details for debugging
      if (process.env.NODE_ENV !== 'production') {
        if (!isAuthorized) {
          console.log(`🔒 Authorization denied for appointment ${appointment.id}`, {
            appointmentUserIdStr,
            userIdStr,
            appointmentUserIdNum,
            userIdNum,
            appointment: appointment.id
          });
        } else {
          console.log(`✅ Authorization granted for appointment ${appointment.id}`, {
            matchType: appointmentUserIdStr === userIdStr ? 'string match' : 'numeric match'
          });
        }
      }
      
      return isAuthorized;
    }
    
    return true; // Default case (no currentUserId provided)
  });

  // Fetch doctor information for all appointments that have a doctorId
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      const doctorInfoMap = {};
      setLoadingDoctorInfo(true);

      try {
        // Create a unique set of doctorIds to avoid duplicate fetches
        const doctorIds = [...new Set(appointments
          .filter(apt => apt.doctorId)
          .map(apt => apt.doctorId))];

        if (doctorIds.length === 0) {
          setLoadingDoctorInfo(false);
          return;
        }

        // Fetch each doctor's information
        for (const doctorId of doctorIds) {
          try {
            // First try to get hospital data
            const hospitalsRef = collection(db, "hospitals");
            const hospitalQuery = query(hospitalsRef, where("userId", "==", doctorId));
            const hospitalSnapshot = await getDocs(hospitalQuery);
            
            if (!hospitalSnapshot.empty) {
              const hospitalData = hospitalSnapshot.docs[0].data();
              
              // If the hospital has doctor info, use it
              let formattedDoctorName = "Unknown Doctor";
              let hospitalName = hospitalData.hospitalName || hospitalData.name || "Unknown Hospital";
              
              if (hospitalData.doctorName) {
                formattedDoctorName = `Dr. ${hospitalData.doctorName}`;
                
                if (hospitalData.doctorSpecialization) {
                  formattedDoctorName += ` (${hospitalData.doctorSpecialization})`;
                }
              }
              
              doctorInfoMap[doctorId] = {
                doctorName: formattedDoctorName,
                hospitalName: hospitalName
              };
              continue; // Skip to next doctor if found in hospital data
            }
            
            // If we didn't find doctor info in hospital data, try user collection
            const doctorRef = doc(db, "users", doctorId);
            const doctorSnap = await getDoc(doctorRef);
            
            if (doctorSnap.exists()) {
              const doctorData = doctorSnap.data();
              
              // Format the doctor name using the same process as in AppointmentModal
              let formattedDoctorName = "Dr. ";
              let hospitalName = "Unknown Hospital";
              
              // Use same doctor naming logic
              if (doctorData.firstName && doctorData.lastName) {
                formattedDoctorName += `${doctorData.firstName} ${doctorData.lastName}`;
              } else if (doctorData.displayName) {
                formattedDoctorName += doctorData.displayName;
              } else if (doctorData.name) {
                formattedDoctorName += doctorData.name;
              } else if (doctorData.fullName) {
                formattedDoctorName += doctorData.fullName;
              } else if (doctorData.email) {
                formattedDoctorName += doctorData.email;
              } else {
                formattedDoctorName = "Doctor Name Not Available";
              }
              
              // Try to get hospital name
              if (doctorData.hospitalName) {
                hospitalName = doctorData.hospitalName;
              } else if (doctorData.hospital) {
                if (typeof doctorData.hospital === 'string') {
                  hospitalName = doctorData.hospital;
                } else if (doctorData.hospital?.name) {
                  hospitalName = doctorData.hospital.name;
                }
              }
              
              doctorInfoMap[doctorId] = {
                doctorName: formattedDoctorName,
                hospitalName: hospitalName
              };
            } else {
              // Default info if doctor not found
              doctorInfoMap[doctorId] = {
                doctorName: "Unknown Doctor",
                hospitalName: "Unknown Hospital"
              };
            }
          } catch (error) {
            console.error(`Error fetching doctor info for ${doctorId}:`, error);
            // Set default values in case of error
            doctorInfoMap[doctorId] = {
              doctorName: "Error loading doctor info",
              hospitalName: "Error loading hospital info"
            };
          }
        }
      } catch (error) {
        console.error("Error in fetching doctor information:", error);
      } finally {
        setAppointmentDoctorInfo(doctorInfoMap);
        setLoadingDoctorInfo(false);
      }
    };    
    fetchDoctorInfo();  
  }, [appointments]);

  // Function to safely render any value
  const safeRender = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'object' && value !== null) {      // Check if it's our problematic object
      if ('patientId' in value && 'patientType' in value && 'purpose' in value && 'existingAppointment' in value) {
        return value.purpose || 'No purpose specified';
      }
      return JSON.stringify(value);
    }
    return String(value);
  };
    // Open the details modal
  const handleViewDetails = (appointment) => {
    console.log("Original appointment data:", appointment);
    
    if (onViewDetails) {
      // Use external handler if provided
      onViewDetails(appointment);
    } else {
      // Otherwise use local state
      setSelectedAppointment(appointment);
      setIsDetailsModalOpen(true);
    }
  };

  // Close the details modal
  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <div className="appointment-list">
      {/* Filter tabs */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex space-x-2 px-4 py-2 overflow-x-auto">
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('all')}
          >
            <i className="fas fa-list-ul mr-2"></i>
            All Appointments
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              filter === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('scheduled')}
          >
            <i className="far fa-calendar-alt mr-2"></i>
            Scheduled
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              filter === 'completed' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('completed')}
          >
            <i className="fas fa-check-circle mr-2"></i>
            Completed
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              filter === 'cancelled' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('cancelled')}
          >
            <i className="fas fa-times-circle mr-2"></i>
            Cancelled
          </button>
        </div>
      </div>      {/* Security indicator for filtered appointments */}
      {!isAdminOrDoctor && currentUserId && (
        <div className={`px-4 py-2 mb-2 rounded text-sm ${filteredByPermission ? 'bg-blue-50' : ''}`}>
          <span className="flex items-center">
            <i className={`fas fa-shield-alt mr-2 ${filteredByPermission ? 'text-blue-600' : 'text-gray-400'}`}></i>
            <span className={filteredByPermission ? 'font-medium text-blue-700' : 'text-gray-500'}>
              {filteredByPermission 
                ? 'Security filter activated: You can only view your own appointments' 
                : 'Privacy protection active: You are viewing your appointments only'}
            </span>
          </span>
        </div>
      )}
        {/* No appointments message */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="text-gray-400 mb-4">
            <i className="far fa-calendar-times text-5xl"></i>
          </div>
          <h3 className="text-xl font-medium text-gray-600 mb-2">No appointments found</h3>
          <p className="text-gray-500">
            {filter !== 'all' 
              ? `There are no ${filter} appointments to display.` 
              : 'No appointments have been scheduled yet.'}
          </p>
          
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-2 border border-gray-300 rounded bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">Debug information:</p>
              <p className="text-xs text-gray-600">Total appointments: {appointments.length}</p>
              <p className="text-xs text-gray-600">User role: {userRole || 'Not specified'}</p>
              <p className="text-xs text-gray-600">Current filter: {filter}</p>
              <p className="text-xs text-gray-600">User ID: {currentUserId ? currentUserId.substring(0, 8) + '...' : 'None'}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Tabular view of appointments */}
          <table className="min-w-full divide-y divide-gray-200">            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <i className="fas fa-user-alt mr-2"></i>Patient Info
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <i className="far fa-calendar-alt mr-2"></i>Date & Time
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <i className="fas fa-clipboard-list mr-2"></i>Purpose & Details
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <i className="fas fa-info-circle mr-2"></i>Status
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <i className="fas fa-hospital-user mr-2"></i>Medical Provider
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <i className="fas fa-cog mr-2"></i>Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <tr 
                  key={appointment.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewDetails(appointment)}
                >                  {/* Patient Column - Enhanced with more details */}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <i className={`fas ${appointment.type === 'donor' ? 'fa-hand-holding-heart' : 'fa-hospital-user'}`}></i>
                      </div>
                      <div className="ml-4">                        <div className="text-sm font-medium text-gray-900">
                          {appointment.patientName || 
                           appointment.donorName || 
                           appointment.recipientName || 
                           'Unknown Patient'}
                        </div>
                        <div className="flex flex-col text-xs text-gray-500 mt-1">
                          <span className="flex items-center">
                            <i className="fas fa-user-tag mr-1"></i>
                            {appointment.patientType || appointment.type || (appointment.donorId ? 'Donor' : 'Recipient')}
                          </span>
                          
                          {/* Blood Type */}
                          {appointment.bloodType && (
                            <span className="flex items-center mt-1">
                              <i className="fas fa-tint mr-1 text-red-500"></i>
                              {appointment.bloodType}
                            </span>
                          )}
                          
                          {/* Organ Type */}
                          {(appointment.organType || appointment.organToDonate) && (
                            <span className="flex items-center mt-1">
                              <i className="fas fa-heartbeat mr-1 text-purple-500"></i>
                              {appointment.organType || appointment.organToDonate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Date & Time Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{typeof appointment.date === 'string' ? appointment.date : formatDate(appointment.date)}</div>
                    <div className="text-sm text-gray-500">{appointment.time || 'No time specified'}</div>
                  </td>                  {/* Purpose Column - Enhanced with details */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{safeRender(appointment.purpose)}</div>
                    
                    {/* Additional details based on patient type */}
                    {(appointment.type === 'donor' || appointment.patientType === 'donor') && appointment.donationReason && (
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                        <span className="font-medium">Reason: </span>
                        {appointment.donationReason.length > 50 
                          ? `${appointment.donationReason.substring(0, 50)}...` 
                          : appointment.donationReason}
                      </div>
                    )}
                    
                    {(appointment.type === 'recipient' || appointment.patientType === 'recipient') && appointment.urgencyLevel && (                      <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-flex items-center w-fit
                        ${appointment.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' : 
                          appointment.urgencyLevel === 'urgent' ? 'bg-orange-100 text-orange-800' : 
                          appointment.urgencyLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}`}>
                        <span className={`mr-1 h-1.5 w-1.5 rounded-full block
                          ${appointment.urgencyLevel === 'critical' ? 'bg-red-500' : 
                            appointment.urgencyLevel === 'urgent' ? 'bg-orange-500' : 
                            appointment.urgencyLevel === 'moderate' ? 'bg-yellow-500' : 
                            'bg-green-500'}`}></span>
                        <span className="capitalize">{appointment.urgencyLevel}</span>
                      </div>
                    )}
                    
                    {/* Show notes indicator if present */}
                    {appointment.notes && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center">
                        <i className="fas fa-sticky-note mr-1"></i>
                        Has notes
                      </div>
                    )}
                  </td>
                  
                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      <span className={`mr-1.5 h-2 w-2 rounded-full ${
                        appointment.status === 'completed' ? 'bg-green-500' :
                        appointment.status === 'cancelled' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}></span>
                      {appointment.status || 'scheduled'}
                    </span>
                  </td>                  {/* Doctor Column - Enhanced with hospital details */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">
                      <div className="flex items-center">
                        <i className="fas fa-user-md text-green-600 mr-2"></i>
                        {loadingDoctorInfo ? (
                          <span className="text-gray-500">Loading...</span>
                        ) : (
                          <span className="font-semibold text-green-700 bg-green-50 px-1 py-0.5 rounded">
                            {appointment.doctorId && appointmentDoctorInfo[appointment.doctorId]
                              ? appointmentDoctorInfo[appointment.doctorId].doctorName
                              : appointment.doctorName 
                                ? (appointment.doctorName.startsWith('Dr.') 
                                    ? appointment.doctorName 
                                    : `Dr. ${appointment.doctorName}`)
                                : 'Not assigned'}
                          </span>
                        )}
                      </div>
                      {appointment.doctorSpecialization && (
                        <div className="text-xs text-gray-500 ml-6 mt-1">
                          {appointment.doctorSpecialization}
                        </div>
                      )}
                    </div>
                    
                    {/* Hospital information with loading state */}
                    <div className="text-xs mt-2 flex items-center">
                      <i className="fas fa-hospital mr-1 text-purple-600"></i>
                      {loadingDoctorInfo ? (
                        <span className="text-gray-500">Loading...</span>
                      ) : (
                        <span className="truncate max-w-[150px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.5 rounded">
                          {appointment.doctorId && appointmentDoctorInfo[appointment.doctorId]
                            ? appointmentDoctorInfo[appointment.doctorId].hospitalName
                            : appointment.hospitalName || 'Not specified'}
                        </span>
                      )}
                    </div>
                    {appointment.hospitalAddress && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center">
                        <i className="fas fa-map-marker-alt mr-1"></i>
                        <span className="truncate max-w-[150px]">
                          {appointment.hospitalAddress.length > 30 
                            ? `${appointment.hospitalAddress.substring(0, 30)}...` 
                            : appointment.hospitalAddress}
                        </span>
                      </div>
                    )}
                  </td>
                    {/* Actions Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-y-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click event
                        handleViewDetails(appointment);
                      }}
                      className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 block w-full text-left"
                    >
                      <i className="fas fa-eye mr-1"></i> View Details
                    </button>                    {/* Medical Document button - Only show for completed donor appointments in doctor view */}
                    {!isDonorView && appointment.status === 'completed' && 
                     (appointment.type === 'donor' || appointment.patientType === 'donor') &&
                     (userRole === 'doctor' || userRole === 'admin') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click event
                          setSelectedAppointmentForDoc(appointment);
                          setShowDocumentModal(true);
                        }}
                        className={`${
                          documentUploaded[appointment.id] 
                            ? "text-green-600 hover:text-green-800 hover:bg-green-50" 
                            : "text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                        } px-2 py-1 rounded block w-full text-left`}
                        disabled={loadingDocStatus}
                      >
                        {loadingDocStatus ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-1"></i> Checking...
                          </>
                        ) : documentUploaded[appointment.id] ? (
                          <>
                            <i className="fas fa-file-medical-alt mr-1"></i> View Medical Document
                          </>
                        ) : (
                          <>
                            <i className="fas fa-file-medical mr-1"></i> Upload Medical Document
                          </>
                        )}
                      </button>
                    )}
                      {!viewDetailsOnly && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                      <>
                        {/* Only show reschedule button if not in donor view */}
                        {!isDonorView && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              onReschedule(appointment);
                            }}
                            className="text-orange-600 hover:text-orange-800 px-2 py-1 rounded hover:bg-orange-50 block w-full text-left"
                          >
                            <i className="fas fa-calendar-alt mr-1"></i> Reschedule
                          </button>
                        )}
                        
                        {/* Only show complete button for doctors/admin */}
                        {(userRole === 'doctor' || userRole === 'admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              onComplete(appointment);
                            }}
                            className="text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 block w-full text-left"
                          >
                            <i className="fas fa-check mr-1"></i> Complete
                          </button>
                        )}
                          {/* Only show cancel button for doctors/admin */}
                        {(userRole === 'doctor' || userRole === 'admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              onCancel(appointment);
                            }}
                            className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 block w-full text-left"
                          >
                            <i className="fas fa-times mr-1"></i> Cancel
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}      {/* View Details Modal - only render if not using external handler */}
      {!onViewDetails && isDetailsModalOpen && selectedAppointment && (
        <AppointmentDetails
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          appointment={selectedAppointment}
          onReschedule={onReschedule}
          onCancel={onCancel}
          onComplete={onComplete}
          userRole={userRole}
          viewDetailsOnly={viewDetailsOnly}
        />
      )}      {/* Document Upload Modal for doctors */}
      {showDocumentModal && selectedAppointmentForDoc && (
        <DocumentUploadModal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          appointmentId={selectedAppointmentForDoc.id}
          onDocumentUploaded={handleDocumentUploaded}
        />
      )}
    </div>
  );
};

export default AppointmentList;
