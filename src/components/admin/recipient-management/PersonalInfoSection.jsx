import React from 'react';
import { getSafeValue } from './RecipientUtils';

const PersonalInfoSection = ({ recipient }) => {
  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Full Name</p>
          <p className="font-medium">{getSafeValue(recipient, "fullName")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Date of Birth</p>
          <p className="font-medium">{getSafeValue(recipient, "dateOfBirth")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Gender</p>
          <p className="font-medium capitalize">{getSafeValue(recipient, "gender")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">ID/Insurance Number</p>
          <p className="font-medium">{getSafeValue(recipient, "nationalId")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{getSafeValue(recipient, "email")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Phone</p>
          <p className="font-medium">{getSafeValue(recipient, "phone")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Address</p>
          <p className="font-medium">{getSafeValue(recipient, "address")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Zip/Postal Code</p>
          <p className="font-medium">{getSafeValue(recipient, "zipCode")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Weight</p>
          <p className="font-medium">{getSafeValue(recipient, "weight") !== "N/A" ? `${recipient.weight} kg` : "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Height</p>
          <p className="font-medium">{getSafeValue(recipient, "height") !== "N/A" ? `${recipient.height} cm` : "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Blood Type</p>
          <p className="font-medium">{getSafeValue(recipient, "bloodType")}</p>
        </div>
      </div>
    </section>
  );
};

export default PersonalInfoSection;
