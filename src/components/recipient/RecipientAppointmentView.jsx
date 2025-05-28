
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const RecipientAppointmentView = () => {
  const { user } = useContext(UserContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user || !user.uid) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching appointments for user:", user.uid);
        const appointmentsRef = collection(db, "recipientAppointments");
        const q = query(
          appointmentsRef,
          where("recipientId", "==", user.uid),
          orderBy("date", "desc")
        );

        const querySnapshot = await getDocs(q);
        const appointmentList = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          appointmentList.push({
            id: doc.id,
            ...data,
          });
        });

        console.log("Found appointments:", appointmentList.length);
        setAppointments(appointmentList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setError("Failed to fetch your appointments. Please try again later.");
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return timestamp.toDate().toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get urgency badge color
  const getUrgencyBadgeClass = (level) => {
    switch (level?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">Your Appointments</h1>
      
      {/* Notification about appointment scheduling */}
      <div className="bg-blue-50 p-4 rounded-md mb-6 border-l-4 border-blue-400">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Appointment Information</h3>
        <p className="text-sm text-blue-700 mb-2">
          Appointments are an essential part of your treatment process. Our medical staff will 
          guide you through each step and answer any questions you may have.
        </p>
        <p className="text-sm text-blue-700 font-medium">
          <strong>Important:</strong> Only medical staff can schedule appointments for you. You cannot create or schedule appointments yourself.
          If you need to reschedule or have questions about your appointments, please contact your assigned doctor directly.
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">You don't have any appointments scheduled yet.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointment Details
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hospital
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{appointment.purpose || 'Medical Appointment'}</span>
                      <span className="text-sm text-gray-500">
                        <span className="font-medium">Date:</span> {formatDate(appointment.date)}
                      </span>
                      <span className="text-sm text-gray-500">
                        <span className="font-medium">Time:</span> {appointment.time || 'N/A'}
                      </span>
                      {appointment.organType && (
                        <span className="text-sm text-gray-500">
                          <span className="font-medium">Organ:</span> {appointment.organType}
                        </span>
                      )}
                      {appointment.bloodType && (
                        <span className="text-sm text-gray-500">
                          <span className="font-medium">Blood Type:</span> {appointment.bloodType}
                        </span>
                      )}
                      {appointment.urgencyLevel && (
                        <span className="inline-flex mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${getUrgencyBadgeClass(appointment.urgencyLevel)}`}>
                            {appointment.urgencyLevel}
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">                      <span className="font-medium text-gray-900">{appointment.doctorName || 'Not Assigned'}</span>
                      <span className="text-sm text-gray-500">
                        {appointment.doctorScheduled ? 'Scheduled by doctor' : 'Scheduled by medical staff'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-900">{appointment.hospitalName || 'Not specified'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                      {appointment.status || 'Unknown'}
                    </span>
                    {appointment.notes && (
                      <p className="mt-1 text-xs text-gray-500">{appointment.notes}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecipientAppointmentView;