import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../../contexts/UserContext';
import AppointmentList from '../appointments/AppointmentList';
import AppointmentDetails from '../appointments/AppointmentDetails';
import { formatDate } from '../../utils/dateUtils';
import { auth, db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { fixAppointmentsList } from '../../utils/appointmentDebugHelper';

// Container for donor appointments 
const DonorAppointmentView = () => {
  const { user } = useContext(UserContext);  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localUser, setLocalUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [permissionDenied, setPermissionDenied] = useState(false);
    useEffect(() => {
    // Validate user data is available
    if (!user) {
      setError("User data not available. Please log in again.");
      setLoading(false);
      return; // Exit early to prevent fetching without authentication
    } else if (!user.uid && !auth.currentUser) {
      setError("User ID not found. Please refresh or log in again.");
      setLoading(false);
      return; // Exit early to prevent fetching without proper authentication
    } else {
      // Create a complete user object that ensures uid is available
      const completeUser = {
        ...user,
        uid: user.uid || (auth.currentUser ? auth.currentUser.uid : null)
      };
        // Verify user role is appropriate for this view
      if (completeUser.role && completeUser.role !== 'donor' && completeUser.role !== 'patient' && completeUser.role !== 'admin' && completeUser.role !== 'doctor') {
        console.warn("User role doesn't have permission to view donor appointments:", completeUser.role);
        setError("You don't have permission to view these appointments. Please contact an administrator if you believe this is an error.");
        setPermissionDenied(true);
        setLoading(false);
        return; // Exit early to prevent unauthorized access
      }
      
      if (!completeUser.uid) {
        setError("Unable to determine user ID. Please log out and log in again.");
        setLoading(false);
      } else {
        console.log("User data for appointments:", completeUser);
        setLocalUser(completeUser);// Fetch donor appointments directly from Firestore
    const fetchAppointments = async () => {
          try {
            console.log(`Fetching appointments for donor ID: ${completeUser.uid}`);
            
            // Enhanced authentication check - ensure we have a valid authenticated user
            if (!auth.currentUser || !auth.currentUser.uid) {
              setError("Authentication required. Please sign in again.");
              setLoading(false);
              return;
            }
            
            // Check if user is doctor/admin - they can see any appointments
            const isAdminOrDoctor = completeUser.role === 'admin' || completeUser.role === 'doctor';
            const userId = completeUser.uid.toString().trim();
            console.log("Using cleaned userId for query:", userId);
              let querySnapshot;
            let fetchedAppointments = [];
            
            // If admin/doctor and patientId is provided, use that instead of own ID
            if (isAdminOrDoctor && completeUser.viewingPatientId) {
              console.log(`Admin/Doctor viewing specific patient ID: ${completeUser.viewingPatientId}`);
              // Query using the specific patient ID
              const donorQuery = query(
                collection(db, "donorAppointments"),
                where("donorId", "==", completeUser.viewingPatientId)
              );
              querySnapshot = await getDocs(donorQuery);
            } else {              // Regular donors can only view their own appointments
              // Try multiple collections and fields to ensure we find all relevant appointments
              const allCollections = ["donorAppointments", "appointments"];
              let appointmentsFound = false;
              
              for (const collectionName of allCollections) {
                console.log(`Searching in collection: ${collectionName}`);
                  // Try different field names and formats
                const fieldQueries = [
                  query(collection(db, collectionName), where("donorId", "==", userId)),
                  query(collection(db, collectionName), where("recipientId", "==", userId)),
                  query(collection(db, collectionName), where("patientId", "==", userId)),
                  query(collection(db, collectionName), where("userId", "==", userId)),
                  // Try possible number conversions
                  query(collection(db, collectionName), where("donorId", "==", parseInt(userId))),
                  query(collection(db, collectionName), where("recipientId", "==", parseInt(userId))),
                  query(collection(db, collectionName), where("patientId", "==", parseInt(userId)))
                ];
                
                // Try each query until we find appointments
                for (const fieldQuery of fieldQueries) {
                  const snapshot = await getDocs(fieldQuery);
                  console.log(`Query attempt found ${snapshot.size} appointments`);
                  
                  if (snapshot.size > 0) {
                    querySnapshot = snapshot;
                    appointmentsFound = true;
                    console.log("Found appointments with this query!");
                    break;
                  }
                }
                
                if (appointmentsFound) break;
              }
              
              // If no appointments found with specific queries
              if (!appointmentsFound) {
                console.log("No appointments found with targeted queries, checking all appointments");
                querySnapshot = await getDocs(collection(db, "donorAppointments"));
              }            }
              console.log(`Found ${querySnapshot?.size || 0} appointments for donor`);
            
            // Process each appointment document
            for (const docSnapshot of querySnapshot.docs) {
              try {
                const appointmentData = docSnapshot.data();
                
                // If admin/doctor, they can view all appointments
                // Otherwise, ensure the appointment belongs to this user                
                // Only regular donors need to filter their own appointments
                // Admins and doctors can see any appointment
                if (!isAdminOrDoctor) {                  // Extract all possible ID fields where the user ID could be stored
                  const appointmentUserId = appointmentData.donorId || 
                                          appointmentData.recipientId ||
                                          appointmentData.patientId || 
                                          appointmentData.userId;
                  
                  console.log("Checking appointment:", docSnapshot.id);
                  console.log("  - detected appointmentUserId:", appointmentUserId);
                  console.log("  - userId we're looking for:", userId);
                  
                  // Multiple ID comparison approaches for better matching
                  // Try string conversion for all IDs
                  const appointmentIdStr = String(appointmentUserId || '').trim();
                  const userIdStr = String(userId || '').trim();
                  
                  // Try numeric comparison as well
                  const appointmentIdNum = parseFloat(appointmentUserId);
                  const userIdNum = parseFloat(userId);
                  const numericIdsMatch = !isNaN(appointmentIdNum) && !isNaN(userIdNum) && 
                                       appointmentIdNum === userIdNum;
                  
                  // Skip appointments not belonging to this user (try both string and numeric comparison)
                  if ((!appointmentIdStr || (appointmentIdStr !== userIdStr)) && !numericIdsMatch) {
                    console.log("Skipping appointment - not for this user:", 
                                `Appointment ID: ${docSnapshot.id}`);
                    continue; // Skip to next appointment
                  }
                  
                  console.log("✓ Including appointment for this user:", docSnapshot.id, {
                    stringMatch: appointmentIdStr === userIdStr,
                    numericMatch: numericIdsMatch,
                    appointmentType: appointmentData.type || (appointmentData.recipientId ? "recipient" : "donor")
                  });
                }
                
                let appointmentDate = new Date();
                  // Safely handle date conversion with enhanced compatibility
                if (appointmentData.date) {
                  try {
                    if (typeof appointmentData.date.toDate === 'function') {
                      appointmentDate = appointmentData.date.toDate();
                    } else if (appointmentData.date instanceof Date) {
                      appointmentDate = appointmentData.date;
                    } else if (typeof appointmentData.date === 'string') {
                      appointmentDate = new Date(appointmentData.date);
                    } else if (typeof appointmentData.date.seconds === 'number') {
                      appointmentDate = new Date(appointmentData.date.seconds * 1000);
                    } else if (appointmentData.date._seconds) {
                      // Handle Firebase timestamp format
                      appointmentDate = new Date(appointmentData.date._seconds * 1000);
                    }
                    
                    // Validate the date object
                    if (isNaN(appointmentDate.getTime())) {
                      console.warn("Invalid date detected, using current date instead");
                      appointmentDate = new Date();
                    }
                  } catch (dateError) {
                    console.warn("Error converting date:", dateError);
                    // Fallback to current date if conversion fails
                    appointmentDate = new Date();
                  }
                }
                
                // Get doctor information if needed
                let doctorName = appointmentData.doctorName || "Unknown Doctor";
                let hospitalName = appointmentData.hospitalName || "Unknown Hospital";
                
                if (appointmentData.doctorId && !appointmentData.doctorName) {
                  try {
                    const doctorRef = doc(db, "users", appointmentData.doctorId);
                    const doctorSnap = await getDoc(doctorRef);
                    
                    if (doctorSnap.exists()) {
                      const doctorData = doctorSnap.data();
                      doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
                      if (doctorName === "Dr. ") doctorName = "Dr. " + (doctorData.displayName || "Unknown");
                      
                      // Get hospital information
                      const hospitalsRef = collection(db, "hospitals");
                      const hospitalQuery = query(hospitalsRef, where("userId", "==", appointmentData.doctorId));
                      const hospitalSnapshot = await getDocs(hospitalQuery);
                      
                      if (!hospitalSnapshot.empty) {
                        hospitalName = hospitalSnapshot.docs[0].data().name || "Unknown Hospital";
                      }
                    }
                  } catch (err) {
                    console.error("Error fetching doctor info:", err);
                  }
                }
                  // Determine the appointment type based on available IDs
                const appointmentType = appointmentData.type || 
                                      (appointmentData.recipientId ? "recipient" : "donor");
                                      
                // Create the appointment object with all necessary data
                fetchedAppointments.push({
                  id: docSnapshot.id,
                  ...appointmentData,
                  date: appointmentDate,
                  doctorName: doctorName,
                  hospitalName: hospitalName,
                  status: appointmentData.status || 'scheduled',
                  type: appointmentType
                });
              } catch (err) {
                console.error("Error processing appointment:", err);
              }
            }            // Add a final check to make sure we have appointments
            if (fetchedAppointments.length === 0) {
              console.log("WARNING: No appointments matched after processing!");
              console.log("This could indicate a data structure issue or that no appointments exist.");
                // SPECIAL HANDLING: For admin/doctor, ignore filtering and show all appointments
              if (isAdminOrDoctor) {
                console.log("ADMIN/DOCTOR ACCESS: Bypassing filters to show all appointments");
                try {
                  // Process both donor and recipient collections for admin/doctors
                  const collections = ["donorAppointments", "recipientAppointments"];
                  
                  for (const collectionName of collections) {
                    console.log(`Fetching all ${collectionName} for admin/doctor view`);
                    const apptsSnapshot = await getDocs(collection(db, collectionName));
                  
                    for (const doc of apptsSnapshot.docs) {
                      try {
                        const data = doc.data();
                        let appointmentDate = new Date();
                        
                        // Handle date conversion
                        if (data.date) {
                          try {
                            if (typeof data.date.toDate === 'function') {
                              appointmentDate = data.date.toDate();
                            } else if (data.date instanceof Date) {
                              appointmentDate = data.date;
                            } else if (typeof data.date === 'string') {
                              appointmentDate = new Date(data.date);
                            } else if (typeof data.date.seconds === 'number') {
                              appointmentDate = new Date(data.date.seconds * 1000);
                            }
                          } catch (dateError) {
                            console.warn("Error converting date:", dateError);
                          }
                        }
                        
                        // Determine the appointment type based on collection and data
                        const appointmentType = data.type || 
                                               (collectionName === "recipientAppointments" ? "recipient" : "donor");
                        
                        fetchedAppointments.push({
                          id: doc.id,
                          ...data,
                          date: appointmentDate,
                          status: data.status || 'scheduled',
                          type: appointmentType,
                          doctorName: data.doctorName || "Unknown Doctor",
                          hospitalName: data.hospitalName || "Unknown Hospital"
                        });
                      } catch (docErr) {
                      console.error("Error processing doc:", docErr);
                    }                  }
                }
                  
              // Then check the general appointments collection
              try {
                const generalApptsSnapshot = await getDocs(collection(db, "appointments"));
                
                for (const doc of generalApptsSnapshot.docs) {
                  try {
                    const data = doc.data();
                        // Determine the appointment type
                        let appointmentType;
                      
                      if (data.type) {
                        // Use existing type if available
                        appointmentType = data.type;
                      } else if (data.patientType) {
                        // Use patient type if available
                        appointmentType = data.patientType;
                      } else if (data.recipientId && !data.donorId) {
                        // It's a recipient appointment
                        appointmentType = "recipient";
                      } else if (data.donorId && !data.recipientId) {
                        // It's a donor appointment
                        appointmentType = "donor";
                      } else {
                        // Default to donor type
                        appointmentType = "donor";
                      }
                        
                      // Process all appointment types for admin/doctor
                      let appointmentDate = new Date();
                      
                      // Handle date conversion
                      if (data.date) {
                        try {
                          if (typeof data.date.toDate === 'function') {
                            appointmentDate = data.date.toDate();
                          } else if (data.date instanceof Date) {
                            appointmentDate = data.date;
                          } else if (typeof data.date === 'string') {
                            appointmentDate = new Date(data.date);
                          } else if (typeof data.date.seconds === 'number') {
                            appointmentDate = new Date(data.date.seconds * 1000);
                          }
                        } catch (dateError) {
                          console.warn("Error converting date:", dateError);
                        }
                      }
                      
                      fetchedAppointments.push({
                        id: doc.id,
                        ...data,
                        date: appointmentDate,
                        status: data.status || 'scheduled',
                        type: appointmentType,                        doctorName: data.doctorName || "Unknown Doctor",
                        hospitalName: data.hospitalName || "Unknown Hospital"                      });
                  } catch (docErr) {
                    console.error("Error processing doc:", docErr);
                  }
                }
              } catch (err) {
                console.error("Error fetching general appointments:", err);
              }
              
            } catch (err) {
                  console.error("Error in admin/doctor appointment fetch:", err);
                }
              } else {
                // For REGULAR USERS: Try a more aggressive search approach
                console.log("REGULAR USER ACCESS: Aggressive search for user's appointments");
                try {
                  // Try various ID formats
                  const userId_number = parseInt(userId);
                  const userId_string = String(userId);
                  
                  console.log(`Searching with multiple ID formats: String("${userId_string}"), Number(${userId_number})`);
                  
                  // First check appointments collection
                  const allAppts = await getDocs(collection(db, "appointments"));
                  console.log(`Found ${allAppts.size} total appointments in general collection`);
                  
                  // Manually check each appointment
                  for (const doc of allAppts.docs) {
                    const data = doc.data();
                    
                    // Extract all possible ID fields
                    const apptDonorId = data.donorId;
                    const apptPatientId = data.patientId;  
                    const apptUserId = data.userId;
                    
                    // Try string comparison with all fields
                    const matchesDonorId = String(apptDonorId || '').trim() === userId_string;
                    const matchesPatientId = String(apptPatientId || '').trim() === userId_string;
                    const matchesUserId = String(apptUserId || '').trim() === userId_string;
                    
                    // Also try number comparison if possible
                    const numMatchesDonorId = !isNaN(apptDonorId) && !isNaN(userId_number) && 
                                               Number(apptDonorId) === userId_number;
                    const numMatchesPatientId = !isNaN(apptPatientId) && !isNaN(userId_number) && 
                                             Number(apptPatientId) === userId_number;
                    const numMatchesUserId = !isNaN(apptUserId) && !isNaN(userId_number) && 
                                          Number(apptUserId) === userId_number;
                    
                    // Log comparison results for debugging
                    if (matchesDonorId || matchesPatientId || matchesUserId || 
                        numMatchesDonorId || numMatchesPatientId || numMatchesUserId) {
                      console.log(`MATCH FOUND for appointment ${doc.id}! Match type:`, {
                        matchesDonorId, matchesPatientId, matchesUserId,
                        numMatchesDonorId, numMatchesPatientId, numMatchesUserId
                      });
                      
                      // Parse date
                      let appointmentDate = new Date();
                      try {
                        if (data.date) {
                          if (typeof data.date.toDate === 'function') {
                            appointmentDate = data.date.toDate();
                          } else if (data.date instanceof Date) {
                            appointmentDate = data.date;
                          } else if (typeof data.date === 'string') {
                            appointmentDate = new Date(data.date);
                          } else if (typeof data.date.seconds === 'number') {
                            appointmentDate = new Date(data.date.seconds * 1000);
                          }
                        }
                      } catch (dateErr) {
                        console.warn("Date conversion error:", dateErr);
                      }
                      
                      // Check if it's a donor appointment
                      const isDonorAppointment = 
                        data.type === "donor" || 
                        data.patientType === "donor" || 
                        Boolean(data.donorId);
                        
                      if (isDonorAppointment || !data.type) {
                        // Include this appointment
                        fetchedAppointments.push({
                          id: doc.id,
                          ...data,
                          date: appointmentDate,
                          status: data.status || 'scheduled',
                          type: "donor",
                          doctorName: data.doctorName || "Unknown Doctor",
                          hospitalName: data.hospitalName || "Unknown Hospital",
                          matchCriteria: { 
                            matchesDonorId, matchesPatientId, matchesUserId,
                            numMatchesDonorId, numMatchesPatientId, numMatchesUserId
                          }
                        });
                      }
                    }
                  }
                  
                  // Also check the donor-specific collection
                  const donorAppts = await getDocs(collection(db, "donorAppointments"));
                  console.log(`Found ${donorAppts.size} total appointments in donorAppointments collection`);
                  
                  // Manually check each appointment
                  for (const doc of donorAppts.docs) {
                    const data = doc.data();
                    
                    // Extract all possible ID fields
                    const apptDonorId = data.donorId;
                    const apptPatientId = data.patientId;
                    const apptUserId = data.userId;
                    
                    // Try string comparison with all fields
                    const matchesDonorId = String(apptDonorId || '').trim() === userId_string;
                    const matchesPatientId = String(apptPatientId || '').trim() === userId_string;
                    const matchesUserId = String(apptUserId || '').trim() === userId_string;
                    
                    // Also try number comparison if possible
                    const numMatchesDonorId = !isNaN(apptDonorId) && !isNaN(userId_number) && 
                                           Number(apptDonorId) === userId_number;
                    const numMatchesPatientId = !isNaN(apptPatientId) && !isNaN(userId_number) && 
                                             Number(apptPatientId) === userId_number;
                    const numMatchesUserId = !isNaN(apptUserId) && !isNaN(userId_number) && 
                                          Number(apptUserId) === userId_number;
                    
                    if (matchesDonorId || matchesPatientId || matchesUserId || 
                        numMatchesDonorId || numMatchesPatientId || numMatchesUserId) {
                      console.log(`MATCH FOUND for appointment ${doc.id}! Match type:`, {
                        matchesDonorId, matchesPatientId, matchesUserId,
                        numMatchesDonorId, numMatchesPatientId, numMatchesUserId
                      });
                      
                      // Parse date
                      let appointmentDate = new Date();
                      try {
                        if (data.date) {
                          if (typeof data.date.toDate === 'function') {
                            appointmentDate = data.date.toDate();
                          } else if (data.date instanceof Date) {
                            appointmentDate = data.date;
                          } else if (typeof data.date === 'string') {
                            appointmentDate = new Date(data.date);
                          } else if (typeof data.date.seconds === 'number') {
                            appointmentDate = new Date(data.date.seconds * 1000);
                          }
                        }
                      } catch (dateErr) {
                        console.warn("Date conversion error:", dateErr);
                      }
                      
                      // Include this appointment
                      fetchedAppointments.push({
                        id: doc.id,
                        ...data,
                        date: appointmentDate,
                        status: data.status || 'scheduled',
                        type: "donor",
                        doctorName: data.doctorName || "Unknown Doctor",
                        hospitalName: data.hospitalName || "Unknown Hospital",
                        matchCriteria: { 
                          matchesDonorId, matchesPatientId, matchesUserId,
                          numMatchesDonorId, numMatchesPatientId, numMatchesUserId
                        }
                      });
                    }
                  }
                } catch (err) {
                  console.error("Error in aggressive appointment search:", err);
                }
              }
            }
              // Fix any appointment data issues
            const fixedAppointments = fixAppointmentsList(fetchedAppointments);
            
            // Sort appointments by date (newest first)
            fixedAppointments.sort((a, b) => b.date - a.date);
              console.log("Processed donor appointments:", fixedAppointments);
            
            setAppointments(fixedAppointments || []);
            setError(null);
          } catch (err) {
            console.error("Error fetching appointments:", err);
            setError("Failed to load your appointments. Please try again later.");
          } finally {
            setLoading(false);
          }
        };
        
        fetchAppointments();
      }
    }
  }, [user]);
  // Add stats info at the top of the page
  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled').length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;


  // Handlers for appointments
  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };
  
  const handleRescheduleAppointment = (appointment) => {
    alert("Please contact your doctor to reschedule this appointment");
  };
  
  const handleCancelAppointment = (appointment) => {
    alert("Please contact your doctor to cancel this appointment");
  };
  
  const handleCompleteAppointment = (appointment) => {
    alert("Only medical staff can mark appointments as completed");
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Donation Appointments</h1>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">              
              <p className="mb-4 text-gray-700">
                View all your donation-related appointments here. You can see upcoming appointments, 
                view past appointments, and check the status of any scheduled appointments. Please note that only 
                medical professionals can schedule appointments for you.
              </p>                {/* Donor specific information */}              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Donation Process</h3>                <p className="text-sm text-blue-700 mb-2">
                  Appointments are an essential part of the donation process. Our medical staff will 
                  guide you through each step and answer any questions you may have. Remember to bring your 
                  ID and medical information to each appointment.
                </p>
                <p className="text-sm text-blue-700 font-medium">
                  <strong>Important:</strong> Only medical staff can schedule appointments for you. You cannot create or schedule appointments yourself.
                  If you need to reschedule or have questions about your appointments, please contact your assigned doctor directly.
                </p>
              </div>
                {/* Appointment Statistics - always show */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-blue-800">Upcoming</h3>
                    <div className="bg-blue-500 p-2 rounded-full w-10 h-10 flex items-center justify-center">
                      <i className="fas fa-calendar-alt text-white"></i>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {upcomingAppointments}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Scheduled appointments
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-green-800">Completed</h3>
                    <div className="bg-green-500 p-2 rounded-full w-10 h-10 flex items-center justify-center">
                      <i className="fas fa-check-circle text-white"></i>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {completedAppointments}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Past appointments
                  </p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-red-800">Cancelled</h3>
                    <div className="bg-red-500 p-2 rounded-full w-10 h-10 flex items-center justify-center">
                      <i className="fas fa-times-circle text-white"></i>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {cancelledAppointments}
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    Cancelled appointments
                  </p>
                </div>
              </div>
                {/* Show loading or error states before attempting to load appointments */}
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Refresh Page
                  </button>
                </div>              ) : (                <div>
                  {/* Use the improved AppointmentList component */}                  <AppointmentList 
                    appointments={appointments}
                    onEdit={handleRescheduleAppointment}
                    onCancel={handleCancelAppointment}
                    onComplete={handleCompleteAppointment}
                    onReschedule={handleRescheduleAppointment}
                    userRole={localUser?.role || "patient"}
                    viewDetailsOnly={localUser?.role !== "admin" && localUser?.role !== "doctor"}
                    onViewDetails={handleViewDetails}
                    currentUserId={localUser?.uid}
                    isDonorView={true}
                  />
                </div>
              )}
              
              {/* Appointment details modal */}              {isDetailsModalOpen && selectedAppointment && (
                <AppointmentDetails
                  isOpen={isDetailsModalOpen}
                  onClose={closeDetailsModal}
                  appointment={selectedAppointment}
                  onReschedule={() => {}}
                  onCancel={() => {}}
                  onComplete={() => {}}
                  userRole="patient"
                  viewDetailsOnly={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorAppointmentView;
