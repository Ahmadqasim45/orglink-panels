/**
 * Utilities to enforce and validate appointment ownership
 * Used to ensure users can only access appointments they own or have permission to see
 */

/**
 * Strictly checks if a user owns or has permission to access an appointment
 * @param {Object} appointment - The appointment to check
 * @param {string} userId - The ID of the user
 * @param {string} userRole - The role of the user (admin, doctor, donor, recipient)
 * @returns {boolean} - True if the user owns or has permission to access the appointment
 */
export const strictOwnershipCheck = (appointment, userId, userRole) => {
  if (!appointment || !userId) {
    return false;
  }
  
  // Admins can access all appointments
  if (userRole === 'admin') {
    return true;
  }
  
  // Doctors can access appointments where they are the doctor or where they supervise
  if (userRole === 'doctor') {
    if (appointment.doctorId === userId) {
      return true;
    }
    if (appointment.supervisingDoctorId === userId) {
      return true;
    }
  }
  
  // Donors can only access their own appointments
  if (userRole === 'donor') {
    return appointment.donorId === userId || appointment.patientId === userId || appointment.userId === userId;
  }
  
  // Recipients can only access their own appointments
  if (userRole === 'recipient') {
    return appointment.recipientId === userId || appointment.patientId === userId || appointment.userId === userId;
  }
  
  // Default: no access
  return false;
};

/**
 * Enforces strict ownership rules on a list of appointments
 * @param {Array} appointments - The list of appointments to filter
 * @param {string} userId - The ID of the user
 * @param {string} userRole - The role of the user (admin, doctor, donor, recipient)
 * @returns {Array} - Filtered list of appointments the user has permission to access
 */
export const enforceStrictOwnership = (appointments, userId, userRole) => {
  if (!appointments || !Array.isArray(appointments) || !userId) {
    return [];
  }
  
  return appointments.filter(appointment => strictOwnershipCheck(appointment, userId, userRole));
};

/**
 * Validates that a user has ownership of an appointment
 * @param {Object} appointment - The appointment to validate ownership for
 * @param {Object} user - The user object
 * @returns {boolean} - True if the user owns the appointment
 */
export const validateOwnership = (appointment, user) => {
  if (!appointment || !user || !user.uid) {
    return false;
  }
  
  return strictOwnershipCheck(appointment, user.uid, user.role);
};