import React from 'react';

const AppointmentForm = ({
  scheduleData,
  setScheduleData,
  purpose,
  setPurpose,
  currentPatient,
  existingAppointments
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-2 font-medium">Appointment Date</label>
        <input
          type="date"
          className={`w-full p-2 border rounded-md ${currentPatient && currentPatient.isBeingViewed ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          value={scheduleData.date}
          onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
          min={new Date().toISOString().split("T")[0]}
          required
          readOnly={currentPatient && currentPatient.isBeingViewed}
        />
      </div>
      
      <div>
        <label className="block mb-2 font-medium">Appointment Time</label>
        <input
          type="time"
          className={`w-full p-2 border rounded-md ${currentPatient && currentPatient.isBeingViewed ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          value={scheduleData.time}
          onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
          required
          readOnly={currentPatient && currentPatient.isBeingViewed}
        />
      </div>
      
      <div>
        <label className="block mb-2 font-medium">Appointment Purpose</label>
        <select
          id="appointmentPurpose"
          className={`w-full p-2 border rounded-md ${currentPatient && currentPatient.isBeingViewed ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          disabled={currentPatient && currentPatient.isBeingViewed}
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
      
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">
          Note: Make sure the selected time slot is available. Unavailable time slots will be rejected.
        </p>
        
        {existingAppointments.length > 0 && (
          <div className="bg-yellow-50 p-2 rounded-md">
            <p className="text-sm font-medium">Other scheduled appointments on this date:</p>
            <ul className="text-xs ml-4 list-disc">
              {existingAppointments
                .filter(apt => {
                  const aptDate = apt.date && apt.date.seconds 
                    ? new Date(apt.date.seconds * 1000).toISOString().split('T')[0]
                    : typeof apt.date === 'string' ? apt.date : '';
                  return aptDate === scheduleData.date;
                })
                .map((apt, index) => (
                  <li key={index}>{typeof apt.time === 'string' ? apt.time : 'Time not specified'}</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentForm;
