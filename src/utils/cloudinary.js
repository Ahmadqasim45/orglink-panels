// utils/cloudinary.js
import axios from "axios";

const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.REACT_APP_CLOUDINARY_API_KEY;
const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
const defaultFolderName = "Hospitals Licenses";

export const uploadToCloudinary = async (file, customFolder, progressCallback) => {
  const folderName = customFolder || defaultFolderName;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("cloud_name", cloudName);
  formData.append("api_key", apiKey);
  formData.append("upload_preset", uploadPreset); 
  formData.append("folder", folderName);
  
  try {
    // If we have a progress callback, use axios with progress event
    if (progressCallback && typeof progressCallback === 'function') {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            progressCallback(percentCompleted);
          }
        }
      );
      return response.data.secure_url;
    } else {
      // Standard upload without progress
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );
      return response.data.secure_url; // Returns the URL of the uploaded file
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};