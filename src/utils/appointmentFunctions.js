// Firebase utility functions for appointment management
import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  deleteDoc
} from "firebase/firestore";
import { APPROVAL_STATUS } from "./approvalSystem";

// Get all donor appointments for a specific donor
export const getDonorAppointments = async (donorId) => {
  try {
    // Validate donorId
    if (!donorId) {
      console.error("No donor ID provided");
      throw new Error("Donor ID is required. Please check your login status.");
    }

    console.log(`Fetching appointments for donor: ${donorId}`);
    const q = query(
      collection(db, "donorAppointments"),
      where("donorId", "==", donorId),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} appointments for donor`);
    const appointments = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const appointmentData = docSnapshot.data();
        
        // Get doctor information
        let doctorName = "Unknown Doctor";
        let hospitalName = "Unknown Hospital";
        
        if (appointmentData.doctorId) {
          try {
            const doctorRef = doc(db, "users", appointmentData.doctorId);
            const doctorSnap = await getDoc(doctorRef);
            
            if (doctorSnap.exists()) {
              const doctorData = doctorSnap.data();
              doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
              if (doctorName === "Dr. ") doctorName = "Dr. " + (doctorData.displayName || "Unknown");
              
              // Get hospital information
              const hospitalsRef = collection(db, "hospitals");
              const hospitalQuery = query(hospitalsRef, where("userId", "==", appointmentData.doctorId));
              const hospitalSnapshot = await getDocs(hospitalQuery);
              
              if (!hospitalSnapshot.empty) {
                  const hospitalData = hospitalSnapshot.docs[0].data();
                  // Fix: Check for both hospitalName and name fields
                  hospitalName = hospitalData.hospitalName || hospitalData.name || "Unknown Hospital";
                  console.log("Retrieved hospital name:", hospitalName);
              }
            }
          } catch (err) {
            console.error("Error fetching doctor or hospital info:", err);
            // Continue with default values
          }
        }
        
        // Safely convert date to JavaScript Date object
        let appointmentDate = new Date(); // Default to current date as fallback
        
        if (appointmentData.date) {
          try {
            // Handle different date formats
            if (typeof appointmentData.date === 'object' && appointmentData.date.toDate) {
              // It's a Firestore Timestamp
              appointmentDate = appointmentData.date.toDate();
            } else if (appointmentData.date instanceof Date) {
              // It's already a Date object
              appointmentDate = appointmentData.date;
            } else if (typeof appointmentData.date === 'string') {
              // It's a date string
              appointmentDate = new Date(appointmentData.date);
            } else if (typeof appointmentData.date.seconds === 'number') {
              // It has seconds property (Firestore timestamp-like)
              appointmentDate = new Date(appointmentData.date.seconds * 1000);
            }
          } catch (error) {
            console.error("Error converting date, using fallback:", error);
            // Keep the default fallback date
          }
        }
        
        appointments.push({
          id: docSnapshot.id,
          ...appointmentData,
          date: appointmentDate,
          doctorName,
          hospitalName,
          // Ensure status is present - default to 'scheduled' if missing
          status: appointmentData.status || 'scheduled'
        });
      } catch (appointmentError) {
        console.error("Error processing individual appointment:", appointmentError);
        // Continue to next appointment instead of breaking
      }
    }
    
    return appointments;
  } catch (error) {
    console.error("Error fetching donor appointments:", error);
    throw new Error(`Failed to load donor appointments: ${error.message}`);
  }
};

// Get all recipient appointments for a specific recipient
export const getRecipientAppointments = async (recipientId) => {
  try {
    // Validate recipientId
    if (!recipientId) {
      console.error("No recipient ID provided");
      throw new Error("Recipient ID is required. Please check your login status.");
    }

    console.log(`Fetching appointments for recipient: ${recipientId}`);
    const q = query(
      collection(db, "recipientAppointments"),
      where("recipientId", "==", recipientId),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} appointments for recipient`);
    const appointments = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const appointmentData = docSnapshot.data();
        
        // Get doctor information
        let doctorName = "Unknown Doctor";
        let hospitalName = "Unknown Hospital";
        
        if (appointmentData.doctorId) {
          try {
            const doctorRef = doc(db, "users", appointmentData.doctorId);
            const doctorSnap = await getDoc(doctorRef);
            
            if (doctorSnap.exists()) {
              const doctorData = doctorSnap.data();
              doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
              if (doctorName === "Dr. ") doctorName = "Dr. " + (doctorData.displayName || "Unknown");
              
              // Get hospital information
              const hospitalsRef = collection(db, "hospitals");
              const hospitalQuery = query(hospitalsRef, where("userId", "==", appointmentData.doctorId));
              const hospitalSnapshot = await getDocs(hospitalQuery);
              
              if (!hospitalSnapshot.empty) {
                  const hospitalData = hospitalSnapshot.docs[0].data();
                  // Fix: Check for both hospitalName and name fields
                  hospitalName = hospitalData.hospitalName || hospitalData.name || "Unknown Hospital";
                  console.log("Retrieved hospital name:", hospitalName);
              }
            }
          } catch (err) {
            console.error("Error fetching doctor or hospital info:", err);
            // Continue with default values
          }
        }
        
        // Safely convert date to JavaScript Date object
        let appointmentDate = new Date(); // Default to current date as fallback
        
        if (appointmentData.date) {
          try {
            // Handle different date formats
            if (typeof appointmentData.date === 'object' && appointmentData.date.toDate) {
              // It's a Firestore Timestamp
              appointmentDate = appointmentData.date.toDate();
            } else if (appointmentData.date instanceof Date) {
              // It's already a Date object
              appointmentDate = appointmentData.date;
            } else if (typeof appointmentData.date === 'string') {
              // It's a date string
              appointmentDate = new Date(appointmentData.date);
            } else if (typeof appointmentData.date.seconds === 'number') {
              // It has seconds property (Firestore timestamp-like)
              appointmentDate = new Date(appointmentData.date.seconds * 1000);
            }
          } catch (error) {
            console.error("Error converting date, using fallback:", error);
            // Keep the default fallback date
          }
        }
        
        appointments.push({
          id: docSnapshot.id,
          ...appointmentData,
          date: appointmentDate,
          doctorName,
          hospitalName,
          // Ensure status is present - default to 'scheduled' if missing
          status: appointmentData.status || 'scheduled'
        });
      } catch (appointmentError) {
        console.error("Error processing individual appointment:", appointmentError);
        // Continue to next appointment instead of breaking
      }
    }
    
    return appointments;
  } catch (error) {
    console.error("Error fetching recipient appointments:", error);
    throw new Error(`Failed to load recipient appointments: ${error.message}`);
  }
};

