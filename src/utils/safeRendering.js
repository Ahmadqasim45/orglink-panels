// filepath: e:\hassan projects\orglink-panels\organsystem\src\utils\safeRendering.js
/**
 * Utility functions to help prevent "Objects are not valid as React child" errors
 * by ensuring only primitive values are rendered in JSX
 */

/**
 * Safely convert any value to a string that can be used in React JSX
 * @param {*} value - The value to render safely
 * @param {string} defaultValue - Default value to use if input is undefined/null
 * @returns {string} A safe string representation
 */
export const safeRenderValue = (value, defaultValue = '') => {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  // Handle primitive types that can be rendered directly
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  
  // Handle Firestore timestamp objects
  if (value && typeof value === 'object' && value.seconds !== undefined) {
    return new Date(value.seconds * 1000).toLocaleString();
  }
  
  // Handle arrays by joining elements
  if (Array.isArray(value)) {
    return value.map(item => safeRenderValue(item)).join(', ');
  }
  
  // For objects (which can't be rendered directly in React), convert to string
  if (typeof value === 'object') {
    // Special case for appointment data objects
    if (value && (value.patientId || value.patientType || value.purpose || value.existingAppointment)) {
      // Handle the specific appointment data object that's causing issues
      const parts = [];
      if (value.purpose) parts.push(`Purpose: ${value.purpose}`);
      if (value.patientType) parts.push(`Type: ${value.patientType}`);
      return parts.join(', ') || '[Appointment Data]';
    }
    
    // Try to get a meaningful string representation
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn("Failed to stringify object for rendering:", error);
      return '[Object]';
    }
  }
  
  // Fallback for any other type
  return String(value);
};

/**
 * Creates a safe object by recursively ensuring all properties are safe to render
 * @param {Object} obj - The object to sanitize
 * @returns {Object} A sanitized copy of the object
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Handle objects
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // Recursively sanitize nested objects
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = sanitizeObject(value);
      } else {
        // Use primitive values as is
        result[key] = value;
      }
    }
  }
  
  return result;
};

/**
 * React component that safely renders any value
 */
export const SafeRender = ({ value, defaultValue = '' }) => {
  return safeRenderValue(value, defaultValue);
};

export default {
  safeRenderValue,
  sanitizeObject,
  SafeRender
};