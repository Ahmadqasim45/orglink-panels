import React from 'react';

const AppointmentHistorySection = ({ appointmentHistory }) => {
  if (!appointmentHistory || appointmentHistory.length <= 1) return null;

  return (
    <div className="mt-4 pt-3 border-t-2 border-blue-200">
      <h4 className="font-medium text-blue-800 mb-2">Appointment History</h4>
      <div className="max-h-48 overflow-y-auto bg-white rounded border border-blue-100 p-2">
        <ul className="text-sm">
          {appointmentHistory
            .sort((a, b) => {
              // Sort by date descending (newest first)
              const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date || 0);
              const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date || 0);
              return dateB - dateA;
            })
            .map((apt, index) => {
              const aptDate = apt.date?.seconds 
                ? new Date(apt.date.seconds * 1000).toLocaleDateString()
                : typeof apt.date === 'string' ? apt.date : 'Unknown date';
              return (
                <li key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between">
                    <span className="font-medium">{aptDate} {apt.time || ''}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      apt.status === "completed" ? "bg-green-100 text-green-800" : 
                      apt.status === "cancelled" ? "bg-red-100 text-red-800" : 
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {apt.status || "scheduled"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{apt.purpose || 'No purpose specified'}</div>
                  {apt.notes && <div className="text-xs italic mt-1">{apt.notes}</div>}
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
};

export default AppointmentHistorySection;
