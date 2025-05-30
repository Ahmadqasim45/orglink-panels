// Helper functions for recipient management

/**
 * Gets a nested value from an object, with fallback to a default value
 */
export const getNestedValue = (obj, path, defaultValue = "N/A") => {
  if (!obj) return defaultValue;

  const keys = typeof path === "string" ? path.split(".") : [path];
  let value = obj;

  for (const key of keys) {
    if (value === undefined || value === null) return defaultValue;
    value = value[key];
  }

  if (value === undefined || value === null || value === "") return defaultValue;
  return value;
};

/**
 * Gets a safe value, trying multiple possible paths
 */
export const getSafeValue = (obj, fieldPaths, defaultValue = "N/A") => {
  if (!obj) return defaultValue;

  if (Array.isArray(fieldPaths)) {
    for (const path of fieldPaths) {
      const value = getNestedValue(obj, path);
      if (value !== defaultValue) return value;
    }
    return defaultValue;
  }

  return getNestedValue(obj, fieldPaths, defaultValue);
};

/**
 * Format a date safely
 */
export const formatDate = (date) => {
  if (!date) return "N/A";

  try {
    if (typeof date === "object") {
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
    }
    if (typeof date === "string") {
      return new Date(date).toLocaleDateString();
    }
  } catch (error) {
    console.error("Error formatting date:", error, date);
  }

  return "N/A";
};

/**
 * Get recipient name from different possible fields
 */
export const getRecipientName = (recipient) => {
  return getSafeValue(recipient, ["fullName", "userData.fullName", "userData.name", "userData.displayName"]);
};

/**
 * Get recipient email from different possible fields
 */
export const getRecipientEmail = (recipient) => {
  return getSafeValue(recipient, ["email", "userData.email"]);
};

/**
 * Get recipient phone from different possible fields
 */
export const getRecipientPhone = (recipient) => {
  return getSafeValue(recipient, ["phone", "userData.phone", "userData.phoneNumber"]);
};

/**
 * Get recipient's medical condition
 */
export const getRecipientCondition = (recipient) => {
  return getSafeValue(recipient, ["diagnosedCondition"]);
};

/**
 * Get organ type from recipient data
 */
export const getOrganType = (recipient) => {
  const organType = getSafeValue(recipient, "organType", "");
  return organType ? organType.charAt(0).toUpperCase() + organType.slice(1) : "N/A";
};

/**
 * Get admin status text
 */
export const getAdminStatusText = (adminStatus) => {
  return adminStatus?.toLowerCase() || "pending";
};

/**
 * Get display status for recipient
 */
export const getDisplayStatus = (recipient) => {
  if (recipient.status === "doctor-approved") {
    return `Approved by ${recipient.hospitalName}`;
  }
  if (recipient.status === "doctor-rejected") {
    return `Rejected by ${recipient.hospitalName}`;
  }
  return recipient.status.replace(/_/g, ' ').toUpperCase();
};
