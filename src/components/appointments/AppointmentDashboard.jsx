import React, { useState, useEffect, useContext, useCallback } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Add CSS for loader
import './appointmentStyles.css';

import AppointmentList from './AppointmentList';
import AppointmentForm from './AppointmentForm';
import AppointmentDetails from './AppointmentDetails';

import {
  getDonorAppointments,
  getRecipientAppointments,
  createDonorAppointment,
  createRecipientAppointment,
  updateAppointment,
  cancelAppointment,
  completeAppointment
} from '../../utils/appointmentFunctions';

// Main container for appointment management
const AppointmentDashboard = ({ appointmentType = 'donor', userData = null }) => {
  const { user: contextUser } = useContext(UserContext);
  const user = userData || contextUser; // Use explicitly passed user data if available, otherwise use context
    // State management
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      // Validate user object
      if (!user) {
        console.error('No user available');
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      if (!user.uid) {
        console.error('No user ID available');
        setError('User information not available. Please refresh the page or log in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null); // Clear any previous errors
      console.log(`Starting appointment fetch with user:`, { hasUser: !!user, uid: user.uid, type: appointmentType });
      
      let fetchedAppointments = [];
      const userId = user.uid;
      console.log(`Fetching ${appointmentType} appointments for user ${userId}`);
      
      try {
        // Fetch appropriate appointments based on type
        if (appointmentType === 'donor') {
          fetchedAppointments = await getDonorAppointments(userId);
        } else {
          fetchedAppointments = await getRecipientAppointments(userId);
        }
        
        // Log and set the fetched appointments
        console.log(`Retrieved ${fetchedAppointments.length} appointments`, fetchedAppointments);
        setAppointments(fetchedAppointments || []);  // Ensure we never set undefined
        setLoading(false);
      } catch (innerError) {
        console.error('Inner error fetching appointments:', innerError);
        setError(innerError.message || `Failed to load ${appointmentType} appointments. Please try again.`);
        setAppointments([]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Outer error in fetchAppointments:', err);
      setError(`Failed to load ${appointmentType} appointments. Please check your connection and try again.`);
      setAppointments([]); 
      setLoading(false);
    }  }, [user, appointmentType]);
  
  // Load appointments on component mount
  useEffect(() => {
    // Set a timeout to avoid race conditions with authentication
    const loadTimer = setTimeout(() => {
      if (user && user.uid) {
        fetchAppointments();
      } else {
        console.error('No user or user ID available to fetch appointments');
        setError('User authentication required. Please log in again.');
        setLoading(false);
      }
    }, 500);
    
    return () => clearTimeout(loadTimer);
  }, [user?.uid, appointmentType, fetchAppointments]);
  
  // Handle creating a new appointment
  const handleCreateAppointment = async (appointmentData) => {
    try {
      setLoading(true);
      
      if (appointmentType === 'donor') {
        await createDonorAppointment(appointmentData);
        toast.success('Donor appointment scheduled successfully!');
      } else {
        await createRecipientAppointment(appointmentData);
        toast.success('Recipient appointment scheduled successfully!');
      }
      
      setShowForm(false);
      fetchAppointments();
    } catch (err) {
      console.error('Error creating appointment:', err);
      toast.error('Failed to schedule appointment. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle updating an existing appointment
  const handleUpdateAppointment = async (appointmentData) => {
    try {
      setLoading(true);
      
      if (!selectedAppointment) return;
      
      await updateAppointment(
        selectedAppointment.id,
        appointmentType,
        appointmentData
      );
      
      toast.success('Appointment updated successfully!');
      setShowForm(false);
      setIsEditing(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      toast.error('Failed to update appointment. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle cancelling an appointment
  const handleCancelAppointment = async (appointment) => {
    try {
      if (window.confirm('Are you sure you want to cancel this appointment?')) {
        setLoading(true);
        
        await cancelAppointment(appointment.id, appointmentType);
        
        toast.info('Appointment cancelled successfully.');
        fetchAppointments();
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      toast.error('Failed to cancel appointment. Please try again.');
      setLoading(false);
    }
  };
    // Handle completing an appointment (doctor only)
  const handleCompleteAppointment = async (appointment) => {
    try {
      // For donor appointments, show a modal to collect evaluation notes
      if (appointmentType === 'donor') {
        const evaluationNotes = window.prompt(
          'Please enter evaluation notes for this medical appointment:\n\n' +
          'This will complete the medical evaluation process.',
          'Medical evaluation completed successfully. Patient cleared for next phase.'
        );
        
        if (evaluationNotes === null) {
          return; // User cancelled
        }
        
        if (window.confirm('Are you sure you want to mark this appointment as completed and finalize the medical evaluation?')) {
          setLoading(true);
          
          await completeAppointment(appointment.id, appointmentType, evaluationNotes);
          
          toast.success('Appointment completed and medical evaluation finalized!');
          fetchAppointments();
        }
      } else {
        // For recipient appointments, use simpler confirmation
        if (window.confirm('Are you sure you want to mark this appointment as completed?')) {
          setLoading(true);
          
          await completeAppointment(appointment.id, appointmentType);
          
          toast.success('Appointment marked as completed!');
          fetchAppointments();
        }
      }
    } catch (err) {
      console.error('Error completing appointment:', err);
      toast.error('Failed to complete appointment. Please try again.');
      setLoading(false);
    }
  };
  
  // View an appointment's details
  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
  };
  
  // Start editing an appointment
  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setIsEditing(true);
    setShowForm(true);
  };
    // Close appointment details modal
  const handleCloseDetails = () => {
    setSelectedAppointment(null);
  };
  
  // Handle form submission (create or update)
  const handleSubmit = (data) => {
    if (isEditing) {
      handleUpdateAppointment(data);
    } else {
      handleCreateAppointment(data);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={3000} />      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          {appointmentType === 'donor' ? 'Donor' : 'Recipient'} Appointments
        </h1>
        
        <div className="flex space-x-3">
            {/* Removing the "Schedule New Appointment" button as doctors should schedule appointments from the patient screens */}
        </div>
      </div>
        {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-blue-800">Upcoming</h3>
          <p className="text-3xl font-bold text-blue-600">
            {appointments.filter(a => a.status === 'scheduled').length}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-green-800">Completed</h3>
          <p className="text-3xl font-bold text-green-600">
            {appointments.filter(a => a.status === 'completed').length}
          </p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-red-800">Cancelled</h3>
          <p className="text-3xl font-bold text-red-600">
            {appointments.filter(a => a.status === 'cancelled').length}
          </p>
        </div>
      </div>      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 mb-6 text-center rounded-lg shadow-md error-container">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-lg mb-2">{error}</p>
          <p className="text-sm mb-4">Please check your connection and ensure you're logged in correctly.</p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={fetchAppointments} 
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-300 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
            <a 
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-300 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home Page
            </a>
          </div>
        </div>
      )}      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-8 my-8">
          <div className="loader mb-4"></div>
          <p className="text-gray-700 font-medium">Loading your appointments...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && !error && appointments.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Appointments Found</h3>
          <p className="text-gray-600 mb-4">You don't have any appointments scheduled yet.</p>
          <p className="text-gray-500">
            {appointmentType === 'donor' 
              ? 'Our medical staff will schedule appointments for you as needed during the donation process.' 
              : 'Our medical staff will schedule appointments for you as needed during your treatment process.'}
          </p>
        </div>
      )}
        {/* Appointment views */}
      {!loading && !error && appointments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <AppointmentList
            appointments={appointments}
            onView={handleViewAppointment}
            onEdit={handleEditAppointment}
            onCancel={handleCancelAppointment}
            onComplete={handleCompleteAppointment}
            userRole={user.role}
          />
        </div>
      )}
        {/* Appointment form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 my-8">
            <div className="flex justify-between items-center border-b px-6 py-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Edit Appointment' : 'Schedule New Appointment'}
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <AppointmentForm
                onSubmit={handleSubmit}
                initialData={isEditing ? selectedAppointment : {}}
                appointmentType={appointmentType}
                userRole={user.role}
                userId={user.uid}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Appointment details modal */}
      {selectedAppointment && !showForm && (
        <AppointmentDetails
          appointment={selectedAppointment}
          onClose={handleCloseDetails}
          onEdit={handleEditAppointment}
          onCancel={handleCancelAppointment}
          onComplete={handleCompleteAppointment}
          userRole={user.role}
        />
      )}
    </div>
  );
};

export default AppointmentDashboard;
