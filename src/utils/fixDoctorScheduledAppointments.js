/**
 * Utility for debugging and fixing doctor-scheduled appointments
 * This is specifically to help with appointments scheduled by doctors
 * that may not be showing up correctly for recipients
 */
import { auth, db } from '../firebase';
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
  writeBatch, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Diagnoses issues with doctor-scheduled appointments
 * @param {string} userId - The ID of the doctor or recipient to check
 * @param {string} userType - Whether we're checking as 'doctor' or 'recipient'
 * @returns {Promise<Object>} Diagnostic results
 */
export const diagnoseDoctorScheduledAppointments = async (userId = null, userType = 'recipient') => {
  try {
    if (!auth.currentUser && !userId) {
      return {
        success: false,
        message: "Authentication required or user ID must be provided"
      };
    }
    
    const checkId = userId || auth.currentUser.uid;
    console.log(`Diagnosing doctor-scheduled appointments for ${userType} ${checkId}`);
    
    const diagnostics = {
      recipientAppointments: { count: 0, appointments: [] },
      donorAppointments: { count: 0, appointments: [] },
      appointments: { count: 0, appointments: [] },
      doctorScheduledAppointments: { count: 0, appointments: [] },
      summary: {}
    };
    
    // Build query based on user type
    const queryField = userType === 'doctor' ? 'doctorId' : 
                      (userType === 'recipient' ? 'recipientId' : 'donorId');
    
    // Check all collections for relevant appointments
    const collections = [
      "recipientAppointments", 
      "donorAppointments", 
      "appointments",
      "doctorScheduledAppointments"
    ];
    
    for (const collectionName of collections) {
      const q = query(collection(db, collectionName), where(queryField, "==", checkId));
      const snapshot = await getDocs(q);
      
      diagnostics[collectionName].count = snapshot.size;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        diagnostics[collectionName].appointments.push({
          id: doc.id,
          ...data,
          _sourceCollection: collectionName
        });
      });
    }
    
    // Calculate statistics
    let doctorCreatedCount = 0;
    let recipientCount = 0;
    let donorCount = 0;
    let properlyStoredCount = 0;
    let misplacedCount = 0;
    
    // Process all appointments to gather statistics
    const allAppointments = [
      ...diagnostics.recipientAppointments.appointments,
      ...diagnostics.donorAppointments.appointments,
      ...diagnostics.appointments.appointments,
      ...diagnostics.doctorScheduledAppointments.appointments
    ];
    
    allAppointments.forEach(apt => {
      // Is it doctor created?
      if (apt.doctorId) doctorCreatedCount++;
      
      // What type of appointment?
      if (apt.patientType === 'recipient' || apt.type === 'recipient') recipientCount++;
      else if (apt.patientType === 'donor' || apt.type === 'donor') donorCount++;
      
      // Is it in the proper collection?
      const isRecipient = apt.recipientId || apt.patientType === 'recipient' || apt.type === 'recipient';
      const isDonor = apt.donorId || apt.patientType === 'donor' || apt.type === 'donor';
      
      if (apt._sourceCollection === 'doctorScheduledAppointments' && apt.doctorId) {
        properlyStoredCount++;
      } else if (apt._sourceCollection === 'recipientAppointments' && isRecipient && !apt.doctorId) {
        properlyStoredCount++;
      } else if (apt._sourceCollection === 'donorAppointments' && isDonor && !apt.doctorId) {
        properlyStoredCount++;
      } else {
        misplacedCount++;
      }
    });
    
    diagnostics.summary = {
      totalAppointments: allAppointments.length,
      doctorCreated: doctorCreatedCount,
      recipientAppointments: recipientCount,
      donorAppointments: donorCount,
      properlyStored: properlyStoredCount,
      misplaced: misplacedCount
    };
    
    return {
      success: true,
      diagnostics
    };
  } catch (error) {
    console.error("Error diagnosing doctor-scheduled appointments:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fixes doctor-scheduled appointments by ensuring they're all properly stored
 * @param {string} userId - The ID of the doctor or recipient
 * @param {string} userType - Whether we're fixing as 'doctor' or 'recipient'
 * @returns {Promise<Object>} Fix results
 */
export const fixDoctorScheduledAppointments = async (userId = null, userType = 'recipient') => {
  try {
    if (!auth.currentUser && !userId) {
      return {
        success: false,
        message: "Authentication required or user ID must be provided"
      };
    }
    
    const checkId = userId || auth.currentUser.uid;
    console.log(`Fixing doctor-scheduled appointments for ${userType} ${checkId}`);
    
    // First run diagnostics
    const { diagnostics } = await diagnoseDoctorScheduledAppointments(checkId, userType);
    
    let fixed = 0;
    let deleted = 0;
    let errors = 0;
    
    // Helper to check if appointment already exists in a collection
    const appointmentExists = async (collection, appointmentData) => {
      // Check for matching date, doctor, and patient
      const q = query(
        collection(db, collection),
        where("doctorId", "==", appointmentData.doctorId),
        where("patientId", "==", appointmentData.patientId || appointmentData.recipientId || appointmentData.donorId)
      );
      
      const snapshot = await getDocs(q);
      
      // Check each result to see if dates match closely
      for (const doc of snapshot.docs) {
        const existingData = doc.data();
        
        // Check date equality
        if (existingData.date && appointmentData.date) {
          let existingDate = existingData.date;
          let newDate = appointmentData.date;
          
          // Convert to timestamps if needed
          if (typeof existingDate.toDate === 'function') {
            existingDate = existingDate.toDate();
          } else if (typeof existingDate === 'object' && existingDate.seconds) {
            existingDate = new Date(existingDate.seconds * 1000);
          } else if (typeof existingDate === 'string') {
            existingDate = new Date(existingDate);
          }
          
          if (typeof newDate.toDate === 'function') {
            newDate = newDate.toDate();
          } else if (typeof newDate === 'object' && newDate.seconds) {
            newDate = new Date(newDate.seconds * 1000);
          } else if (typeof newDate === 'string') {
            newDate = new Date(newDate);
          }
          
          // Compare dates
          if (existingDate.getTime() === newDate.getTime()) {
            console.log("Found duplicate appointment");
            return true;
          }
        }
      }
      
      return false;
    };
    
    // 1. Fix doctor-created appointments that are in wrong collection
    const doctorCreatedAppointments = [
      ...diagnostics.recipientAppointments.appointments,
      ...diagnostics.donorAppointments.appointments,
      ...diagnostics.appointments.appointments
    ].filter(apt => apt.doctorId && apt._sourceCollection !== 'doctorScheduledAppointments');
    
    // Move doctor created appointments to doctorScheduledAppointments
    for (const apt of doctorCreatedAppointments) {
      try {
        // Skip if it already exists
        const exists = await appointmentExists('doctorScheduledAppointments', apt);
        if (exists) {
          console.log(`Appointment already exists in doctorScheduledAppointments, skipping`);
          continue;
        }
        
        // Remove fields we don't want to copy
        const { id, _sourceCollection, ...aptData } = apt;
        
        // Add doctorScheduled field
        aptData.doctorScheduled = true;
        
        // Add to doctorScheduledAppointments
        await addDoc(collection(db, "doctorScheduledAppointments"), aptData);
        fixed++;
        
        // Delete from original collection if requested
        if (userType === 'doctor') {
          await deleteDoc(doc(db, _sourceCollection, id));
          deleted++;
        }
      } catch (err) {
        console.error(`Error fixing appointment ${apt.id}:`, err);
        errors++;
      }
    }
    
    return {
      success: true,
      message: `Fixed ${fixed} appointments (${deleted} duplicates removed)`,
      stats: {
        fixed,
        deleted,
        errors,
        doctorCreated: diagnostics.summary.doctorCreated,
        misplaced: diagnostics.summary.misplaced
      }
    };
  } catch (error) {
    console.error("Error fixing doctor-scheduled appointments:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  diagnoseDoctorScheduledAppointments,
  fixDoctorScheduledAppointments
};