/**
 * Utility functions to test and debug the recipient appointment views
 */
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";

/**
 * Get all appointments for the current logged-in user
 * This is useful for debugging recipient appointment viewing issues
 */
export const getCurrentUserAppointments = async () => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error("No user is logged in");
      return { success: false, error: "No user is logged in", data: null };
    }
    
    const userId = currentUser.uid;
    console.log("Current user ID:", userId);
    
    // First, try looking for appointments using recipientId field
    const appointmentsRef = collection(db, "recipientAppointments");
    const q1 = query(
      appointmentsRef,
      where("recipientId", "==", userId)
    );
    
    const querySnapshot1 = await getDocs(q1);
    const appointmentsByRecipientId = [];
    
    querySnapshot1.forEach((doc) => {
      appointmentsByRecipientId.push({
        id: doc.id,
        ...doc.data(),
        matchType: "recipientId match"
      });
    });
    
    // Second, try looking for appointments using patientId field
    // This is a fallback in case the appointments were saved incorrectly
    const q2 = query(
      appointmentsRef,
      where("patientId", "==", userId),
      where("patientType", "==", "recipient")
    );
    
    const querySnapshot2 = await getDocs(q2);
    const appointmentsByPatientId = [];
    
    querySnapshot2.forEach((doc) => {
      appointmentsByPatientId.push({
        id: doc.id,
        ...doc.data(),
        matchType: "patientId match"
      });
    });
    
    // Combine results, removing duplicates
    const combinedAppointments = [
      ...appointmentsByRecipientId,
      ...appointmentsByPatientId.filter(apt => 
        !appointmentsByRecipientId.some(apt1 => apt1.id === apt.id)
      )
    ];
    
    return {
      success: true,
      data: {
        byRecipientId: appointmentsByRecipientId,
        byPatientId: appointmentsByPatientId,
        combined: combinedAppointments
      }
    };
    
  } catch (error) {
    console.error("Error fetching current user appointments:", error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Check a specific recipient appointment by ID
 */
export const checkAppointmentById = async (appointmentId) => {
  try {
    if (!appointmentId) {
      return { success: false, error: "No appointment ID provided" };
    }
    
    const appointmentRef = doc(db, "recipientAppointments", appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (!appointmentSnap.exists()) {
      return { success: false, error: "Appointment not found" };
    }
    
    const appointmentData = appointmentSnap.data();
    
    return {
      success: true,
      data: {
        id: appointmentSnap.id,
        ...appointmentData
      }
    };
    
  } catch (error) {
    console.error("Error checking appointment:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Run this in the browser console to test the appointment view
 */
export const testRecipientAppointmentView = async () => {
  const result = await getCurrentUserAppointments();
  console.log("=== RECIPIENT APPOINTMENT VIEW TEST ===");
  console.log("Test run at:", new Date().toLocaleString());
  
  if (!result.success) {
    console.error("Error:", result.error);
    return;
  }
  
  const { byRecipientId, byPatientId, combined } = result.data;
  
  console.log(`Found ${byRecipientId.length} appointments with recipientId matching current user`);
  console.log(`Found ${byPatientId.length} appointments with patientId matching current user`);
  console.log(`Total unique appointments: ${combined.length}`);
  
  if (combined.length > 0) {
    console.log("\nFirst appointment data:");
    console.table(combined[0]);
  } else {
    console.log("\nNo appointments found for current user");
  }
  
  return result;
};

// You can run the following code in your browser console:
// 
// import { testRecipientAppointmentView } from './utils/testRecipientAppointmentViews';
// testRecipientAppointmentView().then(result => console.log("Test complete", result));