// Get all appointments for a specific doctor
export const getDoctorAppointments = async (doctorId) => {
  try {
    // Validate doctorId
    if (!doctorId) {
      console.error("No doctor ID provided");
      throw new Error("Doctor ID is required. Please check your login status.");
    }

    const donorAppointments = [];
    const recipientAppointments = [];
    
    // Get doctor information
    let doctorData = null;
    let hospitalName = "Unknown Hospital";
    
    try {
      const doctorRef = doc(db, "users", doctorId);
      const doctorSnap = await getDoc(doctorRef);
      
      if (doctorSnap.exists()) {
        doctorData = doctorSnap.data();
        
        // Get hospital information
        const hospitalsRef = collection(db, "hospitals");
        const hospitalQuery = query(hospitalsRef, where("userId", "==", doctorId));
        const hospitalSnapshot = await getDocs(hospitalQuery);
        
        if (!hospitalSnapshot.empty) {
          hospitalName = hospitalSnapshot.docs[0].data().name;
        }
      }
    } catch (docError) {
      console.error("Error fetching doctor or hospital info:", docError);
      // Continue with default doctor name and hospital
    }
    
    const doctorName = doctorData ? 
      `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim() : 
      "Unknown Doctor";
      // Get donor appointments
    try {
      // First attempt: with orderBy (requires composite index)
      try {
        const donorQuery = query(
          collection(db, "donorAppointments"),
          where("doctorId", "==", doctorId),
          orderBy("date", "desc")
        );
        
        const donorSnapshot = await getDocs(donorQuery);
        
        for (const docSnap of donorSnapshot.docs) {
          try {
            const appointmentData = docSnap.data();
            // Safely handle date conversion
            let appointmentDate;
            
            try {
              appointmentDate = appointmentData.date.toDate();
            } catch (dateError) {
              console.warn("Error converting date:", dateError);
              appointmentDate = new Date(); // Fallback
            }
            
            donorAppointments.push({
              id: docSnap.id,
              type: "donor",
              ...appointmentData,
              date: appointmentDate,
              doctorName,
              hospitalName,
              // Ensure status is present
              status: appointmentData.status || 'scheduled'
            });
          } catch (appointmentError) {
            console.error("Error processing donor appointment:", appointmentError);
            // Continue with next appointment
          }
        }
      } catch (indexError) {
        console.warn("Index error, falling back to simple query:", indexError.message);
        
        if (indexError.message && indexError.message.includes("requires an index")) {
          console.warn("Missing index detected. You need to create a composite index for the donorAppointments collection on doctorId and date fields.");
          console.warn("Please follow the link in the error message to create the index in the Firebase console.");
          
          // Fallback to a simpler query without ordering (no composite index needed)
          const simpleQuery = query(
            collection(db, "donorAppointments"),
            where("doctorId", "==", doctorId)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          
          // Process results without ordering (we'll sort them in memory instead)
          const tempAppointments = [];
          for (const docSnap of simpleSnapshot.docs) {
            try {
              const appointmentData = docSnap.data();
              let appointmentDate;
              
              try {
                appointmentDate = appointmentData.date.toDate();
              } catch (dateError) {
                console.warn("Error converting date:", dateError);
                appointmentDate = new Date(); // Fallback
              }
              
              tempAppointments.push({
                id: docSnap.id,
                type: "donor",
                ...appointmentData,
                date: appointmentDate,
                doctorName,
                hospitalName,
                status: appointmentData.status || 'scheduled'
              });
            } catch (appointmentError) {
              console.error("Error processing donor appointment:", appointmentError);
            }
          }
          
          // Sort in memory
          tempAppointments.sort((a, b) => b.date - a.date);
          donorAppointments.push(...tempAppointments);
        } else {
          // For other errors, just re-throw
          throw indexError;
        }
      }
    } catch (donorError) {
      console.error("Error fetching donor appointments:", donorError);
      // Show alert about the error but continue with recipient appointments
    }    // Get recipient appointments
    try {
      // First attempt: with orderBy (requires composite index)
      try {
        const recipientQuery = query(
          collection(db, "recipientAppointments"),
          where("doctorId", "==", doctorId),
          orderBy("date", "desc")
        );
        
        const recipientSnapshot = await getDocs(recipientQuery);
        
        for (const docSnap of recipientSnapshot.docs) {          try {
            const appointmentData = docSnap.data();
            // Safely handle date conversion
            let appointmentDate;
            
            try {
              appointmentDate = appointmentData.date.toDate();
            } catch (dateError) {
              console.warn("Error converting date:", dateError);
              appointmentDate = new Date(); // Fallback
            }
          
            recipientAppointments.push({
              id: docSnap.id,
              type: "recipient",
              ...appointmentData,
              date: appointmentDate,
              doctorName,
              hospitalName,
              // Ensure status is present
              status: appointmentData.status || 'scheduled'
            });
          } catch (appointmentError) {
            console.error("Error processing recipient appointment:", appointmentError);
            // Continue with next appointment
          }
        }
      } catch (indexError) {
        console.warn("Index error, falling back to simple query:", indexError.message);
        
        if (indexError.message && indexError.message.includes("requires an index")) {
          console.warn("Missing index detected. You need to create a composite index for the recipientAppointments collection on doctorId and date fields.");
          console.warn("Please follow the link in the error message to create the index in the Firebase console.");
          
          // Fallback to a simpler query without ordering (no composite index needed)
          const simpleQuery = query(
            collection(db, "recipientAppointments"),
            where("doctorId", "==", doctorId)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          
          // Process results without ordering (we'll sort them in memory instead)
          const tempAppointments = [];
          for (const docSnap of simpleSnapshot.docs) {
            try {
              const appointmentData = docSnap.data();
              let appointmentDate;
              
              try {
                appointmentDate = appointmentData.date.toDate();
              } catch (dateError) {
                console.warn("Error converting date:", dateError);
                appointmentDate = new Date(); // Fallback
              }
              
              tempAppointments.push({
                id: docSnap.id,
                type: "recipient",
                ...appointmentData,
                date: appointmentDate,
                doctorName,
                hospitalName,
                status: appointmentData.status || 'scheduled'
              });
            } catch (appointmentError) {
              console.error("Error processing recipient appointment:", appointmentError);
            }
          }
          
          // Sort in memory
          tempAppointments.sort((a, b) => b.date - a.date);
          recipientAppointments.push(...tempAppointments);
        } else {
          // For other errors, just re-throw
          throw indexError;
        }
      }
    } catch (recipientError) {
      console.error("Error fetching recipient appointments:", recipientError);
      // Continue even if recipient appointments fail
    }
    
    // Combine and return all appointments
    return [...donorAppointments, ...recipientAppointments];
  } catch (error) {
    console.error("Error in getDoctorAppointments:", error);
    throw error;
  }
};

// Get all doctors for dropdown selection
export const getAllDoctors = async () => {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "doctor")
    );
    
    const querySnapshot = await getDocs(q);
    const doctors = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const doctorData = docSnapshot.data();
      
      // Get hospital information if available
      let hospitalName = "Independent";
        // Look for associated hospital
      const hospitalsRef = collection(db, "hospitals");
      const hospitalQuery = query(hospitalsRef, where("userId", "==", docSnapshot.id));
      const hospitalSnapshot = await getDocs(hospitalQuery);
      
      if (!hospitalSnapshot.empty) {
        const hospitalData = hospitalSnapshot.docs[0].data();
        hospitalName = hospitalData.hospitalName || hospitalData.name || "Unknown Hospital";
        console.log("Found hospital with fields:", Object.keys(hospitalData));
        console.log("Hospital name resolved to:", hospitalName);
      }
      
      doctors.push({
        id: docSnapshot.id,
        ...doctorData,
        hospitalName
      });
    }
    
    return doctors;
  } catch (error) {
    console.error("Error fetching doctors:", error);
    throw error;
  }
};

// Create a new donor appointment
export const createDonorAppointment = async (appointmentData) => {
  try {
    // Convert string date to Firebase timestamp
    const timestamp = Timestamp.fromDate(new Date(appointmentData.date));
    
    // Ensure we have doctor and hospital information
    let doctorName = appointmentData.doctorName;
    let hospitalName = appointmentData.hospitalName;
    
    // If doctor name is not provided but doctorId is, fetch doctor details
    if (!doctorName && appointmentData.doctorId) {
      try {
        const doctorRef = doc(db, "users", appointmentData.doctorId);
        const doctorSnap = await getDoc(doctorRef);
        
        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
          if (doctorName === "Dr. ") doctorName = "Dr. " + (doctorData.displayName || "Unknown");
          
          // If hospital name is not provided, try to find it
          if (!hospitalName) {
            // Check if doctor has a hospitalId
            if (doctorData.hospitalId) {
              const hospitalRef = doc(db, "hospitals", doctorData.hospitalId);
              const hospitalSnap = await getDoc(hospitalRef);
              
              if (hospitalSnap.exists()) {
                hospitalName = hospitalSnap.data().name || "Unknown Hospital";
              }
            } else {
              // Try to find hospital by userId
              const hospitalsRef = collection(db, "hospitals");
              const q = query(hospitalsRef, where("userId", "==", appointmentData.doctorId));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                hospitalName = querySnapshot.docs[0].data().name || "Unknown Hospital";
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching doctor or hospital info:", err);
      }
    }
    
    const docRef = await addDoc(collection(db, "donorAppointments"), {
      ...appointmentData,
      date: timestamp,
      status: "scheduled",
      createdAt: Timestamp.now(),
      type: "donor",
      doctorName: doctorName || appointmentData.doctorName || "Unknown Doctor",
      hospitalName: hospitalName || appointmentData.hospitalName || "Unknown Hospital"
    });
      // Update donor's appointmentIds array and start medical evaluation
    const donorRef = doc(db, "users", appointmentData.donorId);
    const donorDoc = await getDoc(donorRef);
    
    if (donorDoc.exists()) {
      const donorData = donorDoc.data();
      const appointmentIds = donorData.appointmentIds || [];
      
      await updateDoc(donorRef, {
        appointmentIds: [...appointmentIds, docRef.id]
      });
    }
    
    // Automatically start medical evaluation when appointment is scheduled
    try {
      await startMedicalEvaluation(appointmentData.donorId, docRef.id);
      console.log(`Medical evaluation started for donor ${appointmentData.donorId}`);
    } catch (error) {
      console.error("Error starting medical evaluation:", error);
      // Don't throw error here as appointment was created successfully
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating donor appointment:", error);
    throw error;
  }
};

// Create a new recipient appointment
export const createRecipientAppointment = async (appointmentData) => {
  try {
    // Convert string date to Firebase timestamp
    const timestamp = Timestamp.fromDate(new Date(appointmentData.date));
    
    // Ensure we have doctor and hospital information
    let doctorName = appointmentData.doctorName;
    let hospitalName = appointmentData.hospitalName;
    
    // If doctor name is not provided but doctorId is, fetch doctor details
    if (!doctorName && appointmentData.doctorId) {
      try {
        const doctorRef = doc(db, "users", appointmentData.doctorId);
        const doctorSnap = await getDoc(doctorRef);
        
        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
          if (doctorName === "Dr. ") doctorName = "Dr. " + (doctorData.displayName || "Unknown");
          
          // If hospital name is not provided, try to find it
          if (!hospitalName) {
            // Check if doctor has a hospitalId
            if (doctorData.hospitalId) {
              const hospitalRef = doc(db, "hospitals", doctorData.hospitalId);
              const hospitalSnap = await getDoc(hospitalRef);
              
              if (hospitalSnap.exists()) {
                hospitalName = hospitalSnap.data().name || "Unknown Hospital";
              }
            } else {
              // Try to find hospital by userId
              const hospitalsRef = collection(db, "hospitals");
              const q = query(hospitalsRef, where("userId", "==", appointmentData.doctorId));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                hospitalName = querySnapshot.docs[0].data().name || "Unknown Hospital";
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching doctor or hospital info:", err);
      }
    }    // IMPORTANT: Standardize and clean ID fields before saving
    // This ensures they can be properly matched later when querying
    const originalRecipientId = String(appointmentData.recipientId || '').trim();
    
    // Fetch the userId from the recipient table using the recipientId
    let userId = null;
    let recipientId = originalRecipientId;    // Try to get the userId from the recipients collection
    try {
      if (originalRecipientId) {
        console.log(`Looking up recipient document with ID: ${originalRecipientId}`);
        
        // First, try to fetch directly using the original recipientId as the document ID
        const directRecipientRef = doc(db, "recipients", originalRecipientId);
        const directRecipientSnap = await getDoc(directRecipientRef);
        
        // Debug - Important check to ensure we accessed the right data
        if (directRecipientSnap.exists()) {
          console.log("Direct lookup successful - document data keys:", Object.keys(directRecipientSnap.data()));
        } else {
          console.log("Direct lookup failed - document doesn't exist");
        }
        
        if (directRecipientSnap.exists()) {
          // Found the recipient document by its ID, now get its userId field
          const recipientData = directRecipientSnap.data();
          console.log(`Retrieved recipient document data:`, recipientData);
          
          if (recipientData.userId) {
            console.log(`Found userId: ${recipientData.userId} for recipient document ID ${originalRecipientId}`);
            userId = recipientData.userId;
          } else {
            console.warn(`Recipient document found but has no userId field. Document ID: ${originalRecipientId}`);
          }
        } else {
          console.log(`No recipient document found with ID: ${originalRecipientId}, will try querying by field values`);
          
          // If not found as document ID, try alternative strategies
          
          // Strategy 1: Query by "id" field (if recipients have their own ID field)
          const recipientsRefById = collection(db, "recipients");
          const qById = query(recipientsRefById, where("id", "==", originalRecipientId));
          const querySnapshotById = await getDocs(qById);
          
          if (!querySnapshotById.empty) {
            const recipientData = querySnapshotById.docs[0].data();
            if (recipientData.userId) {
              console.log(`Found userId: ${recipientData.userId} for recipient with id field=${originalRecipientId}`);
              userId = recipientData.userId;
            }
          } else {
            // Strategy 2: Last resort - check if we can find the recipient by other identifiers
            // This is useful if the appointment has patientName or other data we can match
            if (appointmentData.patientName) {
              console.log(`Trying to find recipient by name: ${appointmentData.patientName}`);
              const recipientsByName = collection(db, "recipients");
              const qByName = query(recipientsByName, where("fullName", "==", appointmentData.patientName));
              const nameQuerySnapshot = await getDocs(qByName);
              
              if (!nameQuerySnapshot.empty) {
                const recipientData = nameQuerySnapshot.docs[0].data();
                if (recipientData.userId) {
                  console.log(`Found userId: ${recipientData.userId} by matching recipient name ${appointmentData.patientName}`);
                  userId = recipientData.userId;
                }
              } else {
                console.warn(`No recipient found by name ${appointmentData.patientName}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching userId from recipient:", error);
    }
      // When we get here, if userId is still null, we need to make one more attempt
    if (!userId) {
      console.log(`No userId found through direct methods, attempting a broader query for recipient document ID: ${originalRecipientId}`);
      
      try {
        // Get all recipients and try to find a match - this is a more expensive operation
        // but it's better than failing completely
        const allRecipientsRef = collection(db, "recipients");
        const allRecipientsSnapshot = await getDocs(allRecipientsRef);
        
        console.log(`Found ${allRecipientsSnapshot.size} total recipients in the collection`);
        
        // Log data about each recipient for debugging
        allRecipientsSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`Recipient ${doc.id}: fullName=${data.fullName}, userId=${data.userId || 'not set'}`);
        });
        
        // Try to find by document ID first
        const matchByDocId = allRecipientsSnapshot.docs.find(doc => doc.id === originalRecipientId);
        if (matchByDocId) {
          const userData = matchByDocId.data();
          if (userData.userId) {
            userId = userData.userId;
            console.log(`Found userId ${userId} from complete collection lookup by document ID`);
          }
        }
        
        // If still not found, check if any recipient contains this ID in any field
        if (!userId) {
          for (const doc of allRecipientsSnapshot.docs) {
            const data = doc.data();
            
            // Check if any field matches our originalRecipientId
            if (data.userId === originalRecipientId) {
              console.log(`Found a recipient where userId matches our originalRecipientId. Using originalRecipientId as userId`);
              userId = originalRecipientId;
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error during broader recipient lookup:", error);
      }
    }
    
    // Use the fetched userId if available, otherwise fall back to originalRecipientId
    if (userId) {
      recipientId = userId;
      console.log(`FINAL DECISION: Using userId: ${userId} as recipientId for the appointment`);
    } else {
      console.log(`FINAL DECISION: No userId found for recipient ${originalRecipientId}, using original ID as fallback`);
    }    // ***** THIS IS THE KEY FIX *****
    // ALWAYS use the userId from the recipient document as the recipientId value
    // NOT the document ID of the recipient
    
    // Store both IDs for reference - the document ID in recipientDocId and the userId in recipientId
    const recipientDocId = originalRecipientId;
    
    // CRITICAL: Force recipientId to be the userId from the recipient document
    // If we found the userId, use it; otherwise try one more direct check with the recipient collection
    if (!userId && originalRecipientId) {
      // One last attempt - search for any recipient that has this document ID
      try {
        console.log("CRITICAL FIX: Making one final attempt to find the correct userId");
        const recipientsRef = collection(db, "recipients");
        const allRecipients = await getDocs(recipientsRef);
        
        // Debug: Log all recipients with their userId values
        console.log("All recipients with their userIds:");
        allRecipients.docs.forEach(doc => {
          console.log(`Recipient ID: ${doc.id}, userId: ${doc.data().userId || "NO USER ID"}`);
        });
        
        // Find the document with this ID
        const matchingDoc = allRecipients.docs.find(doc => doc.id === originalRecipientId);
        if (matchingDoc && matchingDoc.data().userId) {
          userId = matchingDoc.data().userId;
          recipientId = userId;
          console.log(`FINAL FIX: Found userId ${userId} for recipient document ${originalRecipientId}`);
        } else {
          console.log(`FAILED TO FIX: Could not find userId for recipient document ${originalRecipientId}`);
        }
      } catch (error) {
        console.error("Error in final userId lookup:", error);
      }
    }
    
    // Prepare a clean appointment object with consistent ID formats
    const cleanAppointmentData = {
      ...appointmentData,
      // Override with standardized values
      recipientId: userId || recipientId,  // ALWAYS use the userId if available
      recipientDocId: recipientDocId,      // Store the original document ID for reference
      patientId: userId || recipientId,    // Set patientId to match recipientId for consistency
      userId: userId || recipientId,       // Set userId to match recipientId for triple redundancy
      date: timestamp,
      status: "scheduled",
      createdAt: Timestamp.now(),
      type: "recipient",
      doctorName: doctorName || appointmentData.doctorName || "Unknown Doctor",
      hospitalName: hospitalName || appointmentData.hospitalName || "Unknown Hospital",
      // Flag to identify StaffDashboard appointments
      fromStaffDashboard: true
    };    // Log the appointment data being saved with clear labels
    console.log("Creating standardized recipient appointment with IDs:", {
      originalRecipientDocId: originalRecipientId,         // Original document ID from recipients collection
      fetchedUserId: userId || "Not found",                // The userId we found in the recipient document
      finalRecipientId: cleanAppointmentData.recipientId,  // What's being stored in recipientId field
      recipientDocId: cleanAppointmentData.recipientDocId, // Document ID reference being stored
      patientId: cleanAppointmentData.patientId,           // patientId field value
      userId: cleanAppointmentData.userId                  // userId field value
    });
    
    // Add an obvious warning if we're still using the document ID instead of userId
    if (!userId) {
      console.warn("⚠️⚠️⚠️ WARNING: COULD NOT FIND USER ID FOR RECIPIENT ⚠️⚠️⚠️");
      console.warn("    Using document ID instead of user ID for recipientId");
      console.warn("    This may cause issues with appointment visibility");
      console.warn("    Recipient document ID:", originalRecipientId);
    }
      const docRef = await addDoc(collection(db, "recipientAppointments"), cleanAppointmentData);    // Update recipient's appointmentIds array in both the users collection and the recipients collection
    if (recipientId) {
      // 1. Update the user document with the appointment ID
      const userRef = doc(db, "users", recipientId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userAppointmentIds = userData.appointmentIds || [];
        
        // Add the new appointment ID to the user's list
        await updateDoc(userRef, {
          appointmentIds: [...userAppointmentIds, docRef.id]
        });
        
        console.log(`Updated user document ${recipientId} with new appointment ID: ${docRef.id}`);
      } else {
        console.log(`User document ${recipientId} not found, could not update user's appointmentIds array`);
      }
      
      // 2. Also update the recipient document if we have the original document ID
      if (originalRecipientId) {
        try {
          const recipientRef = doc(db, "recipients", originalRecipientId);
          const recipientDoc = await getDoc(recipientRef);
          
          if (recipientDoc.exists()) {
            const recipientData = recipientDoc.data();
            const recipientAppointmentIds = recipientData.appointmentIds || [];
            
            // Add the new appointment ID to the recipient's list
            await updateDoc(recipientRef, {
              appointmentIds: [...recipientAppointmentIds, docRef.id]
            });
            
            console.log(`Also updated recipient document ${originalRecipientId} with new appointment ID: ${docRef.id}`);
          } else {
            console.log(`Recipient document ${originalRecipientId} not found, could not update recipient's appointmentIds array`);
          }
        } catch (error) {
          console.error(`Error updating recipient document ${originalRecipientId}:`, error);
        }
      }
    } else {
      console.log("No recipientId provided, skipping user appointmentIds update");
    }    // Add debugging information about the final appointment data saved
    console.log("APPOINTMENT SAVED TO DATABASE: ", {
      collection: "recipientAppointments",
      documentId: docRef.id,
      data: {
        recipientId: cleanAppointmentData.recipientId,     // Should be the userId from recipient document
        userId: cleanAppointmentData.userId,               // Should match recipientId
        patientId: cleanAppointmentData.patientId,         // Should match recipientId
        recipientDocId: cleanAppointmentData.recipientDocId // Reference to the original document ID
      },
      originalValues: {
        originalRecipientId: originalRecipientId,          // Document ID from recipients collection
        fetchedUserId: userId || "Not found",              // userId we found from the recipient document
      }
    });
    
    // Verify using an explicit fetch of the newly created document
    try {
      const verifyRef = doc(db, "recipientAppointments", docRef.id);
      const verifySnap = await getDoc(verifyRef);
      if (verifySnap.exists()) {
        const verifyData = verifySnap.data();
        console.log("VERIFICATION - Saved appointment data:", {
          recipientId: verifyData.recipientId,
          userId: verifyData.userId,
          patientId: verifyData.patientId
        });
        
        // Final validation check
        if (userId && verifyData.recipientId !== userId) {
          console.error("⚠️ CRITICAL ERROR: Saved recipientId does not match the userId we found");
          console.error(`Expected: ${userId}, Got: ${verifyData.recipientId}`);
        } else {
          console.log("✅ Appointment successfully saved with correct recipientId");
        }
      }
    } catch (verifyError) {
      console.error("Error verifying saved appointment data:", verifyError);
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating recipient appointment:", error);
    throw error;
  }
};

