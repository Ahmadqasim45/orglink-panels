import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const WaitingListStatus = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [waitingListData, setWaitingListData] = useState(null);
  const [medicalFormData, setMedicalFormData] = useState(null);

  useEffect(() => {
    const fetchWaitingListStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        // Fetch medical form data
        const medicalFormRef = doc(db, "medicalForms", user.uid);
        const medicalFormDoc = await getDoc(medicalFormRef);

        if (!medicalFormDoc.exists()) {
          // If no medical form exists, redirect to medical form page
          navigate("/recipient/medical-form");
          return;
        }

        setMedicalFormData(medicalFormDoc.data());

        // In a real app, you would fetch waiting list data from Firestore
        // For this example, we'll use placeholder data
        const mockWaitingListData = {
          status: "on_waiting_list", // on_waiting_list, pending_approval, not_eligible
          position: 12,
          organNeeded: medicalFormDoc.data().organNeeded,
          listedDate: "2025-03-01",
          estimatedWaitTime: "6-12 months",
          urgencyLevel: medicalFormDoc.data().urgencyLevel,
          notes: "Regular check-ups required during waiting period"
        };

        setWaitingListData(mockWaitingListData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching waiting list status:", error);
        setLoading(false);
      }
    };

    fetchWaitingListStatus();
  }, [navigate]);

  const getStatusInfo = (status) => {
    const statusMap = {
      on_waiting_list: {
        color: "bg-green-100 border-green-500",
        icon: "✓",
        iconColor: "text-green-500",
        title: "On Waiting List",
        description: "You are currently on the waiting list for organ transplantation."
      },
      pending_approval: {
        color: "bg-yellow-100 border-yellow-500",
        icon: "⌛",
        iconColor: "text-yellow-500",
        title: "Pending Approval",
        description: "Your application is being reviewed for placement on the waiting list."
      },
      not_eligible: {
        color: "bg-red-100 border-red-500",
        icon: "✗",
        iconColor: "text-red-500",
        title: "Not Eligible",
        description: "Based on medical evaluation, you are currently not eligible for the waiting list."
      },
      initial_review: {
        color: "bg-blue-100 border-blue-500",
        icon: "🔍",
        iconColor: "text-blue-500",
        title: "Initial Review",
        description: "Your application is undergoing initial review by medical staff."
      },
      testing_phase: {
        color: "bg-purple-100 border-purple-500",
        icon: "🧪",
        iconColor: "text-purple-500",
        title: "Testing Phase",
        description: "Additional medical tests are being conducted to determine eligibility."
      }
    };

    return statusMap[status] || {
      color: "bg-gray-100 border-gray-500",
      icon: "?",
      iconColor: "text-gray-500",
      title: "Unknown Status",
      description: "Status information is not available."
    };
  };

  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }

  const statusInfo = getStatusInfo(waitingListData.status);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Waiting List Status</h2>
      
      <div className={`border-l-4 ${statusInfo.color} p-4 mb-8`}>
        <div className="flex items-center">
          <div className={`text-2xl ${statusInfo.iconColor} mr-3`}>{statusInfo.icon}</div>
          <div>
            <h3 className="text-lg font-semibold">{statusInfo.title}</h3>
            <p className="text-gray-600">{statusInfo.description}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Waiting List Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Waiting List Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Organ Needed:</span>
              <span className="font-medium capitalize">{waitingListData.organNeeded}</span>
            </div>
            
            {waitingListData.status === "on_waiting_list" && (
              <div className="flex justify-between">
                <span className="text-gray-600">Current Position:</span>
                <span className="font-medium">{waitingListData.position}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Listed Date:</span>
              <span className="font-medium">{waitingListData.listedDate}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Urgency Level:</span>
              <span className="font-medium capitalize">{waitingListData.urgencyLevel}</span>
            </div>
            
            {waitingListData.estimatedWaitTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Wait Time:</span>
                <span className="font-medium">{waitingListData.estimatedWaitTime}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Medical Form Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Medical Form Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Form Status:</span>
              <span className="font-medium capitalize">{medicalFormData.status.replace(/_/g, " ")}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Submitted Date:</span>
              <span className="font-medium">{medicalFormData.submittedAt ? new Date(medicalFormData.submittedAt).toLocaleDateString() : "N/A"}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Last Updated:</span>
              <span className="font-medium">{medicalFormData.updatedAt ? new Date(medicalFormData.updatedAt).toLocaleDateString() : "N/A"}</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate("/recipient/medical-form")}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Medical Form
          </button>
        </div>
      </div>
      
      {/* Next Steps */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
        
        {waitingListData.status === "on_waiting_list" && (
          <div className="space-y-4">
            <p>While you're on the waiting list, please:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Attend all scheduled appointments</li>
              <li>Complete any additional tests as requested</li>
              <li>Keep your contact information up to date</li>
              <li>Stay within 4 hours of the transplant center</li>
              <li>Maintain your health as advised by your doctor</li>
            </ul>
          </div>
        )}
        
        {waitingListData.status === "pending_approval" && (
          <div className="space-y-4">
            <p>To complete your waiting list application:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Attend your upcoming evaluation appointments</li>
              <li>Submit any additional documentation requested</li>
              <li>Complete all required medical tests</li>
              <li>Ensure all insurance information is up to date</li>
            </ul>
          </div>
        )}
        
        {waitingListData.status === "not_eligible" && (
          <div className="space-y-4">
            <p>Based on your current evaluation:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Schedule a consultation with your doctor to discuss the results</li>
              <li>Ask about alternative treatments or therapies</li>
              <li>Inquire about steps to improve eligibility in the future</li>
            </ul>
          </div>
        )}
        
        {waitingListData.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p className="font-medium">Additional Notes:</p>
            <p className="text-gray-600">{waitingListData.notes}</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => navigate("/recipient/dashboard")}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
        
        <button
          onClick={() => navigate("/recipient/appointments")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          View Appointments
        </button>
      </div>
    </div>
  );
};

export default WaitingListStatus;