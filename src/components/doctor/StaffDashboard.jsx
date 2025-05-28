import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useLocation } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import AppointmentList from '../appointments/AppointmentList';
import AppointmentForm from '../appointments/AppointmentForm';
import DoctorAppointmentForm from './DoctorAppointmentForm';
import RescheduleModal from '../appointments/RescheduleModal';
import { sanitizeObject, safeRenderValue } from '../../utils/safeRendering';
import { processSafeAppointmentList } from '../../utils/appointmentSafetyUtils';
import { createNotification } from '../../utils/NotificationSystem';

import {
  createDonorAppointment,
  createRecipientAppointment,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  getAllDoctors,
  getDoctorAppointments
} from '../../utils/appointmentFunctions';

// Component for staff to manage all appointments
const StaffDashboard = function() {
  // State for showing reschedule modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  
  // Function to fetch all approved donors
  const fetchDonorsData = async () => {
    try {
      const donorsRef = collection(db, "donors");
      const donorsQuery = query(donorsRef, where("status", "==", "approved"));
      const donorsSnapshot = await getDocs(donorsQuery);
      
      if (donorsSnapshot && donorsSnapshot.docs) {
        return donorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching donors:", error);
      return [];
    }
  };
  
  // Function to fetch all approved recipients
  const fetchRecipientsData = async () => {
    try {
      const recipientsRef = collection(db, "recipients");
      const recipientsQuery = query(recipientsRef, where("status", "==", "approved"));
      const recipientsSnapshot = await getDocs(recipientsQuery);
      
      if (recipientsSnapshot && recipientsSnapshot.docs) {
        return recipientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching recipients:", error);
      return [];
    }
  };
  
  // Function to enhance appointments with donor and recipient names
  const enhanceAppointmentsWithNames = (appointments, donorsData, recipientsData) => {
    if (!appointments || !Array.isArray(appointments)) return;
    
    console.log("Enhancing appointments with names:", appointments.length);
    
    const updatedAppointments = appointments.map(appointment => {
      if (!appointment) return appointment;
      
      // Create a new object to avoid modifying the original
      const enhancedAppointment = { ...appointment };
      
      // Ensure we have a proper type set
      if (!enhancedAppointment.type) {
        // Try to determine type from IDs
        if (enhancedAppointment.donorId && !enhancedAppointment.recipientId) {
          enhancedAppointment.type = 'donor';
        } else if (enhancedAppointment.recipientId && !enhancedAppointment.donorId) {
          enhancedAppointment.type = 'recipient';
        }
      }
      
      // Only add donor name if it's explicitly a donor appointment
      if (enhancedAppointment.type === 'donor' && enhancedAppointment.donorId) {
        const matchingDonor = donorsData.find(d => d.id === enhancedAppointment.donorId);
        if (matchingDonor) {
          enhancedAppointment.patientName = getDonorName(matchingDonor);
          // Explicitly remove any recipient properties to prevent confusion
          delete enhancedAppointment.recipientId;
          delete enhancedAppointment.recipientName;
          // Cache the name in the donor object for faster lookups later
          matchingDonor._cachedName = enhancedAppointment.patientName;
        }
      }
      
      // Only add recipient name if it's explicitly a recipient appointment
      if (enhancedAppointment.type === 'recipient' && enhancedAppointment.recipientId) {
        const matchingRecipient = recipientsData.find(r => r.id === enhancedAppointment.recipientId);
        if (matchingRecipient) {
          enhancedAppointment.patientName = getRecipientName(matchingRecipient);
          // Explicitly remove any donor properties to prevent confusion
          delete enhancedAppointment.donorId;
          delete enhancedAppointment.donorName;
          // Cache the name in the recipient object for faster lookups later
          matchingRecipient._cachedName = enhancedAppointment.patientName;
        }
      }
      
      console.log(`Enhanced appointment ${enhancedAppointment.id}: type=${enhancedAppointment.type}, patientName=${enhancedAppointment.patientName}`);
      
      return enhancedAppointment;
    });
    
    // Update the appointments state with enhanced data
    setAppointments(updatedAppointments);
  };
  
  const { user } = useContext(UserContext);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const patientType = queryParams.get('type');
  const patientId = queryParams.get('id');
  
  // State management
  const [activeTab, setActiveTab] = useState(patientType || 'donor'); // 'donor' or 'recipient'
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [donors, setDonors] = useState({ approved: [] });
  const [recipients, setRecipients] = useState({ approved: [] });
  const [existingAppointments, setExistingAppointments] = useState([]);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });
  
  // Enhanced utility function to get donor names
  const getDonorName = (donor) => {
    if (!donor) return "Unknown Donor";
    
    // Direct debug to see what we're working with
    console.log("getDonorName called with:", donor);
    
    // Check if donor ID exists and log it
    if (donor.id) {
      console.log(`Processing donor with ID: ${donor.id}`);
    } else {
      console.log("Warning: Donor object has no ID");
    }
    
    // Check if this donor already has a cached name from previous lookups
    if (donor._cachedName && donor._cachedName.trim()) {
      console.log(`Using cached name: ${donor._cachedName}`);
      return donor._cachedName;
    }
    
    // Try various name fields that might exist in different data structures
    if (donor.fullName && donor.fullName.trim()) return donor.fullName;
    
    // Try first/last name combination
    if (donor.firstName || donor.lastName) {
      const name = `${donor.firstName || ''} ${donor.lastName || ''}`.trim();
      if (name) return name;
    }
    
    // Try alternate name fields
    if (donor.name && donor.name.trim()) return donor.name;
    if (donor.donorName && donor.donorName.trim()) return donor.donorName;
    if (donor.displayName && donor.displayName.trim()) return donor.displayName;
    if (donor.patientName && donor.patientName.trim()) return donor.patientName;
    
    // Try nested objects
    if (donor.userData) {
      if (donor.userData.fullName) return donor.userData.fullName;
      if (donor.userData.name) return donor.userData.name;
      if (donor.userData.displayName) return donor.userData.displayName;
      if (donor.userData.firstName || donor.userData.lastName) {
        return `${donor.userData.firstName || ''} ${donor.userData.lastName || ''}`.trim();
      }
      if (donor.userData.email) return donor.userData.email;
    }
    
    if (donor.formData) {
      if (donor.formData.fullName) return donor.formData.fullName;
      if (donor.formData.name) return donor.formData.name;
    }
    
    if (donor.donorDetails) {
      if (donor.donorDetails.fullName) return donor.donorDetails.fullName;
      if (donor.donorDetails.name) return donor.donorDetails.name;
      if (donor.donorDetails.firstName || donor.donorDetails.lastName) {
        return `${donor.donorDetails.firstName || ''} ${donor.donorDetails.lastName || ''}`.trim();
      }
    }
    
    // Try data property which might exist in some database formats
    if (donor.data) {
      if (donor.data.fullName) return donor.data.fullName;
      if (donor.data.name) return donor.data.name;
      if (donor.data.firstName || donor.data.lastName) {
        return `${donor.data.firstName || ''} ${donor.data.lastName || ''}`.trim();
      }
    }
    
    // Use email as last resort for identified user
    if (donor.email) return donor.email;
    if (donor.contactEmail) return donor.contactEmail;
    
    // Check if we have donorId in the object and it's different from id
    if (donor.donorId && donor.donorId !== donor.id) {
      return `Donor #${donor.donorId.substring(0, 6)}`;
    }
    
    // If we still don't have a name but have an ID, use a formatted ID
    if (donor.id) {
      return `Donor #${donor.id.substring(0, 6)}`;
    }
    
    // Absolute last resort
    return "Donor";
  };
    // Enhanced utility function to get recipient name
  const getRecipientName = (recipient) => {
    if (!recipient) return "Unknown Recipient";
    
    // Handle the case when recipient is just a string ID
    if (typeof recipient === 'string') {
      return `Recipient #${recipient.substring(0, 6)}`;
    }
    
    // Handle case where recipient might be a primitive value
    if (typeof recipient !== 'object' || recipient === null) {
      return "Unknown Recipient";
    }
    
    // Direct debug to see what we're working with
    console.log("getRecipientName called with:", recipient);
    
    // Check if recipient ID exists and log it
    if (recipient.id) {
      console.log(`Processing recipient with ID: ${recipient.id}`);
    } else {
      console.log("Warning: Recipient object has no ID");
    }
    
    // Check if this recipient already has a cached name from previous lookups
    if (recipient._cachedName && recipient._cachedName.trim()) {
      console.log(`Using cached name: ${recipient._cachedName}`);
      return recipient._cachedName;
    }
    
    // Try various name fields that might exist in different data structures
    if (recipient.fullName && recipient.fullName.trim()) return recipient.fullName;
    
    // Try first/last name combination
    if (recipient.firstName || recipient.lastName) {
      const name = `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim();
      if (name) return name;
    }
    
    // Try alternate name fields
    if (recipient.name && recipient.name.trim()) return recipient.name;
    if (recipient.recipientName && recipient.recipientName.trim()) return recipient.recipientName;
    if (recipient.displayName && recipient.displayName.trim()) return recipient.displayName;
    if (recipient.patientName && recipient.patientName.trim()) return recipient.patientName;
    
    // Try nested objects
    if (recipient.userData) {
      if (recipient.userData.fullName) return recipient.userData.fullName;
      if (recipient.userData.name) return recipient.userData.name;
      if (recipient.userData.displayName) return recipient.userData.displayName;
      if (recipient.userData.firstName || recipient.userData.lastName) {
        return `${recipient.userData.firstName || ''} ${recipient.userData.lastName || ''}`.trim();
      }
      if (recipient.userData.email) return recipient.userData.email;
    }
    
    // Check recipient details
    if (recipient.recipientDetails) {
      if (recipient.recipientDetails.fullName) return recipient.recipientDetails.fullName;
      if (recipient.recipientDetails.name) return recipient.recipientDetails.name;
      if (recipient.recipientDetails.firstName || recipient.recipientDetails.lastName) {
        return `${recipient.recipientDetails.firstName || ''} ${recipient.recipientDetails.lastName || ''}`.trim();
      }
    }
    
    // Try data property which might exist in some database formats
    if (recipient.data) {
      if (recipient.data.fullName) return recipient.data.fullName;
      if (recipient.data.name) return recipient.data.name;
      if (recipient.data.firstName || recipient.data.lastName) {
        return `${recipient.data.firstName || ''} ${recipient.data.lastName || ''}`.trim();
      }
    }
    
    // Use email or contact info as last resort for identified user
    if (recipient.email) return recipient.email;
    if (recipient.contactEmail) return recipient.contactEmail;
    if (recipient.contactNumber) return `Recipient (${recipient.contactNumber})`;
    
    // Check if we have recipientId in the object and it's different from id
    if (recipient.recipientId && recipient.recipientId !== recipient.id) {
      return `Recipient #${recipient.recipientId.substring(0, 6)}`;
    }
    
    // If we still don't have a name but have an ID, use a formatted ID
    if (recipient.id) {
      return `Recipient #${recipient.id.substring(0, 6)}`;
    }
    
    // Absolute last resort
    return "Recipient";
  };
  
  // Fetch appointments, doctors, donors, and recipients  
  useEffect(function() {
    const fetchData = async function() {
      setLoading(true);
      setError(null);
      
      console.log("Fetching appointments for tab:", activeTab);
      
      try {
        // First check if user exists and has UID
        if (!user || !user.uid) {
          console.error("No user found or user missing UID");
          setError("User authentication error. Please log in again.");
          setLoading(false);
          return;
        }        
        // Use async/await for better error handling
        try {
          // Fetch appointments for the doctor
          const appointmentsData = await getDoctorAppointments(user.uid);
          console.log("Appointments fetched:", appointmentsData?.length || 0);
          
          if (!appointmentsData || !Array.isArray(appointmentsData)) {
            console.error("Invalid appointments data returned:", appointmentsData);
            setError("Received invalid appointment data. Please try again.");
            setLoading(false);
            return;
          }
          
          // Process appointments to ensure they're safe for React rendering
          const safeAppointments = processSafeAppointmentList(appointmentsData);
          console.log("Processed safe appointments:", safeAppointments.length);
          
          // Set appointments first to avoid processing delays
          setAppointments(safeAppointments);
          
          // Then fetch donors and recipients in parallel to minimize wait time
          Promise.all([
            fetchDonorsData(),
            fetchRecipientsData()
          ]).then(([donorsData, recipientsData]) => {
            setDonors({ approved: donorsData || [] });
            setRecipients({ approved: recipientsData || [] });
            
            // Then enhance appointments with donor/recipient names
            enhanceAppointmentsWithNames(safeAppointments, donorsData || [], recipientsData || []);
          }).catch(error => {
            console.error("Error fetching patient data:", error);
          });
          
          setLoading(false);
        } catch (fetchError) {
          console.error("Error in appointment fetch:", fetchError);
          setError(`Failed to load appointments: ${fetchError.message}`);
          setLoading(false);
        }
          
        // Fetch doctors for the appointment form
        try {
          const doctorsData = await getAllDoctors();
          if (doctorsData && Array.isArray(doctorsData)) {
            setDoctors(doctorsData);
          } else {
            console.error("Invalid doctors data:", doctorsData);
          }
        } catch (doctorsError) {
          console.error("Error fetching doctors:", doctorsError);
          // Don't set main error - this is secondary data
        }
          
        // Fetch donors and recipients for the appointment modal
        try {
          // Fetch donors
          const donorsRef = collection(db, "donors");
          const donorsQuery = query(donorsRef, where("status", "==", "approved"));
          const donorsSnapshot = await getDocs(donorsQuery);
          
          if (donorsSnapshot && donorsSnapshot.docs) {
            const donorsData = donorsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setDonors({ approved: donorsData });
          }
          
          // Fetch recipients
          const recipientsRef = collection(db, "recipients");
          const recipientsQuery = query(recipientsRef, where("status", "==", "approved"));
          const recipientsSnapshot = await getDocs(recipientsQuery);
          
          if (recipientsSnapshot && recipientsSnapshot.docs) {
            const recipientsData = recipientsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setRecipients({ approved: recipientsData });
          }
        } catch (patientsError) {
          console.error("Error fetching donors and recipients:", patientsError);
          // Don't set main error - this is secondary data
        }
      } catch (mainError) {
        console.error("Fatal error in fetchData:", mainError);
        setError(`An unexpected error occurred: ${mainError.message}`);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, activeTab]);
  
  // Filter appointments when tab changes or patient ID is provided
  useEffect(function() {
    if (appointments.length > 0) {
      console.log("Filtering appointments for tab:", activeTab);
      
      // First filter by tab/type - check both type and patientType fields to ensure we catch all appointments
      let filtered = appointments.filter(function(appointment) {
        // Ensure we're working with valid appointment objects
        if (!appointment) return false;
        
        // Get the effective patient type from multiple possible fields
        const effectiveType = appointment.type || appointment.patientType || 
                             (appointment.donorId ? 'donor' : 
                             (appointment.recipientId ? 'recipient' : null));
        
        // Match against active tab
        return effectiveType === activeTab;
      });
      
      console.log("Active tab:", activeTab, "- Filtered appointments:", filtered.length);
      
      // If patient ID is provided, filter further
      if (patientId) {
        filtered = filtered.filter(function(appointment) {
          if (activeTab === 'donor') {
            return appointment.donorId === patientId;
          } else {
            return appointment.recipientId === patientId;
          }
        });
        
        console.log("Further filtered by patient ID:", patientId, "- Results:", filtered.length);
        
        // Only auto-select appointment if:
        // 1. There are appointments for this patient
        // 2. No appointment is currently selected
        // 3. This is the initial load (track with a ref)
        if (filtered.length > 0 && !selectedAppointment && location.search.includes('id=')) {
          // Only auto-select when coming from a direct link with patient ID
          setSelectedAppointment(filtered[0]);
        }
      }
      
      setFilteredAppointments(filtered);
    }
  }, [appointments, activeTab, patientId, selectedAppointment, location.search, donors.approved, recipients.approved]);
  
  // Handle creating a new appointment
  const handleCreateAppointment = function(appointmentData) {
    // Make sure we have a proper object with required properties
    if (!appointmentData || typeof appointmentData !== 'object') {
      console.error('Invalid appointment data:', appointmentData);
      toast.error('Invalid appointment data');
      return;
    }
    
    try {
      setLoading(true);
      
      // Extract purpose from appointmentData if it exists
      const purpose = typeof appointmentData.purpose === 'object' 
        ? safeRenderValue(appointmentData.purpose) 
        : appointmentData.purpose || 'Medical Consultation';
      
      console.log("Using purpose:", purpose);
      
      // Ensure the appointmentData has a safe purpose value and add doctor info
      const safeAppointmentData = {
        ...appointmentData,
        purpose: purpose,
        doctorId: user.uid,
        doctorName: user.firstName && user.lastName 
          ? `Dr. ${user.firstName} ${user.lastName}` 
          : user.displayName 
            ? `Dr. ${user.displayName}` 
            : "Dr. Unknown"
      };
      
      // Format date for notification message
      const appointmentDate = new Date(appointmentData.date);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      const formattedTime = appointmentData.time || "scheduled time";
      
      let createPromise;
      let patientId;
      
      if (activeTab === 'donor') {
        patientId = appointmentData.donorId || appointmentData.patientId;
        
        createPromise = createDonorAppointment(safeAppointmentData)
          .then(function(appointmentId) {
            toast.success('Donor appointment scheduled successfully!');
            
            // Send notification to the donor
            if (patientId) {
              // Create notification for the donor
              createNotification(
                patientId, 
                'New Appointment Scheduled', 
                `You have a new donation appointment scheduled for ${formattedDate} at ${formattedTime}. Purpose: ${purpose}.`,
                'appointment'
              ).catch(err => console.error('Error sending notification:', err));
            }
            
            return appointmentId;
          });
      } else {
        patientId = appointmentData.recipientId || appointmentData.patientId;
        
        createPromise = createRecipientAppointment(safeAppointmentData)
          .then(function(appointmentId) {
            toast.success('Recipient appointment scheduled successfully!');
            
            // Send notification to the recipient
            if (patientId) {
              // Create notification for the recipient
              createNotification(
                patientId,
                'New Appointment Scheduled',
                `You have a new transplant appointment scheduled for ${formattedDate} at ${formattedTime}. Purpose: ${purpose}.`,
                'appointment'
              ).catch(err => console.error('Error sending notification:', err));
            }
            
            return appointmentId;
          });
      }
      
      createPromise.then(function() {
        setShowForm(false);
        
        // Refresh appointments
        return getDoctorAppointments(user.uid);
      }).then(function(appointmentsData) {
        setAppointments(appointmentsData);
        setLoading(false);
      }).catch(function(err) {
        console.error('Error creating appointment:', err);
        toast.error('Failed to schedule appointment. Please try again.');
        setLoading(false);
      });
    } catch (err) {
      console.error('Error in handleCreateAppointment:', err);
      toast.error('Failed to schedule appointment. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle updating an existing appointment
  const handleUpdateAppointment = function(appointmentData) {
    try {
      setLoading(true);
      
      if (!selectedAppointment) {
        console.error('No appointment selected for update');
        toast.error('No appointment selected for update');
        setLoading(false);
        return;
      }
      
      updateAppointment(
        selectedAppointment.id,
        selectedAppointment.type,
        appointmentData
      ).then(function() {
        toast.success('Appointment updated successfully!');
        setShowForm(false);
        setIsEditing(false);
        setSelectedAppointment(null);
        
        // Refresh appointments
        return getDoctorAppointments(user.uid);
      }).then(function(appointmentsData) {
        setAppointments(appointmentsData);
        setLoading(false);
      }).catch(function(err) {
        console.error('Error updating appointment:', err);
        toast.error('Failed to update appointment. Please try again.');
        setLoading(false);
      });
    } catch (err) {
      console.error('Error in handleUpdateAppointment:', err);
      toast.error('Failed to update appointment. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle cancelling an appointment
  const handleCancelAppointment = function(appointment) {
    try {
      if (window.confirm('Are you sure you want to cancel this appointment?')) {
        setLoading(true);
        
        cancelAppointment(appointment.id, appointment.type).then(function() {
          toast.info('Appointment cancelled successfully.');
          
          // Refresh appointments
          return getDoctorAppointments(user.uid);
        }).then(function(appointmentsData) {
          setAppointments(appointmentsData);
          setLoading(false);
        }).catch(function(err) {
          console.error('Error cancelling appointment:', err);
          toast.error('Failed to cancel appointment. Please try again.');
          setLoading(false);
        });
      }
    } catch (err) {
      console.error('Error in handleCancelAppointment:', err);
      toast.error('Failed to cancel appointment. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle completing an appointment
  const handleCompleteAppointment = function(appointment) {
    try {
      if (window.confirm('Are you sure you want to mark this appointment as completed?')) {
        setLoading(true);
        
        completeAppointment(appointment.id, appointment.type).then(function() {
          toast.success('Appointment marked as completed!');
          
          // Refresh appointments
          return getDoctorAppointments(user.uid);
        }).then(function(appointmentsData) {
          setAppointments(appointmentsData);
          setLoading(false);
        }).catch(function(err) {
          console.error('Error completing appointment:', err);
          toast.error('Failed to complete appointment. Please try again.');
          setLoading(false);
        });
      }
    } catch (err) {
      console.error('Error in handleCompleteAppointment:', err);
      toast.error('Failed to complete appointment. Please try again.');
      setLoading(false);
    }
  };
  
  const handleEditAppointment = function(appointment) {
    // First ensure any previously selected appointment is cleared
    setSelectedAppointment(null);
    
    // Create a deep copy of the appointment to avoid modifying the original
    const appointmentForEdit = JSON.parse(JSON.stringify(appointment));
    
    // Explicitly remove the isBeingViewed flag to ensure edit mode
    if ('isBeingViewed' in appointmentForEdit) {
      delete appointmentForEdit.isBeingViewed;
    }
    
    // Explicitly set isBeingEdited flag
    appointmentForEdit.isBeingEdited = true;
    
    console.log("Preparing appointment for editing:", appointmentForEdit);
    
    // Get the patient ID based on appointment type (donor or recipient)
    const patientId = appointmentForEdit.type === 'donor' 
      ? appointmentForEdit.donorId 
      : appointmentForEdit.recipientId;
      
    // Try to enhance the appointment with patient details if needed
    if (patientId && !appointmentForEdit.fullName) {
      if (appointmentForEdit.type === 'donor') {
        const donorsList = donors.approved || [];
        const matchingDonor = donorsList.find(d => d.id === patientId);
        
        if (matchingDonor) {
          console.log("Found matching donor for editing:", matchingDonor);
          // Add donor details to appointment
          Object.assign(appointmentForEdit, {
            fullName: matchingDonor.fullName || matchingDonor.name,
            bloodType: matchingDonor.bloodType || appointmentForEdit.bloodType,
            age: matchingDonor.age || appointmentForEdit.age,
            gender: matchingDonor.gender || appointmentForEdit.gender,
            contactNumber: matchingDonor.contactNumber || matchingDonor.phone || appointmentForEdit.contactNumber,
            email: matchingDonor.email || appointmentForEdit.email,
          });
        }
      } else {
        const recipientsList = recipients.approved || [];
        const matchingRecipient = recipientsList.find(r => r.id === patientId);
        
        if (matchingRecipient) {
          console.log("Found matching recipient for editing:", matchingRecipient);
          // Add recipient details to appointment
          Object.assign(appointmentForEdit, {
            fullName: matchingRecipient.fullName || matchingRecipient.name,
            bloodType: matchingRecipient.bloodType || appointmentForEdit.bloodType,
            age: matchingRecipient.age || appointmentForEdit.age,
            gender: matchingRecipient.gender || appointmentForEdit.gender,
            contactNumber: matchingRecipient.contactNumber || matchingRecipient.phone || appointmentForEdit.contactNumber,
            email: matchingRecipient.email || appointmentForEdit.email,
            organType: matchingRecipient.organType || appointmentForEdit.organType,
          });
        }
      }
    }
    
    setSelectedAppointment(appointmentForEdit);
    setIsEditing(true);
    setShowForm(true);
  };
  const handleRescheduleAppointment = (appointment) => {
    // Set the appointment to be rescheduled and show the reschedule modal
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  // Handle form submission (create or update)
  const handleSubmit = function(data) {
    // Make sure data is not directly rendered as React child anywhere
    console.log("Form submitted with data:", data);
    
    // Safely process incoming data - using our utility to prevent objects as React children
    let sanitizedData = sanitizeObject({});
    
    if (data === null || data === undefined) {
      console.error('No data received in handleSubmit');
      toast.error('No data provided for submission');
      return;
    }
    
    // If data is a string (like just a purpose value)
    if (typeof data === 'string') {
      sanitizedData = sanitizeObject({ purpose: data });
    } 
    // If data is an object
    else if (typeof data === 'object') {
      // Extract only primitive values or arrays that we need
      // This prevents objects from being passed directly to React components
      const tempData = {};
      
      // Always include purpose
      if (data.purpose) {
        if (typeof data.purpose === 'string') {
          tempData.purpose = data.purpose;
        } else {
          tempData.purpose = 'Medical Consultation'; // Default
        }
      }
      
      // Include patient ID
      if (data.patientId) {
        if (typeof data.patientId === 'string') {
          tempData.patientId = data.patientId;
        }
      }
      
      // Include type
      if (data.patientType) {
        if (typeof data.patientType === 'string') {
          tempData.type = data.patientType;
        } else {
          tempData.type = activeTab; // Default to activeTab
        }
      } else if (data.type) {
        if (typeof data.type === 'string') {
          tempData.type = data.type;
        } else {
          tempData.type = activeTab; // Default to activeTab
        }
      } else {
        tempData.type = activeTab; // Default
      }
      
      // Include other relevant fields if they exist and are primitives
      if (data.date) tempData.date = data.date;
      if (data.time) tempData.time = data.time;
      if (data.notes) tempData.notes = data.notes;
      if (data.doctorId) tempData.doctorId = data.doctorId;
      if (data.hospitalId) tempData.hospitalId = data.hospitalId;
      
      // If we're dealing with a donor or recipient
      if (activeTab === 'donor' && data.patientId) {
        tempData.donorId = data.patientId;
      } else if (activeTab === 'recipient' && data.patientId) {
        tempData.recipientId = data.patientId;
      }
      
      // Sanitize all data recursively to ensure it's safe for React rendering
      sanitizedData = sanitizeObject(tempData);
    }
    
    console.log("Sanitized data:", sanitizedData);
    
    // Process the data appropriately
    if (isEditing) {
      handleUpdateAppointment(sanitizedData);
    } else {
      handleCreateAppointment(sanitizedData);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
        <p className="text-gray-600 mt-2">
          Manage all donor and recipient appointments in one place
        </p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'donor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={function() { setActiveTab('donor'); }}
          >
            Donor Appointments
          </button>          <button
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'recipient'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={function() { setActiveTab('recipient'); }}
          >
            Recipient Appointments
          </button>
        </nav>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {activeTab === 'donor' ? 'Donor' : 'Recipient'} Appointments
          </h2>
        </div>
        
        <div className="flex space-x-3">
          {/* Schedule button removed as per requirement */}
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-blue-800">Upcoming</h3>
          <p className="text-3xl font-bold text-blue-600">
            {filteredAppointments.filter(function(a) { return a.status === 'scheduled'; }).length}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-green-800">Completed</h3>
          <p className="text-3xl font-bold text-green-600">
            {filteredAppointments.filter(function(a) { return a.status === 'completed'; }).length}
          </p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-red-800">Cancelled</h3>
          <p className="text-3xl font-bold text-red-600">
            {filteredAppointments.filter(function(a) { return a.status === 'cancelled'; }).length}
          </p>
        </div>
      </div>
      
      {/* Error message - Enhanced with more details and actions */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 mb-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Error Loading Appointments</h3>
          {/* Safe error rendering pattern */}
          {typeof error === 'string' ? (
            <p className="mb-3">{error}</p>
          ) : error instanceof Error ? (
            <p className="mb-3">{error.message || "An error occurred"}</p>
          ) : (
            <p className="mb-3">
              {error && typeof error === 'object' && error.message 
                ? error.message 
                : "An unexpected error occurred"}
            </p>
          )}
          
          {typeof error === 'string' && error.includes("requires an index") && (
            <div className="mt-4 bg-white p-4 rounded border border-red-200">
              <p className="font-medium mb-2">Firestore Index Required</p>
              <p className="text-sm mb-3">
                This error occurs because Firestore needs an index for the query. 
                Please follow these steps to fix it:
              </p>
              <ol className="list-decimal list-inside text-sm ml-2 space-y-1 mb-3">
                <li>Click the link in the error message</li>
                <li>Sign in to your Firebase console if prompted</li>
                <li>Click "Create Index" on the Firebase console page that opens</li>
                <li>Wait for the index to be created (typically 1-2 minutes)</li>
                <li>Return to this page and refresh</li>
              </ol>
              <button
                onClick={function() { window.location.reload(); }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2"
              >
                Retry After Creating Index
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center my-8">
          <div className="loader"></div>
        </div>
      )}
      
      {/* Appointment views */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <AppointmentList
            appointments={filteredAppointments}
            onEdit={handleEditAppointment}
            onCancel={handleCancelAppointment}
            onComplete={handleCompleteAppointment}
            onReschedule={handleRescheduleAppointment}
            userRole={user?.role || 'doctor'}
          />
        </div>
      )}
      
      {/* Appointment form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b px-6 py-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Edit Appointment' : `Schedule New ${activeTab === 'donor' ? 'Donor' : 'Recipient'} Appointment`}
              </h3>
              <button 
                onClick={function() { setShowForm(false); }}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isEditing ? (
                <AppointmentForm
                  onSubmit={handleSubmit}
                  initialData={selectedAppointment}
                  appointmentType={activeTab}
                  userRole={user?.role || 'doctor'}
                  userId={isEditing && selectedAppointment ? selectedAppointment[activeTab + 'Id'] : ''}
                />
              ) : (
                <DoctorAppointmentForm
                  onSubmit={handleSubmit}
                  appointmentType={activeTab}
                  onCancel={function() { setShowForm(false); }}
                />
              )}
            </div>
          </div>
        </div>      )}
      
      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          appointment={selectedAppointment}
          onSubmit={(rescheduleData) => {
            // Process and update the appointment with new schedule data
            const updatedAppointment = {
              ...selectedAppointment,
              date: rescheduleData.date,
              time: rescheduleData.time,
              purpose: rescheduleData.purpose
            };
            
            // Format date for notification
            const appointmentDate = new Date(rescheduleData.date);
            const formattedDate = appointmentDate.toLocaleDateString('en-US', {
              year: 'numeric', 
              month: 'long', 
              day: 'numeric'
            });
            const formattedTime = rescheduleData.time || "scheduled time";
            
            // Get patient ID based on appointment type
            const patientId = selectedAppointment.type === 'donor' 
              ? selectedAppointment.donorId 
              : selectedAppointment.recipientId;
            
            // Send notification to the patient about rescheduled appointment
            if (patientId) {
              createNotification(
                patientId,
                'Appointment Rescheduled',
                `Your appointment has been rescheduled to ${formattedDate} at ${formattedTime}. Purpose: ${rescheduleData.purpose || selectedAppointment.purpose}.`,
                'appointment'
              ).catch(err => console.error('Error sending notification:', err));
            }
            
            // Call the update function
            handleUpdateAppointment(updatedAppointment);
            setShowRescheduleModal(false);
          }}
        />
      )}
    </div>
  );
}
export default StaffDashboard;