// Update an existing appointment (works for both donor and recipient)
export const updateAppointment = async (appointmentId, appointmentType, updatedData) => {
  try {
    const collectionName = appointmentType === "donor" 
      ? "donorAppointments" 
      : "recipientAppointments";
    
    // If updating date, convert to timestamp
    if (updatedData.date) {
      updatedData.date = Timestamp.fromDate(new Date(updatedData.date));
    }
    
    // Get the current appointment to preserve doctor/hospital info if not provided
    const appointmentRef = doc(db, collectionName, appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (appointmentSnap.exists()) {
      const currentData = appointmentSnap.data();
      
      // Keep doctorName and hospitalName unless explicitly updated
      if (!updatedData.doctorName && currentData.doctorName) {
        updatedData.doctorName = currentData.doctorName;
      }
      
      if (!updatedData.hospitalName && currentData.hospitalName) {
        updatedData.hospitalName = currentData.hospitalName;
      }
      
      // If doctorId is updated but doctorName is not, fetch new doctor info
      if (updatedData.doctorId && updatedData.doctorId !== currentData.doctorId && !updatedData.doctorName) {
        try {
          const doctorRef = doc(db, "users", updatedData.doctorId);
          const doctorSnap = await getDoc(doctorRef);
          
          if (doctorSnap.exists()) {
            const doctorData = doctorSnap.data();
            updatedData.doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
            if (updatedData.doctorName === "Dr. ") updatedData.doctorName = "Dr. " + (doctorData.displayName || "Unknown");
            
            // Update hospital information if needed
            if (!updatedData.hospitalName || updatedData.hospitalName === "Unknown Hospital") {
              // Try to find hospital from doctor hospitalId first
              if (doctorData.hospitalId) {
                const hospitalRef = doc(db, "hospitals", doctorData.hospitalId);
                const hospitalSnap = await getDoc(hospitalRef);
                
                if (hospitalSnap.exists()) {
                  updatedData.hospitalName = hospitalSnap.data().name || "Unknown Hospital";
                }
              } else {
                // Try to find hospital by userId
                const hospitalsRef = collection(db, "hospitals");
                const q = query(hospitalsRef, where("userId", "==", updatedData.doctorId));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                  updatedData.hospitalName = querySnapshot.docs[0].data().name || "Unknown Hospital";
                }
              }
            }
          }
        } catch (err) {
          console.error("Error fetching updated doctor info:", err);
          // Continue with current values
        }
      }
    }
    
    await updateDoc(appointmentRef, {
      ...updatedData,
      updatedAt: Timestamp.now()
    });
    
    return appointmentId;
  } catch (error) {
    console.error(`Error updating ${appointmentType} appointment:`, error);
    throw error;
  }
};

