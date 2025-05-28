import React, { useState, useEffect, useContext, useCallback } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { FaFilePdf, FaFileImage, FaFile, FaTimes, FaEye, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { UserContext } from '../../contexts/UserContext';

// Constants
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // Further reduced to 1.5MB for better upload reliability
const UPLOAD_TIMEOUT = 120000; // Increased to 120 seconds (2 minutes) timeout
const MAX_RETRY_ATTEMPTS = 3;
const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  UPLOADING: 'uploading',
  SAVING: 'saving',
  RETRYING: 'retrying'
};

// Helper Components
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex flex-col justify-center items-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#973131] mb-4"></div>
    <p className="text-gray-600 text-sm">{message}</p>
  </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  </div>
);

const AppointmentInfo = ({ appointment }) => {
  const formatDate = (date) => {
    if (!date) return 'Not specified';
    try {
      if (typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getDonorName = () => {
    return appointment.patientName || 
           appointment.donorName || 
           appointment.userName || 
           'Unknown Donor';
  };

  const getOrganType = () => {
    return appointment.organType || 
           appointment.organToDonate || 
           'Not specified';
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
        <FaEye className="mr-2 text-gray-600" />
        Appointment Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500 font-medium">Donor Name</p>
          <p className="text-gray-900 font-medium">{getDonorName()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Organ to Donate</p>
          <p className="text-gray-900 font-medium">{getOrganType()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Appointment Date</p>
          <p className="text-gray-900 font-medium">{formatDate(appointment.date)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Doctor</p>
          <p className="text-gray-900 font-medium">{appointment.doctorName || 'Not assigned'}</p>
        </div>
      </div>
    </div>
  );
};

const FileUploadSection = ({ 
  selectedFile, 
  onFileChange, 
  existingDocument, 
  uploadProgress, 
  isUploading 
}) => {
  const getFileIcon = (file) => {
    if (!file) return <FaFile className="text-gray-500" size={24} />;
    
    const fileType = file.type;
    if (fileType.includes('image')) {
      return <FaFileImage className="text-blue-500" size={24} />;
    } else if (fileType.includes('pdf')) {
      return <FaFilePdf className="text-red-500" size={24} />;
    }
    return <FaFile className="text-gray-500" size={24} />;
  };

  const formatFileSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, JPEG, PNG)');
      e.target.value = '';
      return;
    }    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 1.5MB for optimal upload reliability');
      e.target.value = '';
      return;
    }

    onFileChange(file);
  };

  if (existingDocument) {
    return (
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">
          Attached Medical Document
        </label>
        <div className="border-2 border-gray-300 rounded-md px-6 py-8 text-center bg-gray-50">
          {existingDocument.hasAttachment ? (
            <div className="flex items-center justify-center space-x-3">
              <FaFilePdf className="text-red-500" size={24} />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {existingDocument.fileName || 'Medical document'}
                </p>
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <FaCheckCircle className="mr-1" />
                  Document submitted for review
                </p>
              </div>
            </div>
          ) : (
            <div>
              <FaFile className="mx-auto text-gray-400 text-3xl mb-2" />
              <p className="text-sm text-gray-500">No document was attached</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-gray-700 font-medium mb-2">
        Attach Medical Document Image (Optional)
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-md px-6 py-8 text-center cursor-pointer hover:border-[#973131] transition-colors">
        <input
          type="file"
          id="document-file"
          className="hidden"
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={isUploading}
          aria-label="Upload medical document image"
        />
          <label htmlFor="document-file" className="cursor-pointer">
          {!selectedFile ? (
            <div>
              <FaFile className="mx-auto text-gray-400 text-3xl mb-2" />
              <p className="text-sm text-gray-500">
                Click to upload or drag and drop
              </p>              <p className="text-xs text-gray-400 mt-1">
                JPG, JPEG, PNG images only (Max 1.5MB for optimal reliability)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              {getFileIcon(selectedFile)}
              <div className="text-left w-full max-w-xs">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)} MB
                </p>
                
                {isUploading && uploadProgress > 0 && (
                  <div className="mt-2 w-full">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-right mt-1 text-blue-600">
                      {uploadProgress}% uploaded
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

const MedicalStatusSection = ({ 
  medicalStatus, 
  onStatusChange, 
  notes, 
  onNotesChange, 
  isReadOnly 
}) => (
  <>
    <div className="mb-6">
      <label className="block text-gray-700 font-medium mb-3">
        Medical Status Assessment *
      </label>
      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          <input
            id="medically_fit"
            name="medical_status"
            type="radio"
            value="medically_fit"
            checked={medicalStatus === 'medically_fit'}
            onChange={() => onStatusChange('medically_fit')}
            disabled={isReadOnly}
            className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"
          />
          <label 
            htmlFor="medically_fit" 
            className={`ml-2 block text-sm font-medium ${
              medicalStatus === 'medically_fit' ? 'text-green-700' : 'text-gray-700'
            }`}
          >
            Medically Fit
          </label>
        </div>
        <div className="flex items-center">
          <input
            id="medically_unfit"
            name="medical_status"
            type="radio"
            value="medically_unfit"
            checked={medicalStatus === 'medically_unfit'}
            onChange={() => onStatusChange('medically_unfit')}
            disabled={isReadOnly}
            className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300"
          />
          <label 
            htmlFor="medically_unfit" 
            className={`ml-2 block text-sm font-medium ${
              medicalStatus === 'medically_unfit' ? 'text-red-700' : 'text-gray-700'
            }`}
          >
            Medically Unfit
          </label>
        </div>
      </div>
    </div>

    <div className="mb-6">
      <label className="block text-gray-700 font-medium mb-2" htmlFor="notes">
        Medical Notes
      </label>
      <textarea
        id="notes"
        className={`w-full px-4 py-2 border border-gray-300 rounded-md transition-colors ${
          isReadOnly 
            ? 'bg-gray-50 text-gray-700' 
            : 'focus:outline-none focus:ring-2 focus:ring-[#973131] focus:border-transparent'
        }`}
        rows="4"
        placeholder={isReadOnly ? "No notes provided" : "Add any relevant medical notes..."}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        readOnly={isReadOnly}
        aria-describedby="notes-help"
      />
      <p id="notes-help" className="text-xs text-gray-500 mt-1">
        {isReadOnly ? '' : 'Optional: Add detailed observations or recommendations'}
      </p>
    </div>
  </>
);

// Main Component
const DocumentUploadModal = ({ 
  isOpen, 
  onClose, 
  appointmentId, 
  onDocumentUploaded = null 
}) => {
  const { user } = useContext(UserContext);
  
  // State management
  const [appointment, setAppointment] = useState(null);
  const [existingDocument, setExistingDocument] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [medicalStatus, setMedicalStatus] = useState('medically_fit');
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingState, setLoadingState] = useState(LOADING_STATES.IDLE);
  const [error, setError] = useState(null);
  // Computed states
  const isLoading = loadingState === LOADING_STATES.LOADING;
  const isUploading = loadingState === LOADING_STATES.UPLOADING;
  const isSaving = loadingState === LOADING_STATES.SAVING;
  const isRetrying = loadingState === LOADING_STATES.RETRYING;
  const isProcessing = isUploading || isSaving || isRetrying;
  const isReadOnly = !!existingDocument;
  // Reset state when modal closes
  const resetState = useCallback(() => {
    setAppointment(null);
    setExistingDocument(null);
    setSelectedFile(null);
    setMedicalStatus('medically_fit');
    setNotes('');
    setUploadProgress(0);
    setLoadingState(LOADING_STATES.IDLE);
    setError(null);
  }, []);
  // Fetch appointment details
  const fetchAppointmentDetails = useCallback(async () => {
    if (!appointmentId) {
      setError("No appointment ID provided");
      return;
    }

    try {
      setLoadingState(LOADING_STATES.LOADING);
      setError(null);

      console.log("Fetching appointment details for ID:", appointmentId);

      // Try donor appointments collection first
      let appointmentRef = doc(db, "donorAppointments", appointmentId);
      let appointmentSnap = await getDoc(appointmentRef);
      
      console.log("Donor appointments check:", appointmentSnap.exists());
      
      // Fallback to general appointments collection
      if (!appointmentSnap.exists()) {
        appointmentRef = doc(db, "appointments", appointmentId);
        appointmentSnap = await getDoc(appointmentRef);
        console.log("General appointments check:", appointmentSnap.exists());
      }
      
      if (!appointmentSnap.exists()) {
        console.log("No appointment found in either collection");
        throw new Error("Appointment not found");
      }
      
      const appointmentData = {
        id: appointmentSnap.id,
        ...appointmentSnap.data()
      };

      console.log("Found appointment data:", appointmentData);

      // Check for existing documents
      const docQuery = query(
        collection(db, "donorUploadDocuments"),
        where("appointmentId", "==", appointmentId)
      );
      
      const querySnapshot = await getDocs(docQuery);
      
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        const docWithId = {
          id: querySnapshot.docs[0].id,
          ...docData
        };
        
        setExistingDocument(docWithId);
        setMedicalStatus(docData.medicalStatus || 'medically_fit');
        setNotes(docData.notes || '');
        
        toast.info("Viewing previously submitted medical documents");
      }
      
      setAppointment(appointmentData);
    } catch (err) {
      console.error("Error fetching appointment:", err);
      setError(err.message || "Failed to load appointment details");
    } finally {
      setLoadingState(LOADING_STATES.IDLE);
    }
  }, [appointmentId]);
  // Compress image before upload
  const compressImage = useCallback(async (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1200px width)
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', 0.8); // 80% quality
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);
  // Upload file to Cloudinary with retry logic
  const uploadFile = useCallback(async (file, retryCount = 0) => {
    try {
      // Compress image if it's an image file
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        console.log('Compressing image for better upload performance...');
        fileToUpload = await compressImage(file);
        // Convert blob back to file for Cloudinary
        fileToUpload = new File([fileToUpload], file.name, { type: 'image/jpeg' });
      }
      
      return new Promise((resolve, reject) => {
        // Set a timeout for the upload
        const timeoutId = setTimeout(() => {
          reject(new Error('Upload timeout - please try again with a smaller file'));
        }, UPLOAD_TIMEOUT);
        
        // Upload to Cloudinary with progress callback
        uploadToCloudinary(
          fileToUpload, 
          'medical-documents', // Custom folder for medical documents
          (progress) => {
            setUploadProgress(progress);
            console.log(`Upload progress: ${progress}%`);
          }
        )
        .then((secureUrl) => {
          clearTimeout(timeoutId);
          console.log('Upload successful!');
          resolve({
            url: secureUrl,
            type: fileToUpload.type,
            originalFileName: file.name
          });
        })
        .catch(async (error) => {
          clearTimeout(timeoutId);
          console.error("Upload failed:", error);
          
          // Retry logic for network errors or timeouts
          if (retryCount < MAX_RETRY_ATTEMPTS && 
              (error.code === 'NETWORK_ERROR' || 
               error.message.includes('timeout') ||
               error.message.includes('failed') ||
               error.response?.status >= 500)) {
            
            console.log(`Retrying upload (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
            setLoadingState(LOADING_STATES.RETRYING);
            toast.info(`Upload failed, retrying... (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
            
            // Wait before retry with progressive delay
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            
            try {
              const result = await uploadFile(file, retryCount + 1);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            reject(new Error(`Upload failed: ${error.message || 'Please check your internet connection and try again'}`));
          }
        });
      });
    } catch (error) {
      console.error("Error in upload process:", error);
      throw new Error(`Upload preparation failed: ${error.message}`);
    }
  }, [compressImage]);
  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!appointment) {
      toast.error("No appointment data found");
      return;
    }
    
    if (!medicalStatus) {
      setError("Please select a medical status");
      toast.error("Please select a medical status");
      return;
    }
    
    // If viewing existing document, just close
    if (existingDocument) {
      onClose();
      return;
    }
    
    try {
      setError(null);
      let fileData = null;
        // Upload file if selected
      if (selectedFile) {
        console.log('Starting file upload to Cloudinary...');
        setLoadingState(LOADING_STATES.UPLOADING);
        toast.info('Uploading file to Cloudinary... Please wait');
        
        fileData = await uploadFile(selectedFile);
        console.log('File upload to Cloudinary completed successfully');
        toast.success('File uploaded successfully to Cloudinary!');
      }
      
      setLoadingState(LOADING_STATES.SAVING);
      toast.info('Saving document details...');
      
      // Prepare document data
      const documentData = {
        appointmentId: appointmentId,
        donorId: appointment.donorId || appointment.patientId || appointment.userId,
        donorName: appointment.patientName || appointment.donorName || appointment.userName || 'Unknown Donor',
        organToDonate: appointment.organType || appointment.organToDonate || 'Not specified',
        appointmentDate: appointment.date,
        medicalStatus: medicalStatus,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        doctorId: user?.uid || appointment.doctorId || null,
        doctorName: user?.displayName || user?.firstName || user?.email || appointment.doctorName || 'Unknown Doctor',
        hasAttachment: !!selectedFile,
        fileName: fileData?.originalFileName || selectedFile?.name || null,
        fileUrl: fileData?.url || null,
        fileType: fileData?.type || null,
        status: 'pending_admin_review'
      };
      
      console.log('Saving document to Firestore...', documentData);
        // Save to Firestore
      const docRef = await addDoc(collection(db, "donorUploadDocuments"), documentData);
      
      // Create admin notification
      await addDoc(collection(db, "adminNotifications"), {
        type: 'medical_document_review',
        title: 'New Medical Document for Review',
        message: `Dr. ${documentData.doctorName} submitted medical assessment for ${documentData.donorName} (${documentData.organToDonate})`,
        documentId: docRef.id,
        appointmentId: appointmentId,
        donorName: documentData.donorName,
        doctorName: documentData.doctorName,
        medicalStatus: documentData.medicalStatus,
        isRead: false,
        createdAt: serverTimestamp(),
        priority: documentData.medicalStatus === 'medically_unfit' ? 'high' : 'normal'
      });
      
      console.log('Document saved successfully with ID:', docRef.id);
      toast.success("Medical document successfully sent to admin for final review!");
      
      // Notify parent component
      if (onDocumentUploaded) {
        onDocumentUploaded(appointmentId);
      }
      
      onClose();
    } catch (err) {
      console.error("Error in submission process:", err);
      const errorMessage = err.message || "Failed to submit document";
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If it was an upload error, reset upload progress
      if (loadingState === LOADING_STATES.UPLOADING || loadingState === LOADING_STATES.RETRYING) {
        setUploadProgress(0);
      }
    } finally {
      setLoadingState(LOADING_STATES.IDLE);
    }
  }, [
    appointment, 
    medicalStatus, 
    existingDocument, 
    selectedFile, 
    appointmentId, 
    notes, 
    user, 
    uploadFile, 
    onDocumentUploaded, 
    onClose,
    loadingState
  ]);

  // Effects
  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAppointmentDetails();
    } else if (!isOpen) {
      resetState();
    }
  }, [isOpen, appointmentId, fetchAppointmentDetails, resetState]);

  // Event handlers
  const handleClose = useCallback(() => {
    if (isProcessing) {
      if (window.confirm('Upload in progress. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isProcessing, onClose]);

  const handleFileChange = useCallback((file) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleStatusChange = useCallback((status) => {
    setMedicalStatus(status);
    setError(null);
  }, []);

  const handleNotesChange = useCallback((value) => {
    setNotes(value);
  }, []);

  const retryFetch = useCallback(() => {
    fetchAppointmentDetails();
  }, [fetchAppointmentDetails]);

  // Render
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {existingDocument 
              ? "View Medical Document Details" 
              : "Medical Document Review"}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isProcessing}
            aria-label="Close modal"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <LoadingSpinner message="Loading appointment details..." />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={retryFetch} />
          ) : appointment ? (
            <>
              <AppointmentInfo appointment={appointment} />
              
              <FileUploadSection
                selectedFile={selectedFile}
                onFileChange={handleFileChange}
                existingDocument={existingDocument}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
              />
              
              <MedicalStatusSection
                medicalStatus={medicalStatus}
                onStatusChange={handleStatusChange}
                notes={notes}
                onNotesChange={handleNotesChange}
                isReadOnly={isReadOnly}
              />
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center sticky bottom-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Close'}
          </button>
          
          {!existingDocument ? (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              disabled={isLoading || isProcessing || !medicalStatus}
            >              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Uploading ({uploadProgress}%)...
                </>
              ) : isRetrying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Retrying upload...
                </>
              ) : isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                "Send For Final Review to Admin"
              )}
            </button>
          ) : (
            <div className="text-sm text-green-600 flex items-center">
              <FaCheckCircle className="mr-2" />
              Already submitted for admin review
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;