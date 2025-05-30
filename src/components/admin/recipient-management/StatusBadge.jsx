import React from 'react';

const StatusBadge = ({ status }) => {
  let bgClass = "bg-yellow-100 text-yellow-800";
  let displayText = "Pending";

  if (status === "admin-approved") {
    bgClass = "bg-green-100 text-green-800";
    displayText = "Approved";
  } else if (status === "doctor-approved") {
    bgClass = "bg-blue-100 text-blue-800";
    displayText = "Doctor Approved";
  } else if (status === "rejected") {
    bgClass = "bg-red-100 text-red-800";
    displayText = "Rejected";
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgClass}`}>
      {displayText}
    </span>
  );
};

export default StatusBadge;
