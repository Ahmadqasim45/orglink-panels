// Utility to fix recipientId values in recipientAppointments collection
import { db } from "../firebase";
import { 
  collection, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where
} from "firebase/firestore";

/**
 * Diagnoses issues with recipientId in the recipientAppointments collection
 * and lists appointments that need fixing
 */
export const diagnoseRecipientAppointmentIds = async () => {
  try {
    console.log("Starting diagnosis of recipientAppointments collection...");
    
    // Get all recipient appointments
    const appointmentsRef = collection(db, "recipientAppointments");
    const appointmentsSnapshot = await getDocs(appointmentsRef);
    
    console.log(`Found ${appointmentsSnapshot.size} total recipient appointments`);
    
    const problematicAppointments = [];
    const correctAppointments = [];
    
    // Get all recipients for lookup
    const recipientsRef = collection(db, "recipients");
    const recipientsSnapshot = await getDocs(recipientsRef);
    
    console.log(`Found ${recipientsSnapshot.size} total recipients for reference`);
    
    // Create a lookup map of recipient document IDs to their userIds
    const recipientUserIdMap = {};
    recipientsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        recipientUserIdMap[doc.id] = data.userId;
      }
    });
    
    console.log(`Created lookup map with ${Object.keys(recipientUserIdMap).length} recipient document ID to userId mappings`);
    
    // Check each appointment
    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointmentData = appointmentDoc.data();
      const appointmentId = appointmentDoc.id;
      
      // Check if recipientId is a document ID in the recipients collection
      const recipientId = appointmentData.recipientId;
      
      if (recipientUserIdMap[recipientId]) {
        // This appointment's recipientId is a document ID, not a userId
        const correctUserId = recipientUserIdMap[recipientId];
        
        problematicAppointments.push({
          appointmentId,
          currentRecipientId: recipientId,
          correctUserId,
          appointmentData: {
            patientName: appointmentData.patientName || "Unknown",
            date: appointmentData.date ? appointmentData.date.toDate().toLocaleDateString() : "Unknown date",
            time: appointmentData.time || "Unknown time",
            purpose: appointmentData.purpose || "Unknown purpose"
          }
        });
      } else {
        // Check if we can find a recipient document with this ID
        let foundInCollection = false;
        for (const [docId, userId] of Object.entries(recipientUserIdMap)) {
          if (userId === recipientId) {
            foundInCollection = true;
            break;
          }
        }
        
        if (foundInCollection) {
          correctAppointments.push({
            appointmentId,
            recipientId,
            appointmentData: {
              patientName: appointmentData.patientName || "Unknown",
              date: appointmentData.date ? appointmentData.date.toDate().toLocaleDateString() : "Unknown date"
            }
          });
        } else {
          // Could not find a matching recipient for this ID
          problematicAppointments.push({
            appointmentId,
            currentRecipientId: recipientId,
            correctUserId: "UNKNOWN - Not found in recipients collection",
            appointmentData: {
              patientName: appointmentData.patientName || "Unknown",
              date: appointmentData.date ? appointmentData.date.toDate().toLocaleDateString() : "Unknown date",
              time: appointmentData.time || "Unknown time",
              purpose: appointmentData.purpose || "Unknown purpose"
            },
            status: "UNKNOWN_RECIPIENT"
          });
        }
      }
    }
    
    // Print results
    console.log(`Found ${problematicAppointments.length} appointments with incorrect recipientId values`);
    console.log(`Found ${correctAppointments.length} appointments with correct recipientId values`);
    
    if (problematicAppointments.length > 0) {
      console.log("\n🔴 Problematic appointments:");
      problematicAppointments.forEach((apt, index) => {
        console.log(`\n[${index + 1}] Appointment ID: ${apt.appointmentId}`);
        console.log(`    Patient Name: ${apt.appointmentData.patientName}`);
        console.log(`    Date: ${apt.appointmentData.date} at ${apt.appointmentData.time}`);
        console.log(`    Purpose: ${apt.appointmentData.purpose}`);
        console.log(`    Current recipientId: ${apt.currentRecipientId}`);
        console.log(`    Correct userId: ${apt.correctUserId}`);
      });
    }
    
    return {
      problematicAppointments,
      correctAppointments,
      recipientUserIdMap
    };
    
  } catch (error) {
    console.error("Error diagnosing recipient appointments:", error);
    throw error;
  }
};

