import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getAllDoctors } from '../../utils/appointmentFunctions';
import { sanitizeObject } from '../../utils/safeRendering';
import { canScheduleAppointments, APPROVAL_STATUS } from '../../utils/approvalSystem';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Component for creating and editing appointments
const AppointmentForm = ({ 
  onSubmit, 
  initialData = {}, 
  appointmentType, 
  userRole,
  userId
}) => {
  // Form state
  const [formData, setFormData] = useState({
    doctorId: initialData.doctorId || '',
    date: initialData.date ? format(new Date(initialData.date), 'yyyy-MM-dd') : '',
    time: initialData.time || '',
    purpose: initialData.purpose || '',
    notes: initialData.notes || '',
    status: initialData.status || 'scheduled'
  });
    // Doctors list for dropdown
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userApprovalStatus, setUserApprovalStatus] = useState(null);
  const [isEligibleForAppointments, setIsEligibleForAppointments] = useState(false);
  
  // Check if the user role is donor, and if they are trying to create a new appointment
  const isDonorCreatingAppointment = userRole === 'donor' && !initialData.id;
    // Fetch doctors for dropdown and check user approval status
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const doctorsList = await getAllDoctors();
        setDoctors(doctorsList);
        setLoading(false);
      } catch (err) {
        setError('Failed to load doctors. Please try again.');
        setLoading(false);
      }
    };
    
    const checkUserApprovalStatus = async () => {
      if (userRole === 'donor' && userId) {
        try {
          // Check medical records for approval status
          const medicalRecordRef = doc(db, 'medicalRecords', userId);
          const medicalRecordSnap = await getDoc(medicalRecordRef);
          
          if (medicalRecordSnap.exists()) {
            const data = medicalRecordSnap.data();
            const approvalStatus = data.requestStatus || data.status;
            setUserApprovalStatus(approvalStatus);
            
            // Check if user can schedule appointments
            const eligible = canScheduleAppointments(approvalStatus, userRole);
            setIsEligibleForAppointments(eligible);
          }
        } catch (err) {
          console.error('Error checking approval status:', err);
        }
      } else {
        // Non-donors can always schedule appointments (doctors, admins, etc.)
        setIsEligibleForAppointments(true);
      }
    };
    
    fetchDoctors();
    checkUserApprovalStatus();
  }, [userRole, userId]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if donor is eligible for appointment scheduling
    if (isDonorCreatingAppointment && !isEligibleForAppointments) {
      if (userApprovalStatus === APPROVAL_STATUS.PENDING) {
        setError('Your application is still pending review. You cannot schedule appointments until your application is initially approved.');
      } else if (userApprovalStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED || userApprovalStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL) {
        setError('Your application is pending initial admin approval. Please wait for administration review before scheduling appointments.');
      } else if (userApprovalStatus === APPROVAL_STATUS.INITIAL_ADMIN_REJECTED) {
        setError('Your application was rejected by administration. You are not eligible to schedule appointments.');
      } else {
        setError('You are not eligible to schedule appointments. Please ensure your application is initially approved first.');
      }
      return;
    }
    
    // Validate form
    if (!formData.doctorId || !formData.date || !formData.time || !formData.purpose) {
      setError('Please fill in all required fields');
      return;
    }
      // Create a safe appointment object with only the needed properties
    const safeAppointmentData = sanitizeObject({
      doctorId: formData.doctorId,
      date: new Date(formData.date),
      time: formData.time,
      purpose: formData.purpose,
      notes: formData.notes,
      status: formData.status
    });
    
    // Add the appropriate patient ID field based on type
    if (appointmentType === 'donor') {
      safeAppointmentData.donorId = userId;
    } else {
      safeAppointmentData.recipientId = userId;
    }
    
    console.log("Submitting safe appointment data:", safeAppointmentData);
    
    // Submit the safe appointment data
    onSubmit(safeAppointmentData);
  };
  return (
    <div className="bg-white p-6 rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">
        {initialData.id ? 'Edit Appointment' : 'Schedule New Appointment'}
      </h2>
        {/* Display permissions message for donors */}
      {isDonorCreatingAppointment && !isEligibleForAppointments && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4">
          <p className="font-bold">Appointment Eligibility Notice</p>
          {userApprovalStatus === APPROVAL_STATUS.PENDING && (
            <p>Your application is currently under review. You will be able to schedule appointments once your application is initially approved by administration.</p>
          )}
          {(userApprovalStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED || userApprovalStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL) && (
            <p>Your application has been reviewed by the medical team and is pending initial admin approval. Please wait for administration review before scheduling appointments.</p>
          )}
          {userApprovalStatus === APPROVAL_STATUS.INITIAL_ADMIN_REJECTED && (
            <p>Your application was not initially approved by administration. Please contact support for more information.</p>
          )}
          {!userApprovalStatus && (
            <p>Please submit your medical information and get approval before scheduling appointments.</p>
          )}
        </div>
      )}
      
      {isDonorCreatingAppointment && isEligibleForAppointments && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p className="font-bold">✓ Appointment Scheduling Available</p>
          <p>Your application has been initially approved. You are eligible to schedule appointments with doctors.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
        {/* Hide the form completely for donors trying to create new appointments who are not eligible */}
      {(!isDonorCreatingAppointment || isEligibleForAppointments) ? (
        <form onSubmit={handleSubmit}>
        {/* Doctor selection */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Doctor</label>
          <select 
            name="doctorId"
            value={formData.doctorId}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            disabled={loading || userRole === 'doctor'}
            required
          >
            <option value="">Select a doctor</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.firstName} {doctor.lastName}
              </option>
            ))}
          </select>
        </div>
        
        {/* Date selection */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
        </div>
        
        {/* Time selection */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Time</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        
        {/* Purpose */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Purpose</label>
          <select
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="">Select purpose</option>
            <option value="Initial Consultation">Initial Consultation</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Test Results">Test Results</option>
            <option value="Procedure">Procedure</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        {/* Notes */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            rows="3"
          ></textarea>
        </div>
        
        {/* Status (only for editing) */}
        {initialData.id && userRole === 'doctor' && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
          {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            disabled={loading || (isDonorCreatingAppointment && !isEligibleForAppointments)}
          >
            {initialData.id ? 'Update Appointment' : 'Schedule Appointment'}
          </button>
        </div>
      </form>
      ) : null}
    </div>
  );
};

export default AppointmentForm;
