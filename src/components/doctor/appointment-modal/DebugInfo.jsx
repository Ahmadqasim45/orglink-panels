import React from 'react';

const DebugInfo = ({ patientName, currentPatientType, currentPatient }) => {
  return (
    <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
      <details>
        <summary className="cursor-pointer font-medium mb-1">Debug Information (Click to expand)</summary>
        <div className="space-y-1 mt-2">
          <p><span className="font-mono">patientName:</span> {patientName}</p>
          <p><span className="font-mono">currentPatientType:</span> {currentPatientType || "not set"}</p>
          <p><span className="font-mono">Patient ID:</span> {currentPatient?.id || "not set"}</p>
          {currentPatientType === "recipient" && (
            <p><span className="font-mono">recipientId:</span> {currentPatient?.recipientId || "not set"}</p>
          )}
          {currentPatientType === "donor" && (
            <p><span className="font-mono">donorId:</span> {currentPatient?.donorId || "not set"}</p>
          )}
          <p><span className="font-mono">isBeingViewed:</span> {currentPatient?.isBeingViewed ? "true" : "false"}</p>
        </div>
      </details>
    </div>
  );
};

export default DebugInfo;
