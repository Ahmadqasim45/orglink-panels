import React from 'react';
import { getSafeValue } from './RecipientUtils';

const OrganRequestSection = ({ recipient }) => {
  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Organ Request</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Request Type</p>
          <p className="font-medium capitalize">{getSafeValue(recipient, "requestType")}</p>
        </div>
        {recipient.requestType === "organ" && (
          <div>
            <p className="text-sm text-gray-500">Organ Type</p>
            <p className="font-medium capitalize">{getSafeValue(recipient, "organType")}</p>
          </div>
        )}
        {recipient.requestType === "blood" && (
          <div>
            <p className="text-sm text-gray-500">Blood Product Type</p>
            <p className="font-medium capitalize">{getSafeValue(recipient, "bloodProductType")}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500">Required Quantity</p>
          <p className="font-medium">{getSafeValue(recipient, "requiredQuantity")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Urgency Level</p>
          <p className="font-medium capitalize">{getSafeValue(recipient, "urgencyLevel")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Request Date</p>
          <p className="font-medium">{getSafeValue(recipient, "requestDate")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Estimated Timeframe</p>
          <p className="font-medium">{getSafeValue(recipient, "estimatedTimeframe")}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-gray-500">Request Reason</p>
          <p className="font-medium">{getSafeValue(recipient, "requestReason")}</p>
        </div>
      </div>
    </section>
  );
};

export default OrganRequestSection;
