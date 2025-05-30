import React from 'react';
import { formatDate } from './RecipientUtils';

const ApprovalStatusSection = ({ recipient }) => {
  const getProgressWidth = (status) => {
    switch(status) {
      case 'pending': return '5%';
      case 'doctor-approved': return '50%';
      case 'admin-approved': return '100%';
      case 'rejected': return '0%';
      default: return '0%';
    }
  };
  
  const getProgressPercentage = (status) => {
    switch(status) {
      case 'pending': return '0%';
      case 'doctor-approved': return '50%';
      case 'admin-approved': return '100%';
      case 'rejected': return '0%';
      default: return '0%';
    }
  };

  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Approval Status</h3>
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Approval Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {getProgressPercentage(recipient.requestStatus)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-500" 
                 style={{ width: getProgressWidth(recipient.requestStatus) }}></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 mr-2 flex items-center justify-center ${
              recipient.requestStatus === "pending" || 
              recipient.requestStatus === "doctor-approved" || 
              recipient.requestStatus === "admin-approved" ? "bg-teal-500" : "bg-gray-300"
            }`}>
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">Application Submitted</p>
              <p className="text-sm text-gray-600">
                {recipient.requestSubmissionDate ? 
                  `Submitted on: ${formatDate(recipient.requestSubmissionDate)}` : 
                  "Application has been submitted for review"}
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 mr-2 flex items-center justify-center ${
              recipient.requestStatus === "doctor-approved" || 
              recipient.requestStatus === "admin-approved" ? "bg-teal-500" : 
              recipient.requestStatus === "rejected" && recipient.doctorReviewed ? "bg-red-500" : 
              "bg-gray-300"
            }`}>
              {recipient.requestStatus === "rejected" && recipient.doctorReviewed ? (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  {recipient.requestStatus === "doctor-approved" || recipient.requestStatus === "admin-approved" ? (
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  ) : (
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path>
                  )}
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-800">Doctor Review</p>
              <p className="text-sm text-gray-600">
                {recipient.requestStatus === "doctor-approved" ? "Approved by doctor" : 
                recipient.requestStatus === "admin-approved" ? "Approved by doctor" : 
                recipient.requestStatus === "rejected" && recipient.doctorReviewed ? "Rejected by doctor" : 
                "Awaiting doctor review"}
              </p>
              {recipient.doctorComment && (
                <p className="mt-1 text-sm italic text-gray-600">
                  "{recipient.doctorComment}"
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 mr-2 flex items-center justify-center ${
              recipient.requestStatus === "admin-approved" ? "bg-teal-500" : 
              recipient.requestStatus === "rejected" && recipient.adminReviewed ? "bg-red-500" : 
              "bg-gray-300"
            }`}>
              {recipient.requestStatus === "rejected" && recipient.adminReviewed ? (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  {recipient.requestStatus === "admin-approved" ? (
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  ) : (
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path>
                  )}
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-800">Admin Approval</p>
              <p className="text-sm text-gray-600">
                {recipient.requestStatus === "admin-approved" ? "Final approval granted" : 
                recipient.requestStatus === "doctor-approved" ? "Awaiting admin approval" : 
                recipient.requestStatus === "rejected" && recipient.adminReviewed ? "Rejected by admin" : 
                "Awaiting final review"}
              </p>
              {recipient.adminComment && (
                <p className="mt-1 text-sm italic text-gray-600">
                  "{recipient.adminComment}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApprovalStatusSection;