// Cancel an appointment (donor or recipient)
export const cancelAppointment = async (appointmentId, appointmentType) => {
  try {
    const collectionName = appointmentType === "donor" 
      ? "donorAppointments" 
      : "recipientAppointments";
    
    const appointmentRef = doc(db, collectionName, appointmentId);
    await updateDoc(appointmentRef, {
      status: "cancelled",
      updatedAt: Timestamp.now()
    });
    
    return appointmentId;
  } catch (error) {
    console.error(`Error cancelling ${appointmentType} appointment:`, error);
    throw error;
  }
};

// Complete an appointment (donor or recipient) with optional evaluation notes
export const completeAppointment = async (appointmentId, appointmentType, evaluationNotes = '') => {
  return completeAppointmentWithEvaluation(appointmentId, appointmentType, evaluationNotes);
};

// Get specific appointment details
export const getAppointmentDetails = async (appointmentId, appointmentType) => {
  try {
    const collectionName = appointmentType === "donor" 
      ? "donorAppointments" 
      : "recipientAppointments";
    
    const appointmentRef = doc(db, collectionName, appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (appointmentDoc.exists()) {
      const data = appointmentDoc.data();
      
      // Fetch doctor details
      let doctorName = "Unknown";
      let hospitalName = "Unknown";
      
      if (data.doctorId) {
        const doctorRef = doc(db, "users", data.doctorId);
        const doctorDoc = await getDoc(doctorRef);
        
        if (doctorDoc.exists()) {
          const doctorData = doctorDoc.data();
          doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`;
          
          // Fetch hospital details if doctor is linked to a hospital
          const hospitalsRef = collection(db, "hospitals");
          const q = query(hospitalsRef, where("userId", "==", data.doctorId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const hospitalData = querySnapshot.docs[0].data();
            hospitalName = hospitalData.name || hospitalData.hospitalName || "Unknown";
          }
        }
      }
      
      return {
        id: appointmentDoc.id,
        ...data,
        date: data.date.toDate(), // Convert timestamp to JS Date
        doctorName,
        hospitalName
      };
    } else {
      throw new Error("Appointment not found");
    }
  } catch (error) {
    console.error(`Error getting ${appointmentType} appointment details:`, error);
    throw error;
  }
};

// Medical Evaluation Workflow Functions

// Update donor status to "medical evaluation in progress" when appointment is scheduled
export const startMedicalEvaluation = async (donorId, appointmentId) => {
  try {
    const donorRef = doc(db, "users", donorId);
    const medicalRecordRef = doc(db, "medicalRecords", donorId);
    
    const updateData = {
      requestStatus: APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS,
      status: 'medical-evaluation-in-progress',
      medicalEvaluationStarted: Timestamp.now(),
      currentAppointmentId: appointmentId,
      statusNotes: 'Your appointment has been scheduled. Medical evaluation is now in progress.',
      evaluationMessage: 'Your appointment is scheduled - View your appointments',
      updatedAt: Timestamp.now()
    };
    
    // Update both users and medicalRecords collections
    await Promise.all([
      updateDoc(donorRef, updateData),
      updateDoc(medicalRecordRef, updateData)
    ]);
    
    console.log(`Started medical evaluation for donor ${donorId}`);
    return true;
  } catch (error) {
    console.error("Error starting medical evaluation:", error);
    throw error;
  }
};

// Complete medical evaluation when appointment is completed
export const completeMedicalEvaluation = async (donorId, appointmentId, evaluationNotes = '') => {
  try {
    const donorRef = doc(db, "users", donorId);
    const medicalRecordRef = doc(db, "medicalRecords", donorId);
    
    const updateData = {
      requestStatus: APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED,
      status: 'medical-evaluation-completed',
      medicalEvaluationCompleted: Timestamp.now(),
      evaluationNotes: evaluationNotes || 'Medical evaluation completed successfully',
      statusNotes: 'Your appointment/evaluation process has been completed successfully.',
      evaluationMessage: 'Your appointment or evaluation process completed',
      completedAppointmentId: appointmentId,
      updatedAt: Timestamp.now()
    };
    
    // Update both users and medicalRecords collections
    await Promise.all([
      updateDoc(donorRef, updateData),
      updateDoc(medicalRecordRef, updateData)
    ]);
    
    console.log(`Completed medical evaluation for donor ${donorId}`);
    return true;
  } catch (error) {
    console.error("Error completing medical evaluation:", error);
    throw error;
  }
};

// Enhanced appointment completion with medical evaluation tracking
export const completeAppointmentWithEvaluation = async (appointmentId, appointmentType, evaluationNotes = '') => {
  try {
    const collectionName = appointmentType === "donor" 
      ? "donorAppointments" 
      : "recipientAppointments";
    
    // Get appointment details first
    const appointmentRef = doc(db, collectionName, appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      throw new Error("Appointment not found");
    }
    
    const appointmentData = appointmentDoc.data();
    
    // Update appointment status
    await updateDoc(appointmentRef, {
      status: "completed",
      completedAt: Timestamp.now(),
      evaluationNotes: evaluationNotes,
      updatedAt: Timestamp.now()
    });
    
    // If this is a donor appointment, update the medical evaluation status
    if (appointmentType === "donor" && appointmentData.donorId) {
      await completeMedicalEvaluation(appointmentData.donorId, appointmentId, evaluationNotes);
    }
    
    return appointmentId;
  } catch (error) {
    console.error(`Error completing ${appointmentType} appointment with evaluation:`, error);
    throw error;  }
};
