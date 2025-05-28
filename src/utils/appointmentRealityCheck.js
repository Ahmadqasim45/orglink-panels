/**
 * Utilities to verify that appointments are valid and real
 * Used for filtering out potentially corrupt or invalid appointment data
 */

/**
 * Checks if an appointment object has the minimum required fields to be valid
 * @param {Object} appointment - The appointment to check
 * @returns {boolean} - True if the appointment appears to be valid
 */
export const isRealAppointment = (appointment) => {
  // Must be an object
  if (!appointment || typeof appointment !== 'object') {
    return false;
  }
  
  // Must have an ID
  if (!appointment.id) {
    return false;
  }
  
  // Must have a date (even if it's invalid)
  if (!appointment.date) {
    return false;
  }
  
  // Must have at least one ID field (patient/donor/recipient/user)
  if (!appointment.patientId && 
      !appointment.donorId && 
      !appointment.recipientId && 
      !appointment.userId) {
    return false;
  }
  
  // If it passes all checks, it's probably real
  return true;
};

/**
 * Filters a list of appointments to only include ones that pass reality check
 * @param {Array} appointments - The list of appointments to filter
 * @returns {Array} - Filtered list of valid appointments
 */
export const filterOnlyRealAppointments = (appointments) => {
  if (!appointments || !Array.isArray(appointments)) {
    return [];
  }
  
  // Count how many were filtered out for logging
  const originalCount = appointments.length;
  const filteredAppointments = appointments.filter(isRealAppointment);
  const filteredCount = originalCount - filteredAppointments.length;
  
  if (filteredCount > 0) {
    console.warn(`Filtered out ${filteredCount} invalid appointments.`);
  }
  
  return filteredAppointments;
};