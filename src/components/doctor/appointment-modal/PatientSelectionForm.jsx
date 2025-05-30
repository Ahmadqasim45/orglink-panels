import React from 'react';

const PatientSelectionForm = ({ 
  patientType, 
  selectedPatientId, 
  setPatientType,
  setSelectedPatientId,
  patientOptions,
  getDonorName,
  getRecipientName
}) => {
  return (
    <div className="mb-4 space-y-4">
      <div>
        <label className="block mb-2 font-medium">Patient Type</label>
        <select
          className="w-full p-2 border rounded-md"
          value={patientType}
          onChange={(e) => {
            setPatientType(e.target.value);
            setSelectedPatientId("");
          }}
        >
          <option value="donor">Donor</option>
          <option value="recipient">Recipient</option>
        </select>
      </div>

      <div>
        <label className="block mb-2 font-medium">Select {patientType === "donor" ? "Donor" : "Recipient"}</label>
        <select
          className="w-full p-2 border rounded-md"
          value={selectedPatientId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedPatientId(id);
            const selectedPatient = patientOptions.find(p => p.id === id);
            if (selectedPatient) {
              if (typeof window.setCurrentPatient === 'function') {
                window.setCurrentPatient(selectedPatient);
                window.setCurrentPatientType(patientType);
              } else {
                window.selectedPatientInfo = {
                  patient: selectedPatient,
                  type: patientType
                };
              }
            }
          }}
        >
          <option value="">Select a {patientType}</option>
          {patientOptions.map(patient => (
            <option key={patient.id} value={patient.id}>
              {patientType === "donor" ? getDonorName(patient) : getRecipientName(patient)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PatientSelectionForm;
