import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { format } from 'date-fns';

// DoctorAppointmentForm - For doctors to schedule appointments
const DoctorAppointmentForm = ({ onSubmit, appointmentType, onCancel }) => {
  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    purpose: 'Medical Consultation',
    notes: '',
    status: 'scheduled'
  });
  
  // Patients list for dropdown
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch patients based on appointment type
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const currentDoctorId = auth.currentUser.uid;
        let patientsList = [];
        
        if (appointmentType === 'donor') {
          // Fetch approved donors for this doctor/hospital
          const donorsQuery = query(
            collection(db, "medicalRecords"),
            where("status", "in", ["approved", "doctor-approved", "admin-approved"]),
            where("hospitalId", "==", currentDoctorId)
          );
          
          const donorSnapshot = await getDocs(donorsQuery);
          
          patientsList = donorSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().fullName || doc.data().name || 'Unknown Donor',
            type: 'donor',
            data: doc.data()
          }));
          
          // If no donors found with hospitalId, try assignedToHospital field
          if (patientsList.length === 0) {
            const alternateQuery = query(
              collection(db, "medicalRecords"),
              where("status", "in", ["approved", "doctor-approved", "admin-approved"]),
              where("assignedToHospital", "==", currentDoctorId)
            );
            
            const altSnapshot = await getDocs(alternateQuery);
            
            patientsList = altSnapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().fullName || doc.data().name || 'Unknown Donor',
              type: 'donor',
              data: doc.data()
            }));
          }
        } else {
          // Fetch approved recipients for this doctor/hospital
          const doctorRef = await getDocs(query(
            collection(db, "users"),
            where("uid", "==", currentDoctorId)
          ));
          
          let hospitalId = currentDoctorId;
          
          // Get hospital ID if available
          if (!doctorRef.empty) {
            const doctorData = doctorRef.docs[0].data();
            if (doctorData.hospitalId) {
              hospitalId = doctorData.hospitalId;
            }
          }
          
          // Fetch recipients associated with this hospital/doctor
          const recipientsQuery = query(
            collection(db, "recipients"),
            where("hospitalId", "==", hospitalId)
          );
          
          const recipientSnapshot = await getDocs(recipientsQuery);
          
          patientsList = recipientSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().fullName || doc.data().name || 'Unknown Recipient',
            type: 'recipient',
            data: doc.data()
          }));
          
          // Try alternate field if no recipients found
          if (patientsList.length === 0) {
            const altQuery = query(
              collection(db, "recipients"),
              where("assignedToHospital", "==", hospitalId)
            );
            
            const altSnapshot = await getDocs(altQuery);
            
            patientsList = altSnapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().fullName || doc.data().name || 'Unknown Recipient',
              type: 'recipient',
              data: doc.data()
            }));
          }
        }
        
        setPatients(patientsList);
        setLoading(false);
        
        console.log(`Found ${patientsList.length} ${appointmentType}s for scheduling`);
      } catch (err) {
        console.error(`Error fetching ${appointmentType}s:`, err);
        setError(`Failed to load ${appointmentType}s. Please try again.`);
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, [appointmentType]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
    // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.patientId || !formData.date || !formData.time) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      // Fetch doctor and hospital info
      const doctorId = auth.currentUser.uid;
      let doctorName = "Unknown Doctor";
      let hospitalName = "Unknown Hospital";
      
      // Get doctor details
      const doctorRef = await getDocs(query(
        collection(db, "users"),
        where("uid", "==", doctorId)
      ));
      
      if (!doctorRef.empty) {
        const doctorData = doctorRef.docs[0].data();
        doctorName = `Dr. ${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
        if (doctorName === "Dr. ") doctorName = "Dr. " + (doctorData.displayName || "Unknown");
        
        // If doctor has hospitalId field, get hospital name
        if (doctorData.hospitalId) {
          const hospitalRef = await getDocs(query(
            collection(db, "hospitals"),
            where("id", "==", doctorData.hospitalId)
          ));
          
          if (!hospitalRef.empty) {
            hospitalName = hospitalRef.docs[0].data().name || "Unknown Hospital";
          }
        }
      }
      
      // If still no hospital name, try to find hospital by doctor's userId
      if (hospitalName === "Unknown Hospital") {
        const hospitalQuery = await getDocs(query(
          collection(db, "hospitals"),
          where("userId", "==", doctorId)
        ));
        
        if (!hospitalQuery.empty) {
          hospitalName = hospitalQuery.docs[0].data().name || "Unknown Hospital";
        }
      }
      
      console.log("Creating appointment with doctor/hospital info:", { doctorName, hospitalName });
        // Create appointment object
      const appointmentData = {
        ...formData,
        doctorId: doctorId,
        doctorName: doctorName,
        hospitalName: hospitalName,
        date: new Date(formData.date),
        [appointmentType === 'donor' ? 'donorId' : 'recipientId']: formData.patientId,
        type: appointmentType, // Add type field for easier filtering
        patientType: appointmentType // For compatibility with handleSubmit in StaffDashboard
      };
      
      // Remove the patientId field as it's not needed in the final data
      delete appointmentData.patientId;

      // Create a safe version of the appointment data to send to StaffDashboard
      const safeAppointmentData = {
        purpose: appointmentData.purpose,
        patientId: appointmentType === 'donor' ? appointmentData.donorId : appointmentData.recipientId,
        type: appointmentType,
        date: appointmentData.date,
        time: appointmentData.time,
        notes: appointmentData.notes,
        doctorId: appointmentData.doctorId,
        doctorName: appointmentData.doctorName,
        hospitalName: appointmentData.hospitalName
      };
      
      // Submit the safe form data
      onSubmit(safeAppointmentData);
    } catch (error) {
      console.error("Error preparing appointment data:", error);
      setError("Failed to prepare appointment data. Please try again.");
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="loader"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-bold">No approved {appointmentType}s found</p>
            <p>You don't have any approved {appointmentType}s assigned to your hospital. Patients need to be approved before you can schedule appointments with them.</p>
          </div>
        ) : (
          <>
            {/* Patient Selection */}
            <div className="mb-4">
              <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
                Select {appointmentType === 'donor' ? 'Donor' : 'Recipient'}*
              </label>
              <select
                id="patientId"
                name="patientId"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
                value={formData.patientId}
                onChange={handleChange}
                required
              >
                <option value="">Select a {appointmentType}</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date & Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date*
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  className="mt-1 block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
                  value={formData.date}
                  onChange={handleChange}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Time*
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  className="mt-1 block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            {/* Purpose Selection */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                Purpose*
              </label>
              <select
                id="purpose"
                name="purpose"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
                value={formData.purpose}
                onChange={handleChange}
                required
              >
                <option value="Medical Consultation">Medical Consultation</option>
                <option value="Initial Assessment">Initial Assessment</option>
                <option value="Follow-up Visit">Follow-up Visit</option>
                <option value="Lab Tests">Lab Tests</option>
                <option value="Pre-operative Assessment">Pre-operative Assessment</option>
                <option value="Post-operative Follow-up">Post-operative Follow-up</option>
                {appointmentType === 'donor' && (
                  <option value="Donation Procedure">Donation Procedure</option>
                )}
                {appointmentType === 'recipient' && (
                  <option value="Transplant Procedure">Transplant Procedure</option>
                )}
              </select>
            </div>
            
            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                className="mt-1 block w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
                placeholder="Any additional information about this appointment..."
                value={formData.notes}
                onChange={handleChange}
              ></textarea>
            </div>
          </>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading || patients.length === 0}
          >
            {loading ? 'Loading...' : 'Schedule Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorAppointmentForm;