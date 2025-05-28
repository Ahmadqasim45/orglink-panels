import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from "../../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import './AppointmentModal.css';
import { sanitizeObject } from '../../utils/safeRendering';

const AppointmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  currentPatient,
  currentPatientType,
  scheduleData,
  setScheduleData,
  existingAppointments,
  actionInProgress,
  getDonorName,
  getRecipientName,
  donors,
  recipients
}) => {
  const modalRef = useRef(null);
  const modalContainerRef = useRef(null);

  const [patientType, setPatientType] = useState("donor");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [purpose, setPurpose] = useState("Medical Consultation");
  const [doctorInfo, setDoctorInfo] = useState({ doctorName: "", hospitalName: "" });
  const [loadingDoctorInfo, setLoadingDoctorInfo] = useState(true);
  const [hospitals, setHospitals] = useState([]);  
  const [testValue, setTestValue] = useState("Initial value");
  const [dataFetchComplete, setDataFetchComplete] = useState(false);
  const [patientDetails, setPatientDetails] = useState(null);  

  // Improved name resolution with better fallbacks and formatting
  const patientName = useMemo(() => {
    if (!currentPatient) return "";
    
    // Debug what's happening with naming functions
    console.log("Name resolution - Patient data:", currentPatient);
    console.log("Name resolution - Patient type:", currentPatientType);
    
    // First check specific donor or recipient name fields that might be set in StaffDashboard
    if (currentPatientType === "donor" && currentPatient.donorName) {
      return currentPatient.donorName;
    }
    if (currentPatientType === "recipient" && currentPatient.recipientName) {
      return currentPatient.recipientName;
    }
    
    // Next try the donor/recipient name functions provided as props
    const nameFromFunction = currentPatientType === "donor" 
      ? (typeof getDonorName === 'function' ? getDonorName(currentPatient) : null)
      : (typeof getRecipientName === 'function' ? getRecipientName(currentPatient) : null);
    
    console.log("Name resolution - Name from function:", nameFromFunction);
    
    if (nameFromFunction && nameFromFunction !== "Unknown" && nameFromFunction !== "Unknown Donor" && nameFromFunction !== "Unknown Recipient") {
      return nameFromFunction;
    }
    
    // Next, try various name fields that might be in the patient data
    const possibleNameFields = [
      'fullName',
      'patientName',
      'donorName',
      'recipientName',
      'name',
      'displayName'
    ];
    
    for (const field of possibleNameFields) {
      if (currentPatient[field] && typeof currentPatient[field] === 'string' && currentPatient[field].trim() !== '') {
        console.log(`Name resolution - Found name in field: ${field} = ${currentPatient[field]}`);
        return currentPatient[field];
      }
    }
    
    // Try to combine first and last name if available
    if (currentPatient.firstName || currentPatient.lastName) {
      const combinedName = `${currentPatient.firstName || ''} ${currentPatient.lastName || ''}`.trim();
      console.log(`Name resolution - Combined first/last name: ${combinedName}`);
      if (combinedName) return combinedName;
    }
    
    // If we have donor/recipient specific fields, try those
    if (currentPatientType === "donor" && currentPatient.donorFirstName) {
      const donorName = `${currentPatient.donorFirstName || ''} ${currentPatient.donorLastName || ''}`.trim();
      console.log(`Name resolution - Donor specific name: ${donorName}`);
      if (donorName) return donorName;
    }
    
    if (currentPatientType === "recipient" && currentPatient.recipientFirstName) {
      const recipientName = `${currentPatient.recipientFirstName || ''} ${currentPatient.recipientLastName || ''}`.trim();
      console.log(`Name resolution - Recipient specific name: ${recipientName}`);
      if (recipientName) return recipientName;
    }
    
    // Check patient-specific ID fields
    const idField = currentPatientType === "donor" ? "donorId" : "recipientId";
    if (currentPatient[idField]) {
      console.log(`Name resolution - Found ${idField}: ${currentPatient[idField]}`);
      // Try to look up the patient in the provided lists
      const list = currentPatientType === "donor" ? (donors?.approved || []) : (recipients?.approved || []);
      const match = list.find(p => p.id === currentPatient[idField]);
      if (match) {
        console.log(`Name resolution - Found match in ${currentPatientType} list:`, match);
        // Use the name from the matched patient
        const matchName = currentPatientType === "donor" 
          ? (typeof getDonorName === 'function' ? getDonorName(match) : null)
          : (typeof getRecipientName === 'function' ? getRecipientName(match) : null);
          
        if (matchName && matchName !== "Unknown Donor" && matchName !== "Unknown Recipient") {
          console.log(`Name resolution - Using name from matched ${currentPatientType}: ${matchName}`);
          return matchName;
        }
        
        // If the lookup function didn't work, try direct name fields from match
        for (const field of possibleNameFields) {
          if (match[field] && typeof match[field] === 'string' && match[field].trim() !== '') {
            console.log(`Name resolution - Found name in matched ${currentPatientType}.${field}: ${match[field]}`);
            return match[field];
          }
        }
      }
    }
    
    // If we got patient details from our fetch, check those too
    if (patientDetails) {
      console.log("Name resolution - Checking patientDetails:", patientDetails);
      
      for (const field of possibleNameFields) {
        if (patientDetails[field] && typeof patientDetails[field] === 'string' && patientDetails[field].trim() !== '') {
          console.log(`Name resolution - Found name in patientDetails.${field}: ${patientDetails[field]}`);
          return patientDetails[field];
        }
      }
      
      if (patientDetails.firstName || patientDetails.lastName) {
        const detailsName = `${patientDetails.firstName || ''} ${patientDetails.lastName || ''}`.trim();
        console.log(`Name resolution - From patientDetails first/last: ${detailsName}`);
        if (detailsName) return detailsName;
      }
    }
    
    // Try using user info if present
    if (currentPatient.userData) {
      const userData = currentPatient.userData;
      console.log("Name resolution - Checking userData:", userData);
      
      if (userData.displayName) return userData.displayName;
      if (userData.name) return userData.name;
      if (userData.firstName || userData.lastName) {
        return `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      }
      if (userData.email) return userData.email;
    }
    
    // Try checking patientData if it exists
    if (currentPatient.patientData) {
      const patientData = currentPatient.patientData;
      console.log("Name resolution - Checking patientData:", patientData);
      
      if (patientData.fullName) return patientData.fullName;
      if (patientData.name) return patientData.name;
      if (patientData.firstName || patientData.lastName) {
        return `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim();
      }
    }
    
    // Last resort, return a placeholder with the type and ID
    const fallbackName = currentPatientType === "donor" 
      ? "Donor #" + currentPatient.id.substring(0, 5) 
      : "Recipient #" + currentPatient.id.substring(0, 5);
    
    console.log(`Name resolution - Using fallback: ${fallbackName}`);
    return fallbackName;
  }, [currentPatient, currentPatientType, getDonorName, getRecipientName, patientDetails, donors, recipients]);

  const patientOptions = patientType === "donor" 
    ? donors.approved || []
    : recipients.approved || [];
  
  // Debug component to display all available patient info
  const PatientDebugInfo = ({ patient, patientType, details }) => {
    // ... Component implementation ...
  };

  const forceCloseModal = () => {
    console.log("Force closing modal");
    if (modalContainerRef.current) {
      modalContainerRef.current.style.display = 'none';
    }
    if (typeof onClose === 'function') {
      onClose();
    }
    if (window.setCurrentPatient) window.setCurrentPatient = null;
    if (window.setCurrentPatientType) window.setCurrentPatientType = null;
    window.selectedPatientInfo = null;
    window.currentDoctorInfo = null;
  };

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        forceCloseModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);  
  // Update effect to fetch patient details when modal is opened
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened, fetching info");
      setPatientType(currentPatientType || "donor");
      setSelectedPatientId(currentPatient?.id || "");
      
      // Set purpose from currentPatient if available, otherwise default
      if (currentPatient && currentPatient.purpose) {
        setPurpose(currentPatient.purpose);
      } else {
        setPurpose("Medical Consultation");
      }
      
      // Reset loading states
      setLoadingDoctorInfo(true);
      setDataFetchComplete(false);
      
      // Immediately fetch all data including doctor info
      fetchAllData();
      
      // Ensure the modal is visible
      if (modalContainerRef.current) {
        modalContainerRef.current.style.display = 'flex';
      }
      
      // Set focus on the modal to ensure keyboard events work
      if (modalRef.current) {
        setTimeout(() => {
          modalRef.current.focus();
        }, 50);
      }
      
      // Log patient info for debugging
      console.log("Current patient:", currentPatient);
      console.log("Current patient type:", currentPatientType);
      
      // Determine which patient ID to use for fetching details
      let patientIdToFetch = currentPatient?.id;
      
      // Try to use the more specific donor/recipient ID if available
      if (currentPatientType === 'donor' && currentPatient?.donorId) {
        patientIdToFetch = currentPatient.donorId;
        console.log(`Using donorId (${patientIdToFetch}) instead of general id for patient fetch`);
      } else if (currentPatientType === 'recipient' && currentPatient?.recipientId) {
        patientIdToFetch = currentPatient.recipientId;
        console.log(`Using recipientId (${patientIdToFetch}) instead of general id for patient fetch`);
      }
      
      // If we have a patient ID, fetch the full patient data
      if (patientIdToFetch && currentPatientType) {
        // Use a small delay to ensure React has finished rendering
        setTimeout(() => {
          fetchPatientDetails(patientIdToFetch, currentPatientType);
        }, 50);
      } else {
        console.warn("Missing required patient information for data fetch:", 
          {patientId: patientIdToFetch, patientType: currentPatientType});
      }
    } else {
      // Make sure modal is hidden when closed
      if (modalContainerRef.current) {
        modalContainerRef.current.style.display = 'none';
      }
    }
  }, [isOpen, auth.currentUser?.uid, currentPatient, currentPatientType]);
  // Function to fetch detailed patient information
  const fetchPatientDetails = async (patientId, patientType) => {
    if (!patientId || !patientType) {
      console.error("Missing patientId or patientType in fetchPatientDetails:", { patientId, patientType });
      return;
    }
    
    try {
      console.log(`Fetching ${patientType} details for ID: ${patientId}`);
      const collectionName = patientType === 'donor' ? 'donors' : 'recipients';
      const patientRef = doc(db, collectionName, patientId);
      const patientSnap = await getDoc(patientRef);
      
      if (patientSnap.exists()) {
        const details = { id: patientSnap.id, ...patientSnap.data() };
        console.log(`Found ${patientType} details:`, details);
        setPatientDetails(details);
      } else {
        console.log(`No ${patientType} document found with ID: ${patientId}`);
        setPatientDetails(null);
      }
    } catch (error) {
      console.error(`Error fetching ${patientType} details:`, error);
      setPatientDetails(null);
    }
  };  const fetchAllData = async () => {
    try {
      // Get the current user (doctor) info
      const user = auth.currentUser;
      
      if (!user || !user.uid) {
        console.error("No authenticated user found for doctor info");
        setDoctorInfo({
          doctorName: "Not authenticated",
          hospitalName: "Please log in again"
        });
        setLoadingDoctorInfo(false);
        return;
      }
      
      // Try to get hospital data first, as it might contain doctor information
      try {
        const hospitalsRef = collection(db, "hospitals");
        const hospitalQuery = query(hospitalsRef, where("userId", "==", user.uid));
        const hospitalSnapshot = await getDocs(hospitalQuery);
        
        if (!hospitalSnapshot.empty) {
          const hospitalData = hospitalSnapshot.docs[0].data();
          console.log("Hospital data found:", hospitalData);
          
          // If the hospital has doctor info, use it
          if (hospitalData.doctorName) {
            console.log("Doctor name found in hospital record:", hospitalData.doctorName);
            let formattedDoctorName = `Dr. ${hospitalData.doctorName}`;
            if (hospitalData.doctorSpecialization) {
              formattedDoctorName += ` (${hospitalData.doctorSpecialization})`;
            }
            
            setDoctorInfo({
              doctorName: formattedDoctorName,
              hospitalName: hospitalData.hospitalName || "Unknown Hospital"
            });
            setLoadingDoctorInfo(false);
            return;
          }
        }
      } catch (hospitalError) {
        console.error("Error fetching hospital data:", hospitalError);
      }
      
      // If we didn't find doctor info in hospital data, try user collection
      console.log("Fetching doctor info for UID:", user.uid);
      const doctorRef = doc(db, "users", user.uid);
      const doctorSnap = await getDoc(doctorRef);      if (doctorSnap.exists()) {
        const doctorData = doctorSnap.data();
        console.log("Doctor data fetched:", doctorData);
        console.log("Doctor data keys:", Object.keys(doctorData));
        
        // Enhanced debugging for doctor name fields
        console.log("First name:", doctorData.firstName);
        console.log("Last name:", doctorData.lastName);
        console.log("Display name:", doctorData.displayName);
        console.log("Name:", doctorData.name);
        console.log("Full name:", doctorData.fullName);
        console.log("Email:", doctorData.email);
        
        // Format the doctor name using available fields with improved detection
        let formattedDoctorName = "Dr. ";
        
        // First try profile info fields
        if (doctorData.profile) {
          console.log("Doctor profile data found:", doctorData.profile);
          if (doctorData.profile.firstName && doctorData.profile.lastName) {
            formattedDoctorName += `${doctorData.profile.firstName} ${doctorData.profile.lastName}`;
            console.log("Using profile firstName + lastName:", formattedDoctorName);
          } else if (doctorData.profile.fullName) {
            formattedDoctorName += doctorData.profile.fullName;
            console.log("Using profile fullName:", formattedDoctorName);
          } else if (doctorData.profile.name) {
            formattedDoctorName += doctorData.profile.name;
            console.log("Using profile name:", formattedDoctorName);
          }
        } 
        // If profile doesn't have name info, try root fields
        else if (doctorData.firstName && doctorData.lastName) {
          formattedDoctorName += `${doctorData.firstName} ${doctorData.lastName}`;
          console.log("Using firstName + lastName:", formattedDoctorName);
        } else if (doctorData.firstName) {
          formattedDoctorName += doctorData.firstName;
          console.log("Using firstName only:", formattedDoctorName);
        } else if (doctorData.lastName) {
          formattedDoctorName += doctorData.lastName;
          console.log("Using lastName only:", formattedDoctorName);
        } else if (doctorData.displayName) {
          formattedDoctorName += doctorData.displayName;
          console.log("Using displayName:", formattedDoctorName);
        } else if (doctorData.name) {
          formattedDoctorName += doctorData.name;
          console.log("Using name:", formattedDoctorName);
        } else if (doctorData.fullName) {
          formattedDoctorName += doctorData.fullName;
          console.log("Using fullName:", formattedDoctorName);
        } else if (doctorData.email) {
          // Use email as last resort
          formattedDoctorName += `(${doctorData.email})`;
          console.log("Using email as fallback:", formattedDoctorName);
        } else if (auth.currentUser.displayName) {
          formattedDoctorName += auth.currentUser.displayName;
          console.log("Using auth.currentUser.displayName:", formattedDoctorName);
        } else if (auth.currentUser.email) {
          formattedDoctorName += `(${auth.currentUser.email})`;
          console.log("Using auth.currentUser.email:", formattedDoctorName);
        } else {
          formattedDoctorName = "Doctor Name Not Available";
          console.log("No valid name fields found");
        }        // Fetch hospital information from the separate hospitals collection
        let hospitalName = "Unknown Hospital";
        try {
          // Try different approaches to get the hospital information
          
          // 1. Query hospitals collection with userId
          const hospitalsRef = collection(db, "hospitals");
          let hospitalQuery = query(hospitalsRef, where("userId", "==", user.uid));
          let hospitalSnapshot = await getDocs(hospitalQuery);
          
          // If we found hospital info, use it
          if (!hospitalSnapshot.empty) {
            const hospitalData = hospitalSnapshot.docs[0].data();
            hospitalName = hospitalData.hospitalName || hospitalData.name || "Hospital Name Not Set";
            console.log("Hospital data fetched from collection:", hospitalData);
            
            // If hospital data has doctor name but we don't have it yet, use it
            if (hospitalData.doctorName && formattedDoctorName === "Dr. ") {
              formattedDoctorName = `Dr. ${hospitalData.doctorName}`;
              console.log("Using doctor name from hospital data:", formattedDoctorName);
            }
          } 
          // 2. Check if hospital information is directly in doctor data
          else if (doctorData.hospitalName) {
            hospitalName = doctorData.hospitalName;
            console.log("Found hospital name directly in doctor data:", hospitalName);
          } else if (doctorData.hospital) {
            if (typeof doctorData.hospital === 'string') {
              hospitalName = doctorData.hospital;
            } else if (doctorData.hospital?.name) {
              hospitalName = doctorData.hospital.name;
            }
            console.log("Found hospital from doctor's hospital field:", hospitalName);
          }
        } catch (hospitalError) {
          console.error("Error fetching hospital info:", hospitalError);
        }// Update the doctor info state with the fetched values
        const doctorInfoToSet = {
          doctorName: formattedDoctorName,
          hospitalName: hospitalName
        };
        
        console.log("Setting doctor info:", doctorInfoToSet);
        
        // Use direct state setting to ensure consistent update
        setDoctorInfo(prevState => {
          console.log("Previous doctorInfo state:", prevState);
          return doctorInfoToSet;
        });
        
        // Force a refresh of the component state
        setLoadingDoctorInfo(false);
        
        // Debug for UI rendering
        setTimeout(() => {
          console.log("After setState - Current doctorInfo:", doctorInfoToSet);
        }, 0);
      } else {
        console.log("No doctor document found");
        setDoctorInfo({
          doctorName: "Unknown Doctor",
          hospitalName: "Unknown Hospital"
        });
      }
    } catch (error) {
      console.error("Error fetching doctor info:", error);
      setDoctorInfo({
        doctorName: "Error loading doctor info",
        hospitalName: "Please try refreshing"
      });
    } finally {
      // Make sure to set loading to false in any case
      setLoadingDoctorInfo(false);
      setDataFetchComplete(true);
    }
  };  // Add an effect specifically to load doctor info when auth state is ready
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      console.log("Loading doctor info based on auth state for user:", auth.currentUser.uid);
      setLoadingDoctorInfo(true);
      
      // Add a slight delay to ensure the modal is properly initialized
      setTimeout(() => {
        fetchAllData();
      }, 100);
    }
  }, [isOpen, auth.currentUser]);

  // Debug logging for each render
  console.log("RENDER - doctorInfo:", doctorInfo);
  console.log("RENDER - loadingDoctorInfo:", loadingDoctorInfo);
  console.log("RENDER - patientName:", currentPatient);
  if (!isOpen) return null;
  
  return (
    <div 
      ref={modalContainerRef}
      className="AppointmentModal-container" 
      onClick={(e) => {
        if (e.target === modalContainerRef.current) {
          forceCloseModal();
        }
      }}
    >
      <div 
        ref={modalRef}
        className="AppointmentModal bg-white w-full max-w-2xl rounded-lg shadow-xl"
        tabIndex="-1"
      >
        {/* Header Section - Fixed at the top */}
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
          {/* Scrollable Content Section */}
        <div className="AppointmentModal-content">
          <div className="mb-4 bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Appointment Provider</h3>            <p className="flex items-start mb-2">
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

          {currentPatient ? (
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
                )}                  {/* Blood Type */}
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
                  {/* Organ Related Information - Different for donor vs recipient */}                {currentPatientType === "donor" ? (
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
                  </>                ) : (
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
                
              {/* Debug information section - Helps troubleshoot patient data issues */}
              <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                <details>
                  <summary className="cursor-pointer font-medium mb-1">Debug Information (Click to expand)</summary>
                  <div className="space-y-1 mt-2">
                    <p><span className="font-mono">patientName:</span> {patientName}</p>
                    <p><span className="font-mono">currentPatientType:</span> {currentPatientType || "not set"}</p>
                    <p><span className="font-mono">Patient ID:</span> {currentPatient?.id || "not set"}</p>
                    {currentPatientType === "recipient" && (
                      <p><span className="font-mono">recipientId:</span> {currentPatient?.recipientId || "not set"}</p>
                    )}
                    {currentPatientType === "donor" && (
                      <p><span className="font-mono">donorId:</span> {currentPatient?.donorId || "not set"}</p>
                    )}
                    <p><span className="font-mono">isBeingViewed:</span> {currentPatient?.isBeingViewed ? "true" : "false"}</p>
                  </div>
                </details>
              </div>
                
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
              
              {/* Appointment History - Show if available */}
              {currentPatient.appointmentHistory && currentPatient.appointmentHistory.length > 1 && (
                <div className="mt-4 pt-3 border-t-2 border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Appointment History</h4>
                  <div className="max-h-48 overflow-y-auto bg-white rounded border border-blue-100 p-2">
                    <ul className="text-sm">
                      {currentPatient.appointmentHistory
                        .sort((a, b) => {
                          // Sort by date descending (newest first)
                          const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date || 0);
                          const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date || 0);
                          return dateB - dateA;
                        })
                        .map((apt, index) => {
                          const aptDate = apt.date?.seconds 
                            ? new Date(apt.date.seconds * 1000).toLocaleDateString()
                            : typeof apt.date === 'string' ? apt.date : 'Unknown date';
                          return (
                            <li key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex justify-between">
                                <span className="font-medium">{aptDate} {apt.time || ''}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  apt.status === "completed" ? "bg-green-100 text-green-800" : 
                                  apt.status === "cancelled" ? "bg-red-100 text-red-800" : 
                                  "bg-blue-100 text-blue-800"
                                }`}>
                                  {apt.status || "scheduled"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">{apt.purpose || 'No purpose specified'}</div>
                              {apt.notes && <div className="text-xs italic mt-1">{apt.notes}</div>}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </div>
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
          ) : (
            <div className="mb-4 space-y-4">
              <div>
                <label className="block mb-2 font-medium">Patient Type</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={patientType}
                  onChange={(e) => {
                    setPatientType(e.target.value);
                    setSelectedPatientId("");
                  }}
                >
                  <option value="donor">Donor</option>
                  <option value="recipient">Recipient</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium">Select {patientType === "donor" ? "Donor" : "Recipient"}</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedPatientId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPatientId(id);
                    const selectedPatient = patientOptions.find(p => p.id === id);
                    if (selectedPatient) {
                      if (typeof window.setCurrentPatient === 'function') {
                        window.setCurrentPatient(selectedPatient);
                        window.setCurrentPatientType(patientType);
                      } else {
                        window.selectedPatientInfo = {
                          patient: selectedPatient,
                          type: patientType
                        };
                      }
                    }
                  }}
                >
                  <option value="">Select a {patientType}</option>
                  {patientOptions.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patientType === "donor" ? getDonorName(patient) : getRecipientName(patient)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">Appointment Date</label>
              <input
                type="date"
                className={`w-full p-2 border rounded-md ${currentPatient && currentPatient.isBeingViewed ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                value={scheduleData.date}
                onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                required
                readOnly={currentPatient && currentPatient.isBeingViewed}
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Appointment Time</label>
              <input
                type="time"
                className={`w-full p-2 border rounded-md ${currentPatient && currentPatient.isBeingViewed ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                value={scheduleData.time}
                onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                required
                readOnly={currentPatient && currentPatient.isBeingViewed}
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Appointment Purpose</label>
              <select
                id="appointmentPurpose"
                className={`w-full p-2 border rounded-md ${currentPatient && currentPatient.isBeingViewed ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={currentPatient && currentPatient.isBeingViewed}
              >
                <option value="Medical Consultation">Medical Consultation</option>
                <option value="Pre-Donation Assessment">Pre-Donation Assessment</option>
                <option value="Post-Donation Follow-up">Post-Donation Follow-up</option>
                <option value="Transplant Evaluation">Transplant Evaluation</option>
                <option value="Laboratory Tests">Laboratory Tests</option>
                <option value="Psychological Evaluation">Psychological Evaluation</option>
                <option value="Other Medical Service">Other Medical Service</option>
              </select>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Note: Make sure the selected time slot is available. Unavailable time slots will be rejected.
              </p>
              
              {existingAppointments.length > 0 && (
                <div className="bg-yellow-50 p-2 rounded-md">
                  <p className="text-sm font-medium">Other scheduled appointments on this date:</p>
                  <ul className="text-xs ml-4 list-disc">
                    {existingAppointments
                      .filter(apt => {
                        const aptDate = apt.date && apt.date.seconds 
                          ? new Date(apt.date.seconds * 1000).toISOString().split('T')[0]
                          : typeof apt.date === 'string' ? apt.date : '';
                        return aptDate === scheduleData.date;
                      })
                      .map((apt, index) => (
                        <li key={index}>{typeof apt.time === 'string' ? apt.time : 'Time not specified'}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer Section - Fixed at the bottom */}
        <div className="AppointmentModal-footer">
          <div className="flex justify-end space-x-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
              onClick={forceCloseModal}
            >
              {(currentPatient && !currentPatient.isBeingViewed) ? "Cancel" : "Close"}
            </button>
            
            {(!currentPatient || !currentPatient.isBeingViewed) && (              <button
                className={`px-4 py-2 text-white rounded-md transition-colors duration-200 ${
                  actionInProgress ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'                }`}                onClick={() => {                  if (onSubmit && typeof onSubmit === 'function') {                    
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
                ) : (                  currentPatient ? 'Schedule Appointment' : 'Schedule Appointment'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
