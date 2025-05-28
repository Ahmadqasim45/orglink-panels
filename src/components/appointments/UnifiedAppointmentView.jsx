import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { auth } from '../../firebase';
import { loadUserAppointments, fixUserAppointments } from '../../utils/appointmentSystemConnector';

const UnifiedAppointmentView = ({ userType = 'recipient' }) => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [debugInfo, setDebugInfo] = useState(null);
  
  useEffect(() => {
    async function fetchAppointments() {
      try {
        // Validate user authentication
        if (!user || (!user.uid && !auth.currentUser)) {
          setError("User authentication required. Please log in again.");
          setLoading(false);
          return;
        }

        // Get user ID and role
        const userId = user.uid || (auth.currentUser ? auth.currentUser.uid : null);
        const userRole = user.role || userType;
        const isAdminOrDoctor = userRole === 'admin' || userRole === 'doctor';
        
        console.log(`UnifiedAppointmentView - Fetching ${userType} appointments for user:`, userId);
        console.log("UnifiedAppointmentView - User role:", userRole);
        
        // Check permission for viewing appointments
        if (!userId || (!isAdminOrDoctor && userRole !== 'recipient' && userRole !== 'donor' && userRole !== 'patient')) {
          setError("You don't have permission to view these appointments.");
          setLoading(false);
          return;
        }
        
        // Use our unified appointment system
        let appointmentsResult = [];
        
        if (isAdminOrDoctor && user.viewingPatientId) {
          // If viewing a specific patient as doctor/admin
          appointmentsResult = await loadUserAppointments(user.viewingPatientId, userType);
        } else {
          // Regular user view of their own appointments
          appointmentsResult = await loadUserAppointments(userId, userType);
        }
        
        console.log(`UnifiedAppointmentView - Found ${userType} appointments:`, appointmentsResult.length);
          // Log appointment sources for debugging
        const appointmentsByCollection = appointmentsResult.reduce((acc, apt) => {
          const collection = apt._sourceCollection || 'unknown';
          acc[collection] = (acc[collection] || 0) + 1;
          return acc;
        }, {});
        
        // Also count doctor-scheduled appointments for debugging
        const doctorScheduledCount = appointmentsResult.filter(apt => 
          apt.doctorId && (apt.doctorScheduled || apt.scheduledByDoctor)
        ).length;
        
        console.log("UnifiedAppointmentView - Appointments by collection source:", appointmentsByCollection);
        console.log(`UnifiedAppointmentView - Doctor scheduled appointments: ${doctorScheduledCount}`);
        
        // Set the appointments and debug info
        setDebugInfo({
          byCollection: appointmentsByCollection,
          doctorScheduled: doctorScheduledCount,
          total: appointmentsResult.length
        });
        
        setAppointments(appointmentsResult);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setError("Failed to load appointments. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchAppointments();
  }, [user, userType]);
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return "No date";
    
    try {
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(date).toLocaleDateString(undefined, options);
    } catch (e) {
      return "Invalid date";
    }
  };
  // Filter appointments based on status
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  // Apply filters to appointments
  let filteredAppointments = appointments;
  
  // Apply status filter
  if (filter !== 'all') {
    if (filter === 'doctor-scheduled') {
      // Special filter for doctor-scheduled appointments
      filteredAppointments = appointments.filter(apt => 
        apt.doctorId && (apt.doctorScheduled || apt.scheduledByDoctor || apt._sourceCollection === 'doctorScheduledAppointments')
      );
    } else {
      // Normal status filter
      filteredAppointments = appointments.filter(apt => apt.status === filter);
    }
  }
  
  // Handle appointment fixing
  const handleFixAppointments = async () => {
    if (!user || !user.uid) {
      alert("You must be logged in to use this feature");
      return;
    }
    
    if (window.confirm(`Fix ${userType} appointments? This will ensure all your appointments are displayed correctly.`)) {
      try {
        setLoading(true);
        const result = await fixUserAppointments(user.uid, userType);
        setLoading(false);
        
        if (result.success) {
          alert(`Fixed ${result.stats?.fixed || 0} appointments. Reloading page to show changes.`);
          window.location.reload();
        } else {
          alert(`Error: ${result.error || 'Unknown error'}`);
        }
      } catch (err) {
        setLoading(false);
        console.error("Error fixing appointments:", err);
        alert(`Error: ${err.message}`);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-6">
        {userType === 'recipient' ? 'Recipient' : 'Donor'} Appointments
      </h1>
        <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
        <details>
          <summary className="font-medium text-blue-700 cursor-pointer">Appointment Tools</summary>
          <div className="mt-2 flex flex-wrap gap-2">            
            <button
              onClick={handleFixAppointments}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded"
            >
              Fix Appointments
            </button>
            
            <button
              onClick={async () => {
                if (!user || !user.uid) {
                  alert("You must be logged in to use this feature");
                  return;
                }
                
                try {
                  setLoading(true);
                  // Import the fixDoctorScheduledAppointments utility dynamically
                  const doctorAppointmentFixer = await import('../../utils/fixDoctorScheduledAppointments.js');
                  
                  // Run diagnostics first
                  const diagResult = await doctorAppointmentFixer.diagnoseDoctorScheduledAppointments(user.uid, userType);
                  setLoading(false);
                  
                  if (diagResult.success) {
                    const { diagnostics } = diagResult;
                    
                    // Show diagnosis results
                    const message = `
                      Doctor Appointment Diagnosis:
                      - Total appointments: ${diagnostics.summary.totalAppointments}
                      - Doctor-created: ${diagnostics.summary.doctorCreated}
                      - Properly stored: ${diagnostics.summary.properlyStored}
                      - Misplaced: ${diagnostics.summary.misplaced}
                      
                      Would you like to fix misplaced doctor-scheduled appointments?
                    `;
                    
                    if (diagnostics.summary.misplaced > 0 && window.confirm(message)) {
                      setLoading(true);
                      const fixResult = await doctorAppointmentFixer.fixDoctorScheduledAppointments(user.uid, userType);
                      setLoading(false);
                      
                      if (fixResult.success) {
                        alert(`Fixed ${fixResult.stats.fixed} appointments. Reloading page to show changes.`);
                        window.location.reload();
                      } else {
                        alert(`Error: ${fixResult.error || 'Unknown error'}`);
                      }
                    }
                  } else {
                    alert(`Error: ${diagResult.error || 'Unknown error during diagnosis'}`);
                  }
                } catch (err) {
                  setLoading(false);
                  console.error("Error with doctor appointments:", err);
                  alert(`Error: ${err.message}`);
                }
              }}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded"
            >
              Fix Doctor Appointments
            </button>
            
            <button
              onClick={() => {
                if (window.confirm("Reload the page to refresh appointment data?")) {
                  window.location.reload();
                }
              }}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
            >
              Refresh Data
            </button>
            
            {debugInfo && (
              <div className="w-full mt-2 text-xs bg-gray-100 p-2 rounded">
                <h4 className="font-semibold">Debug Info:</h4>
                <div>Total: {debugInfo.total} appointments</div>
                <div>Doctor-scheduled: {debugInfo.doctorScheduled} appointments</div>
                <div>Sources: {
                  Object.entries(debugInfo.byCollection || {}).map(([src, count]) => 
                    `${src}(${count})`
                  ).join(', ')
                }</div>
              </div>
            )}
          </div>
        </details>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Error: {error}</p>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh Page
          </button>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          <div className="flex items-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">No appointments found.</p>
          </div>
          
          <p className="mb-3">
            New appointments will appear here when scheduled by your doctor. 
            If you believe you should have appointments showing here, try the fix appointments tool above.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex space-x-2">
            <button 
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              All
            </button>
            <button 
              onClick={() => handleFilterChange('scheduled')}
              className={`px-4 py-2 rounded ${filter === 'scheduled' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Scheduled
            </button>
            <button 
              onClick={() => handleFilterChange('completed')}
              className={`px-4 py-2 rounded ${filter === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Completed
            </button>            <button 
              onClick={() => handleFilterChange('cancelled')}
              className={`px-4 py-2 rounded ${filter === 'cancelled' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Cancelled
            </button>
            <button 
              onClick={() => handleFilterChange('doctor-scheduled')}
              className={`px-4 py-2 rounded ${filter === 'doctor-scheduled' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-xs'}`}
            >
              Doctor Scheduled
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="py-3 px-4 text-left">Date & Time</th>
                  <th className="py-3 px-4 text-left">Type</th>
                  <th className="py-3 px-4 text-left">Doctor</th>
                  <th className="py-3 px-4 text-left">Hospital</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => {
                  const statusClass = 
                    appointment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800';
                  
                  const statusText = appointment.status?.charAt(0).toUpperCase() + 
                    appointment.status?.slice(1) || "Scheduled";
                  
                  return (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(appointment.date)}</td>
                      <td className="py-3 px-4">
                        {appointment.appointmentType || "General Checkup"}
                      </td>
                      <td className="py-3 px-4">{appointment.doctorName || "Unknown Doctor"}</td>
                      <td className="py-3 px-4">{appointment.hospitalName || "Unknown Hospital"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {appointment.notes || "No additional notes"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedAppointmentView;
