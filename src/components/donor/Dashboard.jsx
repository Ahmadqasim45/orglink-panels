import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../../contexts/UserContext";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { APPROVAL_STATUS } from "../../utils/approvalSystem";

// Define additional status constants for waiting list and match found
const DONOR_STATUS = {
  WAITING_LIST: "waiting-list",
  MATCH_FOUND: "match-found",
};

function DonorDashboard() {
  const { user } = useContext(UserContext);
  const [medicalStatus, setMedicalStatus] = useState(null);
  const [previousApplications, setPreviousApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedicalStatus = async () => {
      if (!user) return;

      try {
        setLoading(true);
        // Fetch current application
        const docRef = doc(db, "medicalRecords", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMedicalStatus(docSnap.data());
        }

        // Fetch previous applications
        const applicationsRef = collection(db, "medicalRecords");
        const applicationsQuery = query(
          applicationsRef,
          where("donorId", "==", user.uid)
        );
        const querySnapshot = await getDocs(applicationsQuery);
        const applications = [];
        querySnapshot.forEach((doc) => {
          applications.push({ id: doc.id, ...doc.data() });
        });
        setPreviousApplications(applications);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalStatus();
  }, [user]);

  const formatSubmittedAt = (submittedAt) => {
    if (!submittedAt) return "N/A";

    try {
      // Handle Firestore Timestamp
      if (submittedAt.toDate) {
        return new Date(submittedAt.toDate()).toLocaleDateString();
      }

      // Handle Date object
      if (submittedAt instanceof Date) {
        return submittedAt.toLocaleDateString();
      }

      // Handle string (e.g., ISO date string)
      return new Date(submittedAt).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };
  const canReapply = (rejectionDate) => {
    if (!rejectionDate) return false;
    const daysSinceRejection = Math.floor(
      (new Date() - new Date(rejectionDate.toDate())) / (1000 * 60 * 60 * 24)
    );
    return daysSinceRejection >= 15;
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
      case APPROVAL_STATUS.PENDING:
        return "Pending Review";
      case "doctor-approved":
      case APPROVAL_STATUS.DOCTOR_APPROVED:
        return "Doctor Approved";
      case "initial-doctor-approved":
      case APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED:
        return "Doctor Initially Approved";
      case "pending-initial-admin-approval":
      case APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL:
        return "Pending Initial Admin Approval";      case "initially-approved":
      case APPROVAL_STATUS.INITIALLY_APPROVED:
        return "Initial Admin Approved";
      case "medical-evaluation-in-progress":
      case APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS:
        return "Medical Evaluation In Progress";      case "medical-evaluation-completed":
      case APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED:
        return "Medical Evaluation Completed";
      case APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW:
      case "pending-final-admin-review":
        return "Pending Final Admin Review";      case APPROVAL_STATUS.FINAL_ADMIN_APPROVED:
      case "final-admin-approved":
      case "Final Admin Approved":
        return "🎉 Final Admin Approved!";
      case DONOR_STATUS.WAITING_LIST:
      case "waiting-list":
        return "⏱️ On Waiting List";
      case DONOR_STATUS.MATCH_FOUND:
      case "match-found":
        return "✨ Match Found!";
      case APPROVAL_STATUS.FINAL_ADMIN_REJECTED:
      case "final-admin-rejected":
      case "Final Admin Rejected":
        return "❌ Final Admin Rejected";
      case "admin-approved":
      case APPROVAL_STATUS.ADMIN_APPROVED:
        return "Admin Approved";
      case "admin-rejected":
      case APPROVAL_STATUS.ADMIN_REJECTED:
        return "Admin Rejected";
      case "initial-admin-rejected":
      case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
        return "Rejected Admin Initial";
      case "initial-doctor-rejected":
      case APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED:
        return "Doctor Rejected";
      default:
        return status
          ? status.charAt(0).toUpperCase() + status.slice(1)
          : "Unknown";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
      case APPROVAL_STATUS.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case "doctor-approved":
      case APPROVAL_STATUS.DOCTOR_APPROVED:
        return "bg-blue-100 text-blue-800";
      case "initial-doctor-approved":
      case APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED:
        return "bg-blue-50 text-blue-800";
      case "pending-initial-admin-approval":
      case APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL:
        return "bg-orange-100 text-orange-800";
      case "initially-approved":
      case APPROVAL_STATUS.INITIALLY_APPROVED:
        return "bg-green-100 text-green-800";
      case "medical-evaluation-in-progress":
      case APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS:
        return "bg-purple-100 text-purple-800";      case "medical-evaluation-completed":
      case APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED:
        return "bg-purple-100 text-purple-800";
      case APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW:
      case "pending-final-admin-review":
        return "bg-orange-100 text-orange-800";      case APPROVAL_STATUS.FINAL_ADMIN_APPROVED:
      case "final-admin-approved":
      case "Final Admin Approved":
        return "bg-green-100 text-green-800";
      case DONOR_STATUS.WAITING_LIST:
      case "waiting-list":
        return "bg-indigo-100 text-indigo-800";
      case DONOR_STATUS.MATCH_FOUND:
      case "match-found":
        return "bg-pink-100 text-pink-800";
      case APPROVAL_STATUS.FINAL_ADMIN_REJECTED:
      case "final-admin-rejected":
      case "Final Admin Rejected":
        return "bg-red-100 text-red-800";case "admin-approved":
      case APPROVAL_STATUS.ADMIN_APPROVED:
        return "bg-green-100 text-green-800";
      case "admin-rejected":
      case APPROVAL_STATUS.ADMIN_REJECTED:
        return "bg-red-100 text-red-800";
      case "initial-admin-rejected":
      case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
        return "bg-red-200 text-red-800";
      case "initial-doctor-rejected":
      case APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED:
        return "bg-red-100 text-red-800";      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const getProgressPercentage = (status) => {
    switch (status) {
      case APPROVAL_STATUS.PENDING:
      case "pending":
        return "0%";
      case APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED:
      case "initial-doctor-approved":
        return "25%";
      case APPROVAL_STATUS.INITIALLY_APPROVED:
      case "initially-approved":
        return "40%";
      case APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS:
      case "medical-evaluation-in-progress":
        return "65%";
      case APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED:
      case "medical-evaluation-completed":
        return "75%";
      case APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW:
      case "pending-final-admin-review":
        return "85%";
      case APPROVAL_STATUS.DOCTOR_APPROVED:
      case "doctor-approved":
        return "80%";      case APPROVAL_STATUS.ADMIN_APPROVED:
      case "admin-approved":
      case APPROVAL_STATUS.FINAL_ADMIN_APPROVED:
      case "final-admin-approved":
      case "Final Admin Approved":
      case "approved":
        return "70%";
      case DONOR_STATUS.WAITING_LIST:
      case "waiting-list":
        return "85%";
      case DONOR_STATUS.MATCH_FOUND:
      case "match-found":
        return "100%";
      case APPROVAL_STATUS.ADMIN_REJECTED:
      case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
      case APPROVAL_STATUS.FINAL_ADMIN_REJECTED:
      case "rejected":
      case "initial-admin-rejected":
      case "final-admin-rejected":
      case "Final Admin Rejected":
        return "0%";
      default:
        return "0%";
    }
  };

  if (loading)
    return <p className="text-center p-4">Loading your information...</p>;
  if (!user)
    return <p className="text-center p-4">Please log in to view your dashboard.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Donor Dashboard</h2>

      {/* Quick Actions Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Link
            to="/donor/appointments"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg
                className="w-6 h-6 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-medium">My Appointments</h4>
              <p className="text-sm text-gray-600">
                View your scheduled appointments
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Current Application Status */}
      {!medicalStatus ? (
        <div className="bg-yellow-100 p-4 rounded mb-6">
          <p>You haven't submitted your medical information yet.</p>
          <Link
            to="/donor/medical-form"
            className="mt-2 inline-block bg-blue-500 text-white px-4 py-2 rounded"
          >
            Submit Medical Information
          </Link>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-bold mb-4">Application Status</h3>          {/* Status Badge */}
          <div className="flex items-center mb-4">
            <span className="font-medium text-gray-700 mr-2">Status:</span>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                medicalStatus.requestStatus || medicalStatus.status
              )}`}
            >
              {getStatusText(medicalStatus.requestStatus || medicalStatus.status)}
            </span>
          </div>

          {/* Appointment Eligibility Notification */}
          {(medicalStatus.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
            medicalStatus.status === "initially-approved") && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800">
                    🎉 Congratulations! You are eligible for appointments
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    Administration initially approved your request. You can now schedule appointments with doctors.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_ADMIN_REJECTED || 
            medicalStatus.status === "initial-admin-rejected") && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">
                    Application Initially Rejected
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    You are not eligible and rejected by administration initially. Please contact support for more information.
                  </p>
                </div>
              </div>
            </div>
          )}          {(medicalStatus.requestStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL || 
            medicalStatus.status === "pending-initial-admin-approval") && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-orange-800">
                    Pending Initial Admin Approval
                  </h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Your application is currently being reviewed by administration for initial approval.
                  </p>
                </div>
              </div>
            </div>
          )}          {/* Medical Evaluation In Progress - Appointment Eligibility */}
          {(medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
            medicalStatus.status === "medical-evaluation-in-progress") && (
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-purple-800">
                    ⚕️ Medical Evaluation In Progress
                  </h4>
                  <p className="text-sm text-purple-700 mt-1">
                    {medicalStatus.evaluationMessage || 'Your appointment is scheduled - View your appointments'}
                  </p>
                  <Link 
                    to="/donor/appointments" 
                    className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 mt-2 font-medium"
                  >
                    View Your Appointments
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Medical Evaluation Completed - Appointment Eligibility */}
          {(medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
            medicalStatus.status === "medical-evaluation-completed") && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    ⚕️ Medical Evaluation Completed Successfully
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {medicalStatus.evaluationMessage || 'Your appointment or evaluation process completed'}
                  </p>
                </div>
              </div>
            </div>
          )}{/* Enhanced 4-Stage Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                Approval Progress
              </span>
              <span className="text-sm font-medium text-gray-700">
                {getProgressPercentage(
                  medicalStatus.requestStatus || medicalStatus.status
                )}
              </span>
            </div>
            
            {/* Enhanced stepped progress visualization */}
            <div className="relative pt-4 pb-6 mt-4">
              {/* Main progress track */}
              <div className="w-full bg-gray-200 h-2 rounded-full absolute top-4"></div>
              
              {/* Active progress */}              <div
                className="bg-blue-600 h-2 rounded-full absolute top-4 transition-all duration-700 ease-in-out"
                style={{
                  width: getProgressPercentage(medicalStatus.requestStatus || medicalStatus.status)
                }}
              ></div>
              
              {/* Stage markers */}
              <div className="flex justify-between relative">
                {/* Stage 1: Initial Review */}
                <div className="text-center">
                  <div className={`
                    w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                    ${medicalStatus.requestStatus === "pending" ? 
                      "bg-blue-500 ring-4 ring-blue-100" :                      (medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED || 
                      medicalStatus.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ||
                      medicalStatus.status === "initially-approved" ||
                      medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                      medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                      medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED ||
                      medicalStatus.requestStatus === "approved" ||
                      medicalStatus.status === "approved") ? 
                      "bg-green-500" : 
                      medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ? 
                      "bg-red-500" : 
                      "bg-gray-400"}
                  `}>
                    {(medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED || 
                     medicalStatus.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ||
                     medicalStatus.status === "initially-approved" ||
                     medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                     medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                     medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED ||
                     medicalStatus.requestStatus === "approved" ||
                     medicalStatus.status === "approved") ?
                      "✓" : medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ? 
                      "✗" : "1"}
                  </div>
                  <div className="mt-2 text-xs font-medium">Initial Review</div>
                  <div className="text-xs text-gray-500">Medical information</div>
                </div>
                
                {/* Stage 1.5: Initial Admin Approval (New Stage) */}
                <div className="text-center">
                  <div className={`
                    w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                    ${(medicalStatus.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                     medicalStatus.status === "initially-approved") ? 
                      "bg-blue-500 ring-4 ring-blue-100" : 
                      (medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                      medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                      medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                      "bg-green-500" : 
                      "bg-gray-400"}
                  `}>
                    {(medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                     medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                     medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                      "✓" : (medicalStatus.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                     medicalStatus.status === "initially-approved") ? 
                      "◐" : "1.5"}
                  </div>
                  <div className="mt-2 text-xs font-medium">Initial Admin Approval</div>
                  <div className="text-xs text-gray-500">Ready for appointments</div>
                </div>
                
                {/* Stage 2: Medical Evaluation */}
                <div className="text-center">
                  <div className={`
                    w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                    ${(medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                      medicalStatus.status === "medical-evaluation-in-progress") ? 
                      "bg-purple-500 ring-4 ring-purple-100" : 
                      (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                      medicalStatus.status === "medical-evaluation-completed") ? 
                      "bg-blue-500 ring-4 ring-blue-100" : 
                      (medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                      medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                      medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                      "bg-green-500" : 
                      medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ? 
                      "bg-red-500" : 
                      "bg-gray-400"}
                  `}>
                    {(medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                     medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                     medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                      "✓" : 
                      (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                      medicalStatus.status === "medical-evaluation-in-progress") ? 
                      "⚕" : 
                      (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                      medicalStatus.status === "medical-evaluation-completed") ? 
                      "✓" : 
                      medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ? 
                      "✗" : "2"}
                  </div>
                  <div className="mt-2 text-xs font-medium">Medical Evaluation</div>
                  <div className="text-xs text-gray-500">
                    {(medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                      medicalStatus.status === "medical-evaluation-in-progress") ? 
                      "In Progress" : 
                      (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                      medicalStatus.status === "medical-evaluation-completed") ? 
                      "Completed" : 
                      "Appointment & assessment"}
                  </div>
                </div>
                  {/* Stage 3: Admin Final Decision */}
                <div className="text-center">
                  <div className={`
                    w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                    ${medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? 
                      "bg-blue-500 ring-4 ring-blue-100" : 
                      (medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                      medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                      "bg-green-500" : 
                      medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED ? 
                      "bg-red-500" : 
                      "bg-gray-400"}
                  `}>
                    {(medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                     medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                      "✓" : medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED ? 
                      "✗" : "3"}
                  </div>
                  <div className="mt-2 text-xs font-medium">Final Approval</div>
                  <div className="text-xs text-gray-500">Admin review</div>
                </div>
                
                {/* Stage 4: Waiting List */}
                <div className="text-center">
                  <div className={`
                    w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                    ${(medicalStatus.requestStatus === DONOR_STATUS.WAITING_LIST || 
                      medicalStatus.status === "waiting-list") ? 
                      "bg-indigo-500 ring-4 ring-indigo-100" : 
                      (medicalStatus.requestStatus === DONOR_STATUS.MATCH_FOUND || 
                       medicalStatus.status === "match-found") ? 
                      "bg-green-500" : 
                      "bg-gray-400"}
                  `}>
                    {(medicalStatus.requestStatus === DONOR_STATUS.MATCH_FOUND || 
                     medicalStatus.status === "match-found") ? 
                      "✓" : 
                     (medicalStatus.requestStatus === DONOR_STATUS.WAITING_LIST || 
                      medicalStatus.status === "waiting-list") ? 
                      "⏱️" : "4"}
                  </div>
                  <div className="mt-2 text-xs font-medium">Waiting List</div>
                  <div className="text-xs text-gray-500">Awaiting match</div>
                </div>
                
                {/* Stage 5: Match Found */}
                <div className="text-center">
                  <div className={`
                    w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                    ${(medicalStatus.requestStatus === DONOR_STATUS.MATCH_FOUND || 
                       medicalStatus.status === "match-found") ? 
                      "bg-pink-500 ring-4 ring-pink-100" : 
                      "bg-gray-400"}
                  `}>
                    {(medicalStatus.requestStatus === DONOR_STATUS.MATCH_FOUND || 
                     medicalStatus.status === "match-found") ? 
                      "✨" : "5"}
                  </div>
                  <div className="mt-2 text-xs font-medium">Match Found</div>
                  <div className="text-xs text-gray-500">Ready for transplant</div>
                </div>
              </div>
            </div>
            
            {/* Current status indicator */}
            <div className="mt-6 text-center">              <span className={`px-3 py-1 text-sm font-medium rounded-full
                ${medicalStatus.requestStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                  medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "bg-blue-100 text-blue-800" :
                  (medicalStatus.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                   medicalStatus.status === "initially-approved") ? "bg-green-100 text-green-800" :
                  (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                   medicalStatus.status === "medical-evaluation-in-progress") ? "bg-purple-100 text-purple-800" :
                  (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                   medicalStatus.status === "medical-evaluation-completed") ? "bg-blue-100 text-blue-800" :
                  medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "bg-blue-100 text-blue-800" :
                  medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED ? "bg-green-100 text-green-800" :
                  (medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED ||
                   medicalStatus.requestStatus === "approved" ||
                   medicalStatus.status === "approved") ? "bg-green-100 text-green-800" :
                  (medicalStatus.requestStatus === DONOR_STATUS.WAITING_LIST ||
                   medicalStatus.status === "waiting-list") ? "bg-indigo-100 text-indigo-800" :
                  (medicalStatus.requestStatus === DONOR_STATUS.MATCH_FOUND ||
                   medicalStatus.status === "match-found") ? "bg-pink-100 text-pink-800" :
                  "bg-red-100 text-red-800"}
              `}>
                <span className="mr-1">●</span>                {medicalStatus.requestStatus === "pending" ? "Awaiting Initial Review" :
                  medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "Awaiting Initial Admin Approval" :
                  (medicalStatus.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                   medicalStatus.status === "initially-approved") ? "Ready for Medical Evaluation" :
                  (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                   medicalStatus.status === "medical-evaluation-in-progress") ? "Evaluation Process" :
                  (medicalStatus.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                   medicalStatus.status === "medical-evaluation-completed") ? "Complete Evaluation" :
                  medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "Awaiting Final Admin Approval" :
                  (medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                   medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED ||
                   medicalStatus.requestStatus === "approved" ||
                   medicalStatus.status === "approved") ? "🎉 Final Approval Completed - Fully Approved!" :
                  (medicalStatus.requestStatus === DONOR_STATUS.WAITING_LIST ||
                   medicalStatus.status === "waiting-list") ? "⏱️ On Waiting List - Awaiting Match" :
                  (medicalStatus.requestStatus === DONOR_STATUS.MATCH_FOUND ||
                   medicalStatus.status === "match-found") ? "✨ Match Found - Ready for Transplant!" :
                  (medicalStatus.requestStatus === "rejected" ||
                   medicalStatus.status === "rejected") ? "❌ Application Rejected" :
                  "Application Status"}
              </span>
            </div>
            
            {/* Submission date */}
            <p className="text-xs text-gray-500 mt-2">
              {medicalStatus.submittedAt && (
                <span>
                  Submitted on:{" "}
                  {formatSubmittedAt(medicalStatus.submittedAt)}
                </span>
              )}
            </p>
          </div>{/* Status Messages */}
          {(medicalStatus.requestStatus === "pending" ||
            medicalStatus.status === "pending" ||
            medicalStatus.requestStatus === APPROVAL_STATUS.PENDING ||
            medicalStatus.status === APPROVAL_STATUS.PENDING) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-yellow-800 font-medium">
                Your donation application is under review.
              </p>
              <p className="text-yellow-700 mt-1">
                The medical team is reviewing your information. You will be
                notified when there's an update.
              </p>
            </div>
          )}
          
          {(medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ||
            medicalStatus.status === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ||
            medicalStatus.requestStatus === "initial-doctor-approved") && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="text-blue-800 font-medium">
                Your request for donation is Initially Approved from Medical Team.
              </p>

              {medicalStatus.doctorComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-800">
                    Medical Team Note:
                  </p>
                  <p className="italic">{medicalStatus.doctorComment}</p>
                </div>
              )}              <p className="mt-2 text-blue-700">
                A medical professional will schedule your evaluation appointment. Please check your appointments regularly.
              </p>
              
              <div className="mt-4">
                <Link
                  to="/donor/appointments"
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  View My Appointments
                </Link>
              </div>
            </div>
          )}          {(medicalStatus.requestStatus === "doctor-approved" || 
            medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED) && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="text-blue-800 font-medium">
                Your medical evaluation was successful! You are approved by the medical team.
              </p>              {medicalStatus.finalDoctorComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-800">
                    Medical Evaluation Results:
                  </p>
                  <p className="italic">{medicalStatus.finalDoctorComment}</p>
                </div>
              )}

              <div className="mt-2">
                <p className="text-blue-700">
                  <span className="font-medium">Hospital:</span>{" "}
                  {medicalStatus.assignedHospitalName || medicalStatus.hospital}
                </p>
                <p className="text-blue-700 mt-1">
                  The hospital will contact you shortly to schedule your
                  donation.
                </p>
              </div>
            </div>
          )}          {(medicalStatus.requestStatus === "admin-approved" ||
            medicalStatus.status === "approved" ||
            medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED ||
            medicalStatus.status === APPROVAL_STATUS.FINAL_APPROVED ||
            medicalStatus.requestStatus === "approved") && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <p className="text-green-800 font-medium">
                🎉 Congratulations! Your donation application has been fully
                approved!
              </p>

              {medicalStatus.finalAdminNotes && (
                <div className="mt-2 bg-white p-3 rounded-md border border-green-200">
                  <p className="font-medium text-green-800">Final Approval Note:</p>
                  <p className="italic">{medicalStatus.finalAdminNotes}</p>
                </div>
              )}

              {medicalStatus.adminComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-green-200">
                  <p className="font-medium text-green-800">Approval Note:</p>
                  <p className="italic">{medicalStatus.adminComment}</p>
                </div>
              )}              <div className="mt-2">
                <p className="text-green-700">
                  <span className="font-medium">Hospital:</span>{" "}
                  {medicalStatus.assignedHospitalName || medicalStatus.hospital}
                </p>
                <p className="text-green-700 mt-1">
                  The hospital will contact you shortly to schedule your
                  donation.
                </p>
              </div>
            </div>
          )}
          
          {/* Waiting List Status */}
          {(medicalStatus.requestStatus === DONOR_STATUS.WAITING_LIST ||
            medicalStatus.status === "waiting-list") && (
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-6">
              <p className="text-indigo-800 font-medium">
                ⏱️ You have been added to the organ donation waiting list!
              </p>
              
              {medicalStatus.waitingListNotes && (
                <div className="mt-2 bg-white p-3 rounded-md border border-indigo-200">
                  <p className="font-medium text-indigo-800">Waiting List Information:</p>
                  <p className="italic">{medicalStatus.waitingListNotes}</p>
                </div>
              )}
              
              <div className="mt-2">
                <p className="text-indigo-700">
                  <span className="font-medium">Your blood type:</span>{" "}
                  {medicalStatus.bloodType || "Not specified"}
                </p>
                <p className="text-indigo-700 mt-1">
                  <span className="font-medium">Organ type:</span>{" "}
                  {medicalStatus.organType || medicalStatus.organToDonate || "Not specified"}
                </p>
                <p className="text-indigo-700 mt-1">
                  We are actively looking for a suitable match for your organ donation.
                  You will be notified when a match is found.
                </p>
              </div>
            </div>
          )}
          
          {/* Match Found Status */}
          {(medicalStatus.requestStatus === DONOR_STATUS.MATCH_FOUND ||
            medicalStatus.status === "match-found") && (
            <div className="bg-pink-50 border-l-4 border-pink-400 p-4 mb-6">
              <p className="text-pink-800 font-medium">
                ✨ Great news! A match has been found for your organ donation!
              </p>
              
              {medicalStatus.matchFoundNotes && (
                <div className="mt-2 bg-white p-3 rounded-md border border-pink-200">
                  <p className="font-medium text-pink-800">Match Information:</p>
                  <p className="italic">{medicalStatus.matchFoundNotes}</p>
                </div>
              )}
              
              <div className="mt-2">
                <p className="text-pink-700">
                  <span className="font-medium">Match compatibility:</span>{" "}
                  {medicalStatus.matchCompatibility || "High"}
                </p>
                <p className="text-pink-700 mt-1">
                  <span className="font-medium">Hospital:</span>{" "}
                  {medicalStatus.assignedHospitalName || medicalStatus.hospital || "To be determined"}
                </p>
                <p className="text-pink-700 mt-1">
                  The hospital will contact you shortly to schedule the transplant procedure.
                  Thank you for your life-changing gift!
                </p>
              </div>
              
              <div className="mt-4">
                <Link
                  to="/donor/appointments"
                  className="inline-block bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition"
                >
                  View My Appointments
                </Link>
              </div>
            </div>
          )}
          
          {/* Rejection Messages */}
          {(medicalStatus.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ||
             medicalStatus.status === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ||
             medicalStatus.requestStatus === "initial-doctor-rejected") && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <p className="text-red-800 font-medium">
                You are not eligible for donation.
              </p>

              {(medicalStatus.doctorComment || medicalStatus.rejectionReason) && (
                <div className="mt-2 bg-white p-3 rounded-md border border-red-200">
                  <p className="font-medium text-red-800">Reason for Rejection:</p>
                  <p className="italic">
                    {medicalStatus.doctorComment ||
                      medicalStatus.rejectionReason ||
                      "No reason provided."}
                  </p>
                </div>
              )}
              
              <p className="text-red-700 mt-2">
                Based on the medical information provided, you do not meet the donation criteria.
              </p>
            </div>
          )}
          
          {(medicalStatus.requestStatus === "rejected" ||
            medicalStatus.status === "rejected" ||
            medicalStatus.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ||
            medicalStatus.status === APPROVAL_STATUS.DOCTOR_REJECTED ||
            medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED ||
            medicalStatus.status === APPROVAL_STATUS.ADMIN_REJECTED ||
            medicalStatus.requestStatus === APPROVAL_STATUS.FINAL_REJECTED ||
            medicalStatus.status === APPROVAL_STATUS.FINAL_REJECTED) && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">              <p className="text-red-800 font-medium">
                {medicalStatus.finalAdminDecision === 'rejected' ? 
                  "❌ Final decision: Your donation application has been permanently rejected by administration after medical evaluation." :
                  medicalStatus.finalDoctorRejected ? 
                  "Based on your medical evaluation, we're unable to proceed with your donation." :
                  medicalStatus.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED || medicalStatus.requestStatus === "rejected" ? 
                  "Your donation application has been declined by administration." :
                  "We're sorry, your donation application has been declined."}
              </p>

              {medicalStatus.finalAdminNotes && (
                <div className="mt-2 bg-white p-3 rounded-md border border-red-200">
                  <p className="font-medium text-red-800">Final Admin Decision:</p>
                  <p className="italic">
                    {medicalStatus.finalAdminNotes || "No details provided."}
                  </p>
                </div>
              )}

              {medicalStatus.finalDoctorComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-red-200">
                  <p className="font-medium text-red-800">Medical Evaluation Results:</p>
                  <p className="italic">
                    {medicalStatus.finalDoctorComment || "No details provided."}
                  </p>
                </div>
              )}
              
              {(medicalStatus.doctorComment || medicalStatus.rejectionReason) && !medicalStatus.finalDoctorComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-red-200">
                  <p className="font-medium text-red-800">Reason for Rejection:</p>
                  <p className="italic">
                    {medicalStatus.doctorComment ||
                      medicalStatus.rejectionReason ||
                      "No reason provided."}
                  </p>
                </div>
              )}
              
              {medicalStatus.adminComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-red-200">
                  <p className="font-medium text-red-800">Admin Note:</p>
                  <p className="italic">
                    {medicalStatus.adminComment || "No details provided."}
                  </p>
                </div>
              )}

              {canReapply(medicalStatus.submittedAt) ? (
                <div className="mt-3">
                  <p className="text-red-700 mb-2">
                    You can now submit a new application.
                  </p>
                  <Link
                    to="/donor/medical-form"
                    className="inline-block bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Submit New Application
                  </Link>
                </div>
              ) : (
                <p className="text-red-700 mt-2">
                  You can reapply 15 days after the rejection date.
                </p>
              )}
            </div>
          )}

          {/* Medical Details Collapsible Section */}
          <details className="mt-4">
            <summary className="cursor-pointer text-blue-600 font-medium">
              View Submitted Medical Information
            </summary>
            <div className="mt-3 border rounded-md p-3">
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  {Object.entries(medicalStatus).map(([key, value]) => {
                    // Skip certain fields that are displayed elsewhere or not relevant
                    if (
                      [
                        "status",
                        "donorId",
                        "submittedAt",
                        "requestStatus",
                        "doctorApproved",
                        "adminApproved",
                        "doctorComment",
                        "adminComment",
                        "assignedHospitalName",
                        "hospitalId",
                      ].includes(key)
                    ) {
                      return null;
                    }

                    // Format object values and handle nested data
                    let displayValue = value;
                    if (typeof value === "object" && value !== null) {
                      if (value.toDate) {
                        // Timestamp
                        displayValue = formatSubmittedAt(value);
                      } else {
                        // Other objects
                        // Create a readable representation of objects
                        const objEntries = Object.entries(value)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ");
                        displayValue = objEntries || "N/A";
                      }
                    }

                    return (
                      <tr key={key}>
                        <td className="border border-gray-300 px-4 py-2 font-medium bg-gray-50">
                          {key.charAt(0).toUpperCase() +
                            key.slice(1).replace(/([A-Z])/g, " $1")}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {displayValue || "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Previous Applications */}
      {previousApplications.length > 1 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Previous Applications</h3>
          <div className="space-y-4">
            {previousApplications
              .filter((app) => app.id !== medicalStatus?.id) // Filter out current application
              .sort(
                (a, b) =>
                  (b.submittedAt?.toDate?.() || 0) -
                  (a.submittedAt?.toDate?.() || 0)
              ) // Sort by date
              .map((application) => (
                <div key={application.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">
                      Submitted: {formatSubmittedAt(application.submittedAt)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                        application.requestStatus || application.status
                      )}`}
                    >
                      {getStatusText(
                        application.requestStatus || application.status
                      )}
                    </span>
                  </div>

                  {(application.doctorComment ||
                    application.adminComment ||
                    application.rejectionReason) && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                      <p className="font-medium">Feedback:</p>
                      <p className="italic">
                        {application.doctorComment ||
                          application.adminComment ||
                          application.rejectionReason}
                      </p>
                    </div>
                  )}

                  {(application.requestStatus === "rejected" ||
                    application.status === "rejected") &&
                    canReapply(application.submittedAt) && (
                      <div className="mt-2">
                        <Link
                          to="/donor/medical-form"
                          className="inline-block bg-blue-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Reapply Now
                        </Link>
                      </div>
                    )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DonorDashboard;
