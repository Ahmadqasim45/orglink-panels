/**
 * Utility functions to ensure appointment data is handled safely in React components
 */

import { safeRenderValue, sanitizeObject } from './safeRendering';

/**
 * Safely process appointment data to prevent "Objects are not valid as React child" errors
 * @param {Object} appointment - The appointment object to process
 * @returns {Object} A safe version of the appointment object
 */
export const processSafeAppointment = (appointment) => {
  if (!appointment || typeof appointment !== 'object') {
    return appointment;
  }

  // Create a new appointment object with safely processed fields
  const safeAppointment = { ...appointment };
  
  // Specifically handle fields that might be complex objects
  if (typeof appointment.purpose === 'object') {
    safeAppointment.purpose = safeRenderValue(appointment.purpose, 'Consultation');
  }
  
  if (typeof appointment.patientType === 'object') {
    safeAppointment.patientType = safeRenderValue(appointment.patientType, 'donor');
  }
  
  if (typeof appointment.existingAppointment === 'object') {
    safeAppointment.existingAppointment = safeRenderValue(
      appointment.existingAppointment, 
      'Yes'
    );
  }
  
  return safeAppointment;
};

/**
 * Process a list of appointments to ensure all can be safely rendered
 * @param {Array} appointments - List of appointment objects
 * @returns {Array} Safely processed appointments
 */
export const processSafeAppointmentList = (appointments) => {
  if (!Array.isArray(appointments)) {
    return [];
  }
  
  return appointments.map(processSafeAppointment);
};

export default {
  processSafeAppointment,
  processSafeAppointmentList
};
