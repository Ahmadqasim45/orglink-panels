import React, { useState } from 'react';
import { formatDate } from '../../utils/dateUtils';

const RescheduleModal = ({ isOpen, onClose, appointment, onSubmit }) => {
  const [scheduleData, setScheduleData] = useState({
    date: appointment?.date && typeof appointment.date === 'string' 
      ? appointment.date 
      : appointment?.date?.seconds 
        ? new Date(appointment.date.seconds * 1000).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
    time: appointment?.time || '',
    purpose: appointment?.purpose || 'Medical Consultation'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!isOpen || !appointment) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Create reschedule data object with only changed fields
    const rescheduleData = {
      ...appointment,
      date: scheduleData.date,
      time: scheduleData.time,
      purpose: scheduleData.purpose
    };
    
    // Submit and close
    onSubmit(rescheduleData);
    setIsSubmitting(false);
    onClose();
  };

  const isDonorAppointment = () => {
    return appointment.patientType === 'donor' || 
           appointment.type === 'donor' || 
           !!appointment.donorId || 
           !!appointment.organToDonate || 
           (appointment.appointmentType && appointment.appointmentType.toLowerCase().includes('donor'));
  };
  
  const patientName = appointment.patientName || 
                     appointment.donorName || 
                     appointment.recipientName || 
                     'Patient';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full mr-3 bg-orange-100 text-orange-700">
              <i className="fas fa-calendar-alt"></i>
            </span>
            Reschedule Appointment
            <span className="ml-2 text-base font-normal text-gray-500">
              ({isDonorAppointment() ? 'Donor' : 'Recipient'}: {patientName})
            </span>
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        {/* Content - scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit}>
            {/* Patient Information - Summary */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                <i className="far fa-calendar-alt mr-2"></i> Current Appointment Details
              </h4>
              <div className="bg-white p-4 rounded-md shadow-sm mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Current Date:</span> {typeof appointment.date === 'string' ? appointment.date : formatDate(appointment.date)}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Current Time:</span> {appointment.time || 'Not specified'}
                  </p>
                  <p className="text-gray-600 md:col-span-2">
                    <span className="font-medium">Current Purpose:</span> {appointment.purpose || appointment.appointmentPurpose || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* New Schedule Information */}
            <div className="bg-orange-50 p-4 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                <i className="fas fa-calendar-plus mr-2"></i> New Schedule Information
              </h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="date" className="block mb-2 text-sm font-medium text-gray-700">New Appointment Date</label>
                  <input
                    id="date"
                    type="date"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500"
                    value={scheduleData.date}
                    onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="time" className="block mb-2 text-sm font-medium text-gray-700">New Appointment Time</label>
                  <input
                    id="time"
                    type="time"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500"
                    value={scheduleData.time}
                    onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="purpose" className="block mb-2 text-sm font-medium text-gray-700">Appointment Purpose</label>
                  <select
                    id="purpose"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500"
                    value={scheduleData.purpose}
                    onChange={(e) => setScheduleData({ ...scheduleData, purpose: e.target.value })}
                  >
                    <option value="Medical Consultation">Medical Consultation</option>
                    <option value="Pre-Donation Assessment">Pre-Donation Assessment</option>
                    <option value="Post-Donation Follow-up">Post-Donation Follow-up</option>
                    <option value="Transplant Evaluation">Transplant Evaluation</option>
                    <option value="Laboratory Tests">Laboratory Tests</option>
                    <option value="Psychological Evaluation">Psychological Evaluation</option>
                    <option value="Other Medical Service">Other Medical Service</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-400 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-circle text-yellow-600"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Note: The patient will be notified of the rescheduled appointment. Please ensure the new time slot is available.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer with action buttons */}
        <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-200 flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-calendar-check mr-2"></i>
                Confirm Reschedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
