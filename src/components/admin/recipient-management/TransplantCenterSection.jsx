import React from 'react';
import { getSafeValue } from './RecipientUtils';

const TransplantCenterSection = ({ recipient }) => {
  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Transplant Center</h3>
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Province/State</p>
            <p className="font-medium">{getSafeValue(recipient, "state")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">City</p>
            <p className="font-medium">{getSafeValue(recipient, "city")}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Hospital/Transplant Center</p>
            <p className="font-medium">{getSafeValue(recipient, "hospitalAssociation")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransplantCenterSection;
