/**
 * Utility for testing and fixing recipient appointments
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
  writeBatch, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Diagnoses issues with recipient appointments
 * @returns {Promise<Object>} Diagnostic results
 */
export const diagnoseRecipientAppointments = async (recipientId = null) => {
  try {
    if (!auth.currentUser && !recipientId) {
      return {
        success: false,
        message: "Authentication required or recipient ID must be provided"
      };
    }
    
    const userId = recipientId || auth.currentUser.uid;
    console.log("Diagnosing recipient appointments for user:", userId);
      const diagnostics = {
      recipientAppointments: { count: 0, appointments: [] },
      donorAppointments: { count: 0, appointments: [] },
      appointments: { count: 0, appointments: [] },
      doctorScheduledAppointments: { count: 0, appointments: [] },
      userDocument: null
    };
    
    // Check recipientAppointments collection
    const recipientQuery = query(
      collection(db, "recipientAppointments"),
      where("recipientId", "==", userId)
    );
    const recipientSnapshot = await getDocs(recipientQuery);
    diagnostics.recipientAppointments.count = recipientSnapshot.size;
    
    recipientSnapshot.forEach(doc => {
      diagnostics.recipientAppointments.appointments.push({
        id: doc.id,
        ...doc.data(),
        _sourceCollection: "recipientAppointments"
      });
    });
    
    // Check donorAppointments collection for misplaced recipient appointments
    const donorQuery = query(
      collection(db, "donorAppointments"),
      where("recipientId", "==", userId)
    );
    const donorSnapshot = await getDocs(donorQuery);
    diagnostics.donorAppointments.count = donorSnapshot.size;
    
    donorSnapshot.forEach(doc => {
      diagnostics.donorAppointments.appointments.push({
        id: doc.id,
        ...doc.data(),
        _sourceCollection: "donorAppointments"
      });
    });
      // Check general appointments collection
    const generalQuery = query(
      collection(db, "appointments"),
      where("recipientId", "==", userId)
    );
    const generalSnapshot = await getDocs(generalQuery);
    diagnostics.appointments.count = generalSnapshot.size;
    
    generalSnapshot.forEach(doc => {
      diagnostics.appointments.appointments.push({
        id: doc.id,
        ...doc.data(),
        _sourceCollection: "appointments"
      });
    });
    
    // Check doctorScheduledAppointments collection
    const doctorScheduledQuery = query(
      collection(db, "doctorScheduledAppointments"),
      where("recipientId", "==", userId)
    );
    const doctorScheduledSnapshot = await getDocs(doctorScheduledQuery);
    diagnostics.doctorScheduledAppointments.count = doctorScheduledSnapshot.size;
    
    doctorScheduledSnapshot.forEach(doc => {
      diagnostics.doctorScheduledAppointments.appointments.push({
        id: doc.id,
        ...doc.data(),
        _sourceCollection: "doctorScheduledAppointments"
      });
    });
    
    // Try to get user document
    try {
      // Check both recipients and users collections
      const recipientDocSnap = await getDoc(doc(db, "recipients", userId));
      if (recipientDocSnap.exists()) {
        diagnostics.userDocument = {
          collection: "recipients",
          data: recipientDocSnap.data()
        };
      } else {
        const userDocSnap = await getDoc(doc(db, "users", userId));
        if (userDocSnap.exists()) {
          diagnostics.userDocument = {
            collection: "users",
            data: userDocSnap.data()
          };
        }
      }
    } catch (e) {
      console.error("Error fetching user document:", e);
    }
    
    return {
      success: true,
      diagnostics,      summary: {
        totalAppointments: 
          diagnostics.recipientAppointments.count + 
          diagnostics.donorAppointments.count + 
          diagnostics.appointments.count +
          diagnostics.doctorScheduledAppointments.count,
        misplacedAppointments: diagnostics.donorAppointments.count,
        correctAppointments: 
          diagnostics.recipientAppointments.count + 
          diagnostics.appointments.count +
          diagnostics.doctorScheduledAppointments.count
      }
    };
  } catch (error) {
    console.error("Error diagnosing recipient appointments:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fixes common issues with recipient appointments
 * @param {string} recipientId - ID of the recipient to fix appointments for
 * @returns {Promise<Object>} Result of the operation
 */
export const fixRecipientAppointments = async (recipientId = null) => {
  try {
    if (!auth.currentUser && !recipientId) {
      return {
        success: false,
        message: "Authentication required or recipient ID must be provided"
      };
    }
    
    const userId = recipientId || auth.currentUser.uid;
    console.log("Fixing recipient appointments for user:", userId);
    
    // First run diagnostics
    const { diagnostics } = await diagnoseRecipientAppointments(userId);
    
    let fixedAppointments = 0;
      // Look for appointments in donorAppointments that should be in recipientAppointments
    if (diagnostics.donorAppointments.appointments.length > 0) {
      const batch = writeBatch(db);
      
      // Copy each appointment to recipientAppointments
      for (const apt of diagnostics.donorAppointments.appointments) {
        // Remove fields we don't want to copy
        const { id, _sourceCollection, ...aptData } = apt;
        
        // Ensure it has recipient fields
        aptData.recipientId = userId;
        aptData.type = "recipient";
        aptData.patientType = "recipient";
        
        // Determine the proper collection - doctor scheduled goes to doctorScheduledAppointments
        const targetCollection = 
          aptData.doctorId && (aptData.doctorScheduled || aptData.scheduledByDoctor)
            ? "doctorScheduledAppointments"
            : "recipientAppointments";
        
        // Add to the appropriate collection
        await addDoc(collection(db, targetCollection), aptData);
        fixedAppointments++;
      }
    }
    
    // Look for missing doctorScheduledAppointments in other collections
    const doctorScheduledInWrongCollection = diagnostics.recipientAppointments.appointments
      .filter(apt => apt.doctorId && (apt.doctorScheduled || apt.scheduledByDoctor));
    
    if (doctorScheduledInWrongCollection.length > 0) {
      console.log(`Found ${doctorScheduledInWrongCollection.length} doctor-scheduled appointments in wrong collection`);
      
      for (const apt of doctorScheduledInWrongCollection) {
        // Only copy over if it doesn't exist in doctorScheduledAppointments already
        const { id, _sourceCollection, ...aptData } = apt;
        
        // Add to doctorScheduledAppointments
        await addDoc(collection(db, "doctorScheduledAppointments"), aptData);
        fixedAppointments++;
      }
    }
    
    return {
      success: true,
      message: `Fixed ${fixedAppointments} appointments for recipient ${userId}`,
      fixed: fixedAppointments
    };
  } catch (error) {
    console.error("Error fixing recipient appointments:", error);
    return {
      success: false,
      error: error.message
    };
  }
};