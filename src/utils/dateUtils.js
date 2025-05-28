/**
 * Format a date from various formats to a readable string
 * @param {Date|Object|string} dateValue - The date value to format
 * @param {string} fallback - Fallback text if date is invalid
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateValue, fallback = 'N/A') => {
  if (!dateValue) return fallback;
  
  try {
    // Handle Firestore timestamp
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    
    // Handle Date object
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString();
    }
    
    // Handle ISO string or other date string
    if (typeof dateValue === 'string') {
      if (dateValue.includes('T') || dateValue.includes('-')) {
        return new Date(dateValue).toLocaleDateString();
      }
      return dateValue;
    }
    
    // Handle timestamp as number
    if (typeof dateValue === 'number') {
      return new Date(dateValue).toLocaleDateString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }
  
  return fallback;
};