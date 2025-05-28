/**
 * Unified Appointment Integration System
 * 
 * This utility provides a central system for handling appointments across all components,
 * ensuring consistent data structures and proper display of appointments for recipients,
 * donors, and doctors.
 */
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';

/**
 * Gets appointments for a specific user across all collections
 * @param {string} userId - User ID to fetch appointments for
 * @param {string} userType - Type of user ('recipient', 'donor', or 'doctor')
 * @returns {Promise<Array>} Array of standardized appointment objects
 */
export const getAppointmentsForUser = async (userId, userType = 'recipient') => {
  if (!userId) {
    console.error("No userId provided to getAppointmentsForUser");
    return [];
  }

  console.log(`Getting ${userType} appointments for user ${userId}`);
  
  // Define collections to search based on user type
  let collectionsToSearch = [];
  
  if (userType === 'doctor') {
    // Doctors need to see all appointments they've created
    collectionsToSearch = [
      "recipientAppointments", 
      "donorAppointments", 
      "appointments",
      "doctorScheduledAppointments"
    ];  } else {
    // Recipients and donors primarily check their specific collections
    // and the general appointments collection
    collectionsToSearch = [
      `${userType}Appointments`,
      "appointments",
      "doctorScheduledAppointments"  // Always check doctor-scheduled appointments
    ];
    
    // Also check the other type's collection in case of misplaced appointments
    if (userType === 'recipient') {
      collectionsToSearch.push("donorAppointments");
    } else {
      collectionsToSearch.push("recipientAppointments");
    }
  }
  
  // Prepare query fields based on user type
  const queryFields = userType === 'doctor' 
    ? ['doctorId'] 
    : [`${userType}Id`, 'patientId', 'userId', 'patientUid'];
    
  let allAppointments = [];
  
  // Fetch appointments from each collection
  for (const collectionName of collectionsToSearch) {
    try {
      for (const field of queryFields) {
        const queryRef = query(
          collection(db, collectionName),
          where(field, "==", userId)
        );
        
        const snapshot = await getDocs(queryRef);
        
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            allAppointments.push({
              id: doc.id,
              ...doc.data(),
              _sourceCollection: collectionName
            });
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching from ${collectionName}:`, error);
    }
  }
  
  // Process and standardize appointment data
  const standardizedAppointments = await Promise.all(
    allAppointments.map(async appointment => {
      // Standardize date format
      let appointmentDate = new Date();
      if (appointment.date) {
        try {
          if (typeof appointment.date.toDate === 'function') {
            appointmentDate = appointment.date.toDate();
          } else if (appointment.date instanceof Date) {
            appointmentDate = appointment.date;
          } else if (typeof appointment.date === 'string') {
            appointmentDate = new Date(appointment.date);
          } else if (typeof appointment.date.seconds === 'number') {
            appointmentDate = new Date(appointment.date.seconds * 1000);
          } else if (appointment.date._seconds) {
            appointmentDate = new Date(appointment.date._seconds * 1000);
          }
        } catch (error) {
          console.warn("Date conversion error:", error);
        }
      }
      
      // Get doctor information if missing
      let doctorName = appointment.doctorName || "Unknown Doctor";
      let hospitalName = appointment.hospitalName || "Unknown Hospital";
      
      if (appointment.doctorId && !appointment.doctorName) {
        try {
          const doctorRef = doc(db, "users", appointment.doctorId);
          const doctorSnap = await getDoc(doctorRef);
          
          if (doctorSnap.exists()) {
            const doctorData = doctorSnap.data();
            doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
            if (doctorName === "Dr. ") {
              doctorName = "Dr. " + (doctorData.displayName || "Unknown");
            }
            
            // Get hospital information
            const hospitalsRef = collection(db, "hospitals");
            const hospitalQuery = query(hospitalsRef, 
              where("userId", "==", appointment.doctorId)
            );
            const hospitalSnapshot = await getDocs(hospitalQuery);
            
            if (!hospitalSnapshot.empty) {
              hospitalName = hospitalSnapshot.docs[0].data().name || "Unknown Hospital";
            }
          }
        } catch (err) {
          console.error("Error fetching doctor info:", err);
        }
      }
      
      // Determine appointment type
      const appointmentType = 
        appointment.type || 
        appointment.appointmentType || 
        appointment.patientType ||
        ((appointment.appointmentFor === 'recipient' || 
         appointment.forPatientType === 'recipient') ? 'recipient' : 
         (appointment.recipientId ? 'recipient' : 'donor'));
      
      // Get appointment purpose
      const appointmentPurpose = 
        appointment.purpose || 
        appointment.description || 
        appointment.reason || 
        (appointment.organType ? 
          `${appointment.organType} Transplant Consultation` : 
          'Medical Checkup');
      
      return {
        ...appointment,
        date: appointmentDate,
        doctorName,
        hospitalName,
        status: appointment.status || 'scheduled',
        type: appointmentType,
        appointmentType: appointmentPurpose,
        // Ensure these fields exist for component compatibility
        recipientId: appointment.recipientId || (appointmentType === 'recipient' ? userId : null),
        donorId: appointment.donorId || (appointmentType === 'donor' ? userId : null),
        patientId: appointment.patientId || userId,
        userId: appointment.userId || userId
      };
    })
  );
  
  // Filter out duplicates by appointment ID
  const uniqueAppointmentIds = new Set();
  const uniqueAppointments = standardizedAppointments.filter(apt => {
    if (!apt || !(apt.date instanceof Date) || isNaN(apt.date) || uniqueAppointmentIds.has(apt.id)) {
      return false;
    }
    uniqueAppointmentIds.add(apt.id);
    return true;
  });
  
  // Sort appointments by date (newest first)
  return uniqueAppointments.sort((a, b) => b.date - a.date);
};

/**
 * Creates an appointment with consistent field structure
 * @param {Object} appointmentData - Appointment data
 * @param {string} patientType - Type of patient ('recipient' or 'donor')
 * @returns {Promise<Object>} Created appointment info
 */
export const createAppointment = async (appointmentData, patientType = 'recipient') => {
  try {
    if (!appointmentData) {
      throw new Error('Appointment data is required');
    }

    // Ensure we have the required fields
    if (!appointmentData.doctorId) {
      throw new Error('Doctor ID is required for appointments');
    }

    // Determine the collection name based on patient type
    const collectionName = patientType === 'donor' ? 'donorAppointments' : 'recipientAppointments';
    
    // Make sure we have the right type flags set
    const enhancedAppointmentData = {
      ...appointmentData,
      type: patientType,
      patientType: patientType,
      appointmentType: appointmentData.appointmentType || patientType,
      appointmentFor: patientType,
      createdAt: Timestamp.now()
    };

    // Add to the appropriate collection
    const appointmentRef = await addDoc(collection(db, collectionName), enhancedAppointmentData);
    
    // If we have a patient ID, update their record to include this appointment
    const patientId = appointmentData.patientId || appointmentData[`${patientType}Id`];
    if (patientId) {
      // Get the reference to the patient document
      const patientCollection = patientType === 'donor' ? 'medicalRecords' : 'recipients';
      const patientRef = doc(db, patientCollection, patientId);
      const patientSnap = await getDoc(patientRef);
      
      if (patientSnap.exists()) {
        const patientData = patientSnap.data();
        const appointmentIds = patientData.appointmentIds || [];
        
        // Update the patient record
        await updateDoc(patientRef, {
          appointmentIds: [...appointmentIds, appointmentRef.id],
          appointmentScheduled: true,
          appointmentDate: appointmentData.date,
          appointmentTime: appointmentData.time,
          updatedAt: Timestamp.now()
        });
      }
    }    // If this is a donor appointment, check if we need to start medical evaluation
    if (patientType === 'donor' && patientId) {
      try {
        // Check donor status to see if we should start medical evaluation
        const donorRef = doc(db, 'donors', patientId);
        const donorSnap = await getDoc(donorRef);
        
        if (donorSnap.exists()) {
          const donorData = donorSnap.data();
          const donorStatus = donorData.requestStatus || donorData.status;
          
          // If donor is initially approved, start medical evaluation
          if (donorStatus === 'initially-approved' || donorStatus === 'INITIALLY_APPROVED') {
            const { startMedicalEvaluation } = await import('./appointmentFunctions.js');
            await startMedicalEvaluation(patientId, appointmentRef.id);
            console.log(`Started medical evaluation for initially approved donor ${patientId}`);
          }
        }
      } catch (evalError) {
        console.error('Error starting medical evaluation:', evalError);
        // Don't fail the appointment creation if evaluation update fails
      }
    }

    console.log(`Successfully created ${patientType} appointment with ID: ${appointmentRef.id}`);
    return {
      success: true,
      appointmentId: appointmentRef.id
    };
    
  } catch (error) {
    console.error(`Error creating ${patientType} appointment:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Updates an appointment with consistent field structure
 * @param {string} appointmentId - ID of appointment to update
 * @param {string} sourceCollection - Collection the appointment is in
 * @param {Object} updatedData - New appointment data
 * @returns {Promise<Object>} Update result
 */
export const updateAppointmentData = async (appointmentId, sourceCollection, updatedData) => {
  try {
    if (!appointmentId || !sourceCollection) {
      return { success: false, error: "Missing required data" };
    }
    
    // Update the appointment
    await updateDoc(doc(db, sourceCollection, appointmentId), updatedData);
    
    return { 
      success: true,
      message: `Successfully updated appointment` 
    };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Moves an appointment from one collection to another
 * @param {string} appointmentId - ID of appointment to move
 * @param {string} sourceCollection - Source collection
 * @param {string} targetCollection - Target collection
 * @returns {Promise<Object>} Move result
 */
export const moveAppointment = async (appointmentId, sourceCollection, targetCollection) => {
  try {
    if (!appointmentId || !sourceCollection || !targetCollection) {
      return { success: false, error: "Missing required data" };
    }
    
    // Get the appointment data
    const appointmentRef = doc(db, sourceCollection, appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (!appointmentSnap.exists()) {
      return { success: false, error: "Appointment not found" };
    }
    
    // Copy to target collection
    const appointmentData = appointmentSnap.data();
    const newRef = await addDoc(collection(db, targetCollection), appointmentData);
    
    // Delete from source collection
    await deleteDoc(appointmentRef);
    
    return { 
      success: true,
      oldId: appointmentId,
      newId: newRef.id,
      message: `Successfully moved appointment from ${sourceCollection} to ${targetCollection}` 
    };
  } catch (error) {
    console.error("Error moving appointment:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Gets all appointments for a specific user type (recipient, donor, doctor)
 * Used for admin/doctor views or when we need all appointments of a certain type
 * @param {string} userType - Type of user ('recipient', 'donor', or 'doctor')
 * @returns {Promise<Array>} Array of standardized appointment objects
 */
export const getAllAppointmentsByType = async (userType = 'recipient') => {
  try {
    console.log(`Getting all appointments for type: ${userType}`);
    
    // Determine which collection to query based on userType
    const collectionName = `${userType}Appointments`;
    
    // Get all appointments from the appropriate collection
    const appointmentsRef = collection(db, collectionName);
    const querySnapshot = await getDocs(appointmentsRef);
    
    // Process each appointment
    const appointments = [];
    
    for (const doc of querySnapshot.docs) {
      const appointmentData = doc.data();
      
      // Convert date to standard format if needed
      let appointmentDate = appointmentData.date;
      if (appointmentData.date && typeof appointmentData.date.toDate === 'function') {
        appointmentDate = appointmentData.date.toDate();
      }
      
      // Add to appointments array
      appointments.push({
        id: doc.id,
        ...appointmentData,
        date: appointmentDate,
        doctorName: appointmentData.doctorName || "Unknown Doctor",
        hospitalName: appointmentData.hospitalName || "Unknown Hospital",
        status: appointmentData.status || 'scheduled',
        type: userType
      });
    }
    
    return appointments;
  } catch (error) {
    console.error(`Error fetching ${userType} appointments:`, error);
    return [];
  }
};
