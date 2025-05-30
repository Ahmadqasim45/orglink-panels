import React from 'react';
import { getSafeValue, formatDate } from './RecipientUtils';

const MedicalInfoSection = ({ recipient }) => {
  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Medical Information</h3>
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Diagnosed Condition</p>
            <p className="font-medium">{getSafeValue(recipient, "diagnosedCondition")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Diagnosis Date</p>
            <p className="font-medium">{formatDate(recipient.diagnosisDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Treating Physician</p>
            <p className="font-medium">{getSafeValue(recipient, "treatingPhysician")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Physician Contact</p>
            <p className="font-medium">{getSafeValue(recipient, "physicianContact")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Diagnosis Hospital</p>
            <p className="font-medium">{getSafeValue(recipient, "diagnosisHospital")}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Medical History</p>
            <p className="font-medium">{getSafeValue(recipient, "medicalHistory", "None")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Allergies</p>
            <p className="font-medium">{getSafeValue(recipient, "allergies", "None")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Medications</p>
            <p className="font-medium">{getSafeValue(recipient, "currentMedications", "None")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MedicalInfoSection;
