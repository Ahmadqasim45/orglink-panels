// filepath: g:\orglink-panels\src\components\doctor\AppointmentModal.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

// Import modular components
import AppointmentModalHeader from './appointment-modal/AppointmentModalHeader';
import DoctorInfoSection from './appointment-modal/DoctorInfoSection';
import PatientSelectionForm from './appointment-modal/PatientSelectionForm';
import PatientInfoDisplay from './appointment-modal/PatientInfoDisplay';
import AppointmentForm from './appointment-modal/AppointmentForm';
import AppointmentHistorySection from './appointment-modal/AppointmentHistorySection';
import DebugInfo from './appointment-modal/DebugInfo';
import ModalFooter from './appointment-modal/ModalFooter';

// Each modular component imports its own required utilities

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
  const [purpose, setPurpose] = useState("Medical Consultation");  const [doctorInfo, setDoctorInfo] = useState({ doctorName: "", hospitalName: "" });
  const [loadingDoctorInfo, setLoadingDoctorInfo] = useState(true);
  const [patientDetails, setPatientDetails] = useState(null);

  // Force close modal function
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

  // Handle clicks on the modal backdrop to close the modal
  const handleBackdropClick = (e) => {
    if (e.target === modalContainerRef.current) {
      forceCloseModal();
    }
  };

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
  };

  // Function to fetch all doctor and patient data
  const fetchAllData = useCallback(async () => {
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
      const doctorSnap = await getDoc(doctorRef);      
      if (doctorSnap.exists()) {
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
        }        
        
        // Fetch hospital information from the separate hospitals collection
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
        }
        
        // Update the doctor info state with the fetched values
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
      });    } finally {
      // Make sure to set loading to false in any case
      setLoadingDoctorInfo(false);
    }
  }, []);

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

  // Escape key handler effect
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
  }, [isOpen, forceCloseModal]);
  
  // Effect to fetch patient details when modal is opened
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
  }, [isOpen, currentPatient, currentPatientType, fetchAllData]);

  // Add an effect specifically to load doctor info when modal is open
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      console.log("Loading doctor info based on auth state for user:", auth.currentUser.uid);
      setLoadingDoctorInfo(true);
      
      // Add a slight delay to ensure the modal is properly initialized
      setTimeout(() => {
        fetchAllData();
      }, 100);
    }
  }, [isOpen, fetchAllData]);

  // Calculate patient options based on patient type
  const patientOptions = patientType === "donor" 
    ? donors?.approved || []
    : recipients?.approved || [];

  // Debug logging for each render
  console.log("RENDER - doctorInfo:", doctorInfo);
  console.log("RENDER - loadingDoctorInfo:", loadingDoctorInfo);
  console.log("RENDER - patientName:", currentPatient);
  
  // Early return if modal is not open
  if (!isOpen) return null;

  // Get appointment history from the current patient, if available
  const appointmentHistory = currentPatient?.appointments || [];

  // Create the modal with portal
  return createPortal(
    <div 
      ref={modalContainerRef}
      className="AppointmentModal-backdrop" 
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="AppointmentModal"
        tabIndex={-1}
      >
        {/* Modal Header */}
        <AppointmentModalHeader 
          currentPatient={currentPatient}
          patientName={patientName}
          currentPatientType={currentPatientType}
        />

        <div className="AppointmentModal-content">
          {/* Doctor Information Section */}
          <DoctorInfoSection 
            loadingDoctorInfo={loadingDoctorInfo} 
            doctorInfo={doctorInfo} 
          />

          {/* Patient Selection or Display */}
          {!currentPatient ? (
            <PatientSelectionForm
              patientType={patientType}
              selectedPatientId={selectedPatientId}
              setPatientType={setPatientType}
              setSelectedPatientId={setSelectedPatientId}
              patientOptions={patientOptions}
              getDonorName={getDonorName}
              getRecipientName={getRecipientName}
            />
          ) : (
            <PatientInfoDisplay
              currentPatient={currentPatient}
              currentPatientType={currentPatientType}
              patientName={patientName}
              patientDetails={patientDetails}
              scheduleData={scheduleData}
              purpose={purpose}
            />
          )}

          {/* Appointment Form */}
          <AppointmentForm
            scheduleData={scheduleData}
            setScheduleData={setScheduleData}
            purpose={purpose}
            setPurpose={setPurpose}
            currentPatient={currentPatient}
            existingAppointments={existingAppointments}
          />

          {/* Appointment History Section */}
          {currentPatient && (
            <AppointmentHistorySection 
              appointmentHistory={appointmentHistory} 
            />
          )}

          {/* Debug Information */}
          <DebugInfo
            patientName={patientName}
            currentPatientType={currentPatientType}
            currentPatient={currentPatient}
          />
        </div>
        
        {/* Modal Footer */}
        <ModalFooter
          currentPatient={currentPatient}
          forceCloseModal={forceCloseModal}
          onSubmit={onSubmit}
          actionInProgress={actionInProgress}
          scheduleData={scheduleData}
          selectedPatientId={selectedPatientId}
          purpose={purpose}
          patientType={patientType}
          currentPatientType={currentPatientType}
        />
      </div>
    </div>,
    document.body
  );
};

export default AppointmentModal;