/**
 * Fixes all problematic recipientId values in the recipientAppointments collection
 */
export const fixRecipientAppointmentIds = async () => {
  try {
    console.log("Starting to fix recipientAppointments recipientId values...");
    
    const { problematicAppointments, recipientUserIdMap } = await diagnoseRecipientAppointmentIds();
    
    if (problematicAppointments.length === 0) {
      console.log("✅ No problems found. All recipientId values are correct.");
      return { fixed: 0, failed: 0 };
    }
    
    console.log(`Found ${problematicAppointments.length} appointments to fix`);
    
    let fixed = 0;
    let failed = 0;
    
    // Fix each problematic appointment
    for (const apt of problematicAppointments) {
      if (apt.correctUserId && apt.correctUserId !== "UNKNOWN - Not found in recipients collection") {
        try {
          const appointmentRef = doc(db, "recipientAppointments", apt.appointmentId);
          
          await updateDoc(appointmentRef, {
            recipientId: apt.correctUserId,
            userId: apt.correctUserId,
            patientId: apt.correctUserId
          });
          
          console.log(`✅ Fixed appointment ${apt.appointmentId}`);
          console.log(`    Changed recipientId from ${apt.currentRecipientId} to ${apt.correctUserId}`);
          fixed++;
        } catch (error) {
          console.error(`❌ Failed to fix appointment ${apt.appointmentId}:`, error);
          failed++;
        }
      } else {
        console.log(`⚠️ Cannot fix appointment ${apt.appointmentId} - correct userId unknown`);
        failed++;
      }
    }
    
    console.log(`\nFix complete: ${fixed} appointments fixed, ${failed} failed`);
    
    return { fixed, failed };
    
  } catch (error) {
    console.error("Error fixing recipient appointments:", error);
    throw error;
  }
};

// Export a function to check a specific recipient's appointments
export const checkRecipientAppointments = async (recipientId) => {
  try {
    console.log(`Checking appointments for recipient: ${recipientId}`);
    
    // First, try to find if this is a document ID in the recipients collection
    const recipientRef = doc(db, "recipients", recipientId);
    const recipientSnap = await getDoc(recipientRef);
    
    let userId = null;
    if (recipientSnap.exists()) {
      const recipientData = recipientSnap.data();
      userId = recipientData.userId;
      console.log(`Found recipient document. Document ID: ${recipientId}, userId: ${userId || "not set"}`);
    } else {
      console.log(`No recipient document found with ID: ${recipientId}`);
      
      // Try to find if this is a userId that has a recipient document
      const recipientsRef = collection(db, "recipients");
      const q = query(recipientsRef, where("userId", "==", recipientId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const recipientData = querySnapshot.docs[0].data();
        console.log(`Found recipient document with userId=${recipientId}:`, {
          documentId: querySnapshot.docs[0].id,
          fullName: recipientData.fullName || "Unknown"
        });
      } else {
        console.log(`No recipient found with userId: ${recipientId}`);
      }
    }
    
    // Now check appointments using both IDs
    const allIdsToCheck = [recipientId];
    if (userId) allIdsToCheck.push(userId);
    
    let totalAppointments = 0;
    
    for (const idToCheck of allIdsToCheck) {
      const appointmentsRef = collection(db, "recipientAppointments");
      const q = query(appointmentsRef, where("recipientId", "==", idToCheck));
      const querySnapshot = await getDocs(q);
      
      console.log(`Found ${querySnapshot.size} appointments with recipientId=${idToCheck}`);
      totalAppointments += querySnapshot.size;
      
      // Show details of each appointment
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`[${index + 1}] Appointment ID: ${doc.id}`);
        console.log(`    Patient Name: ${data.patientName || "Unknown"}`);
        console.log(`    Date: ${data.date ? data.date.toDate().toLocaleDateString() : "Unknown"}`);
        console.log(`    Time: ${data.time || "Unknown"}`);
        console.log(`    Status: ${data.status || "Unknown"}`);
        console.log(`    Doctor: ${data.doctorName || "Unknown"}`);
      });
    }
    
    return { totalAppointments };
    
  } catch (error) {
    console.error("Error checking recipient appointments:", error);
    throw error;
  }
};
