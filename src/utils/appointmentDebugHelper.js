/**
 * Utility functions to help debug appointment-related issues
 */

/**
 * Validates an appointment object and returns any issues found
 * @param {Object} appointment - The appointment object to validate
 * @returns {Object} - Object containing validation results
 */
export const validateAppointment = (appointment) => {
  if (!appointment) {
    return { valid: false, errors: ["Appointment is null or undefined"] };
  }
  
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!appointment.id) errors.push("Missing appointment ID");
  
  // Check date field
  if (!appointment.date) {
    errors.push("Missing date field");
  } else {
    // Check if date is valid
    try {
      if (appointment.date instanceof Date) {
        if (isNaN(appointment.date.getTime())) {
          errors.push("Invalid Date object (NaN)");
        }
      } else if (typeof appointment.date === 'string') {
        const dateObj = new Date(appointment.date);
        if (isNaN(dateObj.getTime())) {
          errors.push(`Invalid date string: ${appointment.date}`);
        }
      } else if (appointment.date.seconds || appointment.date._seconds) {
        // Seems like a Firestore timestamp
        warnings.push("Date is in Firestore timestamp format - may need conversion");
      } else {
        warnings.push(`Unknown date format: ${typeof appointment.date}`);
      }
    } catch (err) {
      errors.push(`Date error: ${err.message}`);
    }
  }
  
  // Check ID fields
  if (!appointment.recipientId && !appointment.donorId && !appointment.patientId && !appointment.userId) {
    warnings.push("No ID fields found (recipientId, donorId, patientId, or userId)");
  }
  
  // Check type
  if (!appointment.type) {
    warnings.push("Missing type field");
  }
  
  // Check status
  if (!appointment.status) {
    warnings.push("Missing status field");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    appointment
  };
};

/**
 * Debugs a list of appointments and logs information about them
 * @param {Array} appointments - The list of appointments to debug
 */
export const debugAppointmentsList = (appointments) => {
  console.group("🔍 Appointment List Debug");
  console.log(`Total appointments: ${appointments.length}`);
  
  if (appointments.length === 0) {
    console.log("❌ No appointments to analyze");
    console.groupEnd();
    return;
  }
  
  // Group by status
  const statusGroups = appointments.reduce((acc, apt) => {
    const status = apt.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  console.log("📊 Status breakdown:", statusGroups);
  
  // Check date fields
  const dateFormats = appointments.reduce((acc, apt) => {
    let format = 'unknown';
    if (!apt.date) format = 'missing';
    else if (apt.date instanceof Date) format = 'Date object';
    else if (typeof apt.date === 'string') format = 'string';
    else if (apt.date.seconds) format = 'Firestore timestamp';
    else if (apt.date._seconds) format = 'Firestore server timestamp';
    
    acc[format] = (acc[format] || 0) + 1;
    return acc;
  }, {});
  
  console.log("📅 Date format breakdown:", dateFormats);
  
  // Validate a few appointments
  console.log("🧪 Sampling a few appointments for issues:");
  
  // Check first appointment
  if (appointments.length > 0) {
    const firstValidation = validateAppointment(appointments[0]);
    console.log("First appointment:", firstValidation);
  }
  
  // Check random appointment if we have more than 2
  if (appointments.length > 2) {
    const randomIndex = Math.floor(Math.random() * appointments.length);
    const randomValidation = validateAppointment(appointments[randomIndex]);
    console.log(`Random appointment (index ${randomIndex}):`, randomValidation);
  }
  
  console.groupEnd();
};

/**
 * Helper function to fix common appointment data issues
 * @param {Array} appointments - Appointments to fix
 * @returns {Array} - Fixed appointments
 */
export const fixAppointmentsList = (appointments) => {
  console.log("🔧 Fixing appointments list");
  
  // Handle case where appointments is not an array or empty
  if (!appointments || !Array.isArray(appointments)) {
    console.warn("fixAppointmentsList received invalid input:", appointments);
    return [];
  }
  
  // Log how many appointments we're processing
  console.log(`Processing ${appointments.length} appointments for fixing`);
  
  return appointments.map(apt => {
    if (!apt) {
      console.warn("Encountered null/undefined appointment in list");
      return null;
    }
    
    // Make a copy to avoid modifying original
    const fixedApt = { ...apt };
    
    // Fix date field if needed
    if (fixedApt.date) {
      try {
        // Convert Firebase timestamps to Date objects
        if (typeof fixedApt.date.toDate === 'function') {
          fixedApt.date = fixedApt.date.toDate();
        }
        // Convert string dates to Date objects
        else if (typeof fixedApt.date === 'string') {
          fixedApt.date = new Date(fixedApt.date);
        }
        // Convert seconds timestamp
        else if (fixedApt.date.seconds) {
          fixedApt.date = new Date(fixedApt.date.seconds * 1000);
        }
      } catch (e) {
        console.warn("Error fixing date for appointment:", fixedApt.id, e);
        fixedApt.date = new Date(); // Fallback
      }
    } else {
      fixedApt.date = new Date(); // Default
    }
    
    // Ensure we have an ID
    if (!fixedApt.id) {
      fixedApt.id = `fixed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Ensure we have a status
    if (!fixedApt.status) {
      fixedApt.status = "scheduled";
    }
    
    return fixedApt;
  }).filter(Boolean); // Remove null values
};