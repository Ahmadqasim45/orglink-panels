// Utility functions to help with hospital name and doctor name resolution
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

/**
 * Gets the proper hospital name for any doctor ID using multiple fallback approaches
 * @param {string} doctorId - The ID of the doctor
 * @returns {Promise<string>} - Hospital name, with fallback to default text
 */
export const getHospitalNameFromDoctorId = async (doctorId) => {
  if (!doctorId) return "No doctor assigned";
  
  try {
    console.log("Searching for hospital for doctor ID:", doctorId);
    
    // First, check the hospitals collection with the doctorId as userId
    const hospitalsRef = collection(db, "hospitals");
    const hospitalQuery = query(hospitalsRef, where("userId", "==", doctorId));
    const hospitalSnapshot = await getDocs(hospitalQuery);
    
    if (!hospitalSnapshot.empty) {
      const hospitalData = hospitalSnapshot.docs[0].data();
      console.log("Hospital data found:", hospitalData);
      
      // Check for hospitalName first, then name
      if (hospitalData.hospitalName) {
        return hospitalData.hospitalName;
      }
      if (hospitalData.name) {
        return hospitalData.name;
      }
    }
    
    // If no hospital found, check if doctor has hospitalId or hospital info
    const doctorRef = doc(db, "users", doctorId);
    const doctorSnap = await getDoc(doctorRef);
    
    if (doctorSnap.exists()) {
      const doctorData = doctorSnap.data();
      console.log("Doctor data found:", doctorData);
      
      // Check if doctor data contains hospital information directly
      if (doctorData.hospitalName) {
        return doctorData.hospitalName;
      }
      
      // Check if doctor has a hospital object
      if (doctorData.hospital) {
        if (typeof doctorData.hospital === 'string') {
          return doctorData.hospital;
        }
        if (doctorData.hospital.hospitalName) {
          return doctorData.hospital.hospitalName;
        }
        if (doctorData.hospital.name) {
          return doctorData.hospital.name;
        }
      }
      
      // Check if doctor has hospitalId
      if (doctorData.hospitalId) {
        const hospitalRef = doc(db, "hospitals", doctorData.hospitalId);
        const hospitalSnap = await getDoc(hospitalRef);
        
        if (hospitalSnap.exists()) {
          const hospitalData = hospitalSnap.data();
          return hospitalData.hospitalName || hospitalData.name || "Unknown Hospital";
        }
      }
    }
    
    // No hospital information found
    return "Hospital not specified";
    
  } catch (error) {
    console.error("Error fetching hospital name:", error);
    return "Error loading hospital";
  }
};

/**
 * Gets the proper doctor name with consistent formatting
 * @param {string} doctorId - The ID of the doctor
 * @returns {Promise<string>} - Formatted doctor name, with fallback to default text
 */
export const getDoctorNameFromId = async (doctorId) => {
  if (!doctorId) return "No doctor assigned";
  
  try {
    console.log("Fetching doctor info for ID:", doctorId);
    const doctorRef = doc(db, "users", doctorId);
    const doctorSnap = await getDoc(doctorRef);
    
    if (doctorSnap.exists()) {
      const doctorData = doctorSnap.data();
      console.log("Doctor data found:", doctorData);
      
      // Format the doctor name using available fields
      let formattedDoctorName = "";
      
      // First try profile info fields
      if (doctorData.profile) {
        if (doctorData.profile.firstName && doctorData.profile.lastName) {
          formattedDoctorName = `${doctorData.profile.firstName} ${doctorData.profile.lastName}`;
        } else if (doctorData.profile.fullName) {
          formattedDoctorName = doctorData.profile.fullName;
        } else if (doctorData.profile.name) {
          formattedDoctorName = doctorData.profile.name;
        }
      } 
      // If profile doesn't have name info, try root fields
      else if (doctorData.firstName && doctorData.lastName) {
        formattedDoctorName = `${doctorData.firstName} ${doctorData.lastName}`;
      } else if (doctorData.firstName) {
        formattedDoctorName = doctorData.firstName;
      } else if (doctorData.lastName) {
        formattedDoctorName = doctorData.lastName;
      } else if (doctorData.displayName) {
        formattedDoctorName = doctorData.displayName;
      } else if (doctorData.name) {
        formattedDoctorName = doctorData.name;
      } else if (doctorData.fullName) {
        formattedDoctorName = doctorData.fullName;
      } else if (doctorData.email) {
        // Use email as last resort
        formattedDoctorName = doctorData.email;
      }
      
      // Add Dr. prefix if not already present
      if (formattedDoctorName && !formattedDoctorName.startsWith("Dr.")) {
        formattedDoctorName = `Dr. ${formattedDoctorName}`;
      }
      
      // Add specialization if available
      if (doctorData.specialization || doctorData.doctorSpecialization) {
        const specialization = doctorData.specialization || doctorData.doctorSpecialization;
        formattedDoctorName += ` (${specialization})`;
      }
      
      return formattedDoctorName || "Doctor Name Not Available";
    }
    
    return "Doctor not found";
    
  } catch (error) {
    console.error("Error fetching doctor name:", error);
    return "Error loading doctor info";
  }
};
