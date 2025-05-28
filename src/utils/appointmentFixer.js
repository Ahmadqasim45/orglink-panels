/**
 * Comprehensive appointment fixer utility
 * Use this when experiencing issues with appointments not showing up correctly
 */
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore';

/**
 * Fix all appointments for a user
 * @param {string} userId - The user ID to fix appointments for
 * @param {string} userType - Type of user ('recipient' or 'donor')
 * @returns {Promise<object>} Result information
 */
export const fixAllAppointments = async (userId, userType = 'recipient') => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    console.log(`Fixing appointments for ${userType} with ID: ${userId}`);
    
    // Track statistics
    const stats = {
      scanned: 0,
      fixed: 0,
      created: 0,
      errors: 0,
      details: []
    };
    
    // Define which collections to search based on user type
    const collectionsToSearch = [
      'appointments',
      `${userType}Appointments`,
      userType === 'recipient' ? 'donorAppointments' : 'recipientAppointments',
      'doctorScheduledAppointments'
    ];
    
    // Find all appointments across all collections
    const allAppointments = [];
    
    for (const collectionName of collectionsToSearch) {
      try {
        // Create field queries for this user ID
        const fieldNames = [
          `${userType}Id`, 
          'patientId',
          'userId',
          `${userType === 'recipient' ? 'donor' : 'recipient'}Id`
        ];
        
        for (const fieldName of fieldNames) {
          const fieldQuery = query(
            collection(db, collectionName),
            where(fieldName, '==', userId)
          );
          
          const snapshot = await getDocs(fieldQuery);
          stats.scanned += snapshot.size;
          
          if (!snapshot.empty) {
            snapshot.forEach(doc => {
              allAppointments.push({
                id: doc.id,
                collectionName,
                data: doc.data(),
              });
            });
          }
        }
      } catch (error) {
        console.error(`Error searching collection ${collectionName}:`, error);
        stats.errors++;
        stats.details.push(`Error in ${collectionName}: ${error.message}`);
      }
    }
    
    console.log(`Found a total of ${allAppointments.length} appointments for this user`);
    
    // Process appointments to fix issues
    for (const appointment of allAppointments) {
      try {
        // Skip if this appointment is in the right collection already
        const targetCollection = `${userType}Appointments`;
        if (appointment.collectionName === targetCollection) continue;
        
        // Create new appointment document in the correct collection
        const cleanAppointmentData = { ...appointment.data };
        
        // Ensure all proper fields are set
        cleanAppointmentData[`${userType}Id`] = userId;
        cleanAppointmentData.type = userType;
        cleanAppointmentData.patientType = userType;
        
        // Ensure date is properly formatted
        if (cleanAppointmentData.date && typeof cleanAppointmentData.date !== 'object') {
          cleanAppointmentData.date = Timestamp.now(); // Default to now if format is wrong
        }
        
        // Add reference to original appointment
        cleanAppointmentData.originalAppointmentId = appointment.id;
        cleanAppointmentData.originalCollection = appointment.collectionName;
        
        // Create the fixed appointment
        const newRef = await addDoc(collection(db, targetCollection), cleanAppointmentData);
        
        console.log(`Created fixed appointment ${newRef.id} in ${targetCollection}`);
        stats.created++;
        stats.fixed++;
        stats.details.push(`Fixed: ${appointment.id} → ${newRef.id}`);
      } catch (error) {
        console.error(`Error fixing appointment ${appointment.id}:`, error);
        stats.errors++;
        stats.details.push(`Error fixing ${appointment.id}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      userId,
      userType,
      message: `Fixed ${stats.fixed} appointments for ${userType} ${userId}`,
      stats
    };
  } catch (error) {
    console.error('Error in fixAllAppointments:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Utility function to create missing ID fields
 */
export const fixMissingIds = async (userId, userType = 'recipient') => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const collectionName = `${userType}Appointments`;
    const appointmentsRef = collection(db, collectionName);
    const userIdFieldName = `${userType}Id`;
    
    // Find appointments with missing patientId or userId
    const q = query(appointmentsRef, where(userIdFieldName, '==', userId));
    const snapshot = await getDocs(q);
    
    let fixedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const needsUpdate = !data.patientId || !data.userId;
      
      if (needsUpdate) {
        try {
          await updateDoc(doc(db, collectionName, docSnapshot.id), {
            patientId: userId,
            userId: userId,
            type: userType,
            patientType: userType
          });
          
          fixedCount++;
        } catch (error) {
          console.error(`Error updating appointment ${docSnapshot.id}:`, error);
        }
      }
    }
    
    return {
      success: true,
      message: `Fixed ${fixedCount} appointments with missing IDs`
    };
  } catch (error) {
    console.error('Error in fixMissingIds:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
