/**
 * Appointment System Integration Module
 * 
 * This module establishes connections between all appointment-related components
 * to ensure consistent appointment display and management across the system.
 */

import { getAppointmentsForUser, createAppointment, updateAppointmentData, moveAppointment, getAllAppointmentsByType } from './appointmentIntegration';
import { fixAllAppointments, fixMissingIds } from './appointmentFixer';
import { fixDoctorScheduledAppointments } from './fixDoctorScheduledAppointments';
import { diagnoseRecipientAppointments, fixRecipientAppointments } from './testRecipientAppointments';

/**
 * Initialize appointment connections across the system
 * This function should be called when the app starts to establish all necessary connections
 */
export const initializeAppointmentSystem = () => {
  // Register all necessary global functions and event listeners
  window.orglink = window.orglink || {};
  window.orglink.appointments = {
    // Core functions
    getAppointmentsForUser,
    createAppointment,
    updateAppointment: updateAppointmentData,
    moveAppointment,
    
    // Fix & diagnostic utilities
    fixAllAppointments,
    fixMissingIds,
    diagnoseRecipientAppointments
  };
  
  // Log initialization
  console.log("Orglink appointment system initialized");
};

/**
 * Get appointments for the current user
 * Used as a standard interface for all components
 * @param {string} userId - User ID to get appointments for
 * @param {string} userType - Type of user (recipient, donor, doctor)
 * @returns {Promise<Array>} - Array of appointments
 */
export const loadUserAppointments = async (userId, userType = 'recipient') => {
  try {
    // If no userId provided but userType is, get all appointments of that type
    if (!userId) {
      if (userType) {
        console.log(`Getting all appointments for user type: ${userType}`);
        return await getAllAppointmentsByType(userType);
      } else {
        console.error("No user ID or type provided to loadUserAppointments");
        return [];
      }
    }
    
    return await getAppointmentsForUser(userId, userType);
  } catch (error) {
    console.error("Error loading user appointments:", error);
    return [];
  }
};

/**
 * Create a new appointment 
 * @param {Object} appointmentData - Appointment data
 * @param {string} patientType - Type of patient (recipient or donor)
 * @returns {Promise<Object>} - Result object
 */
export const scheduleNewAppointment = async (appointmentData, patientType) => {
  try {
    if (!appointmentData || !patientType) {
      throw new Error("Missing required appointment data");
    }
    
    // Mark appointments scheduled by doctors
    if (appointmentData.doctorId) {
      appointmentData.doctorScheduled = true;
      appointmentData.scheduledByDoctor = true;
    }
    
    const result = await createAppointment(appointmentData, patientType);
    return result;
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Fix any appointment issues for a specific user
 * @param {string} userId - User ID to fix appointments for
 * @param {string} userType - Type of user (recipient or donor)
 * @returns {Promise<Object>} - Result object
 */
export const fixUserAppointments = async (userId, userType = 'recipient') => {
  try {
    if (!userId) {
      throw new Error("User ID is required to fix appointments");
    }
    
    // First fix any missing ID fields
    await fixMissingIds(userId, userType);
    
    // Then fix any misplaced appointments
    const result = await fixAllAppointments(userId, userType);
    
    return result;
  } catch (error) {
    console.error("Error fixing user appointments:", error);
    return { success: false, error: error.message };
  }
};
