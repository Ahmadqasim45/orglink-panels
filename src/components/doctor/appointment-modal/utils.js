// Utility functions for the appointment modal

/**
 * Sanitizes an object by removing any properties that could cause React rendering issues
 * This is important for preventing "Objects are not valid as React child" errors
 */
export const sanitizeObject = (obj) => {
  // Create a new object to avoid mutating the input
  const result = {};
  
  // Process each property
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      // For objects, recursively sanitize
      result[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      // For arrays, sanitize each element
      result[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? sanitizeObject(item) 
          : item
      );
    } else {
      // Primitive values are safe to use directly
      result[key] = value;
    }
  });
  
  return result;
};
