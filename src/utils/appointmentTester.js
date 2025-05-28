/**
 * Utility for testing appointment creation and display
 */
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Creates test appointments for debugging the appointment display
 * 
 * @param {string} recipientId - ID of the recipient to create appointments for
 * @returns {Promise<Object>} Result of the operation
 */
export const createTestRecipientAppointment = async (recipientId, options = {}) => {
  try {
    if (!recipientId) {
      throw new Error('Recipient ID is required');
    }
    
    if (!auth.currentUser) {
      throw new Error('User must be logged in to create test appointments');
    }
    
    const collectionName = options.collectionName || 'recipientAppointments';
    const date = options.date || new Date();
    date.setHours(date.getHours() + Math.floor(Math.random() * 72));
    
    // Create a comprehensive appointment object with all fields that might be needed
    const appointmentData = {
      // Primary identification fields
      recipientId: recipientId,
      userId: recipientId, // Also add userId for compatibility
      patientId: recipientId, // Also add patientId for compatibility
      
      // Doctor information
      doctorId: auth.currentUser.uid,
      doctorName: options.doctorName || 'Dr. Test Doctor',
      hospitalName: options.hospitalName || 'Test Hospital',
      
      // Appointment details
      date: Timestamp.fromDate(date),
      time: `${9 + Math.floor(Math.random() * 8)}:00 ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
      status: 'scheduled',
      
      // Type indicators - critical for appointment display logic
      type: 'recipient',
      patientType: 'recipient',
      appointmentType: options.purpose || 'Test Appointment',
      appointmentFor: 'recipient',
      
      // Additional details
      purpose: options.purpose || 'Test Appointment',
      createdAt: Timestamp.now(),
      notes: options.notes || 'This is a test appointment created for debugging',
      recipientName: options.recipientName || 'Test Recipient',
      
      // Medical information
      organType: options.organType || 'Kidney',
      bloodType: options.bloodType || 'O+',
      urgencyLevel: options.urgencyLevel || 'Medium'
    };
    
    const result = await addDoc(collection(db, collectionName), appointmentData);
    
    console.log(`Test appointment created with ID: ${result.id} in collection ${collectionName}`);
    
    return {
      success: true,
      id: result.id,
      message: `Test appointment created in ${collectionName}`
    };
  } catch (error) {
    console.error('Error creating test appointment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Creates test appointments in all relevant collections for testing
 * 
 * @param {string} recipientId - ID of the recipient to create appointments for
 */
export const createTestAppointmentsInAllCollections = async (recipientId) => {
  if (!recipientId) {
    throw new Error('Recipient ID is required');
  }
  
  const results = [];
  
  // Test in recipientAppointments collection
  results.push(await createTestRecipientAppointment(recipientId, {
    collectionName: 'recipientAppointments',
    purpose: 'Regular Checkup',
    doctorName: 'Dr. Smith'
  }));
  
  // Test in appointments collection
  results.push(await createTestRecipientAppointment(recipientId, {
    collectionName: 'appointments',
    purpose: 'Follow-up Consultation',
    doctorName: 'Dr. Johnson'
  }));
  
  // Test in donorAppointments collection (with recipientId)
  results.push(await createTestRecipientAppointment(recipientId, {
    collectionName: 'donorAppointments',
    purpose: 'Pre-surgery Testing',
    doctorName: 'Dr. Wilson'
  }));
  
  return results;
};
