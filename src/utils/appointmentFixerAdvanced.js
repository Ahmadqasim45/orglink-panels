/**
 * Advanced utilities for fixing and normalizing appointment data
 * Used to resolve issues with the appointment data structure and ensure consistency
 */

/**
 * Normalizes appointment data structure to ensure it meets expected format
 * @param {Array} appointments - Array of appointment objects to fix
 * @returns {Array} - Fixed appointment array
 */
export const fixAppointmentsAdvanced = (appointments) => {
  if (!appointments || !Array.isArray(appointments)) {
    return [];
  }

  return appointments.map(appointment => {
    if (!appointment) return null;

    // Create a normalized version of the appointment
    const fixedAppointment = {
      id: appointment.id || `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: normalizeDate(appointment.date),
      status: appointment.status || 'scheduled',
      doctorName: appointment.doctorName || 'Unknown Doctor',
      hospitalName: appointment.hospitalName || 'Unknown Hospital',
      notes: appointment.notes || '',
      type: appointment.type || 'unknown'
    };

    // Preserve all original fields
    return { ...appointment, ...fixedAppointment };
  }).filter(Boolean); // Remove null values
};

/**
 * Normalizes date values to ensure they are proper Date objects
 * @param {*} dateValue - Date value in various possible formats
 * @returns {Date} - JavaScript Date object
 */
const normalizeDate = (dateValue) => {
  if (!dateValue) return new Date();
  
  try {
    // Handle Firebase timestamp
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    // Handle Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Handle timestamp as number
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    
    // Handle seconds from Firebase timestamp
    if (typeof dateValue === 'object' && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }
    
    // Handle ISO string
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }

    // Default
    return new Date();
  } catch (e) {
    console.error("Error normalizing date:", e);
    return new Date();
  }
};

/**
 * Filter appointments to show only ones related to recipients
 * @param {Array} appointments - Array of appointment objects 
 * @returns {Array} - Filtered appointments
 */
export const filterRecipientAppointments = (appointments) => {
  if (!appointments || !Array.isArray(appointments)) {
    return [];
  }

  return appointments.filter(appointment => {
    if (!appointment) return false;
    
    // Check for recipient-specific fields
    if (appointment.recipientId) return true;
    if (appointment.type === 'recipient') return true;
    
    // Check appointment source
    if (appointment.source === 'recipientAppointments') return true;
    
    return false;
  });
};