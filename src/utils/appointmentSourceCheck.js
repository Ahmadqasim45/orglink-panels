/**
 * Utilities to check and manipulate appointment sources
 * Used to track where appointments originate from and handle source-specific logic
 */

/**
 * Checks if an appointment was created from the StaffDashboard
 * @param {Object} appointment - The appointment to check
 * @returns {boolean} - True if the appointment was created from StaffDashboard
 */
export const isFromStaffDashboard = (appointment) => {
  if (!appointment) return false;
  
  // Check for source marker
  if (appointment.source === 'staffDashboard') return true;
  
  // Check for creator type
  if (appointment.createdBy === 'doctor' || appointment.createdBy === 'staff') return true;
  
  // Check for doctor ID
  if (appointment.doctorId && !appointment.patientCreated) return true;
  
  // Not from staff dashboard
  return false;
};

/**
 * Gets all appointments that were created from the StaffDashboard
 * @param {Array} appointments - The list of appointments to filter
 * @returns {Array} - Filtered list of appointments created from StaffDashboard
 */
export const getStaffDashboardAppointments = (appointments) => {
  if (!appointments || !Array.isArray(appointments)) {
    return [];
  }
  
  return appointments.filter(isFromStaffDashboard);
};