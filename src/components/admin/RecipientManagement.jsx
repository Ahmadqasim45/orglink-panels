"use client"

import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  orderBy 
} from "firebase/firestore";
import { toast } from "react-toastify";
import { 
  APPROVAL_STATUS, 
  getStatusColor,
  getStatusDisplay,
  getStatusBadgeColor 
} from '../../utils/approvalSystem';

function RecipientManagement() {
  const [recipients, setRecipients] = useState({
    pending: [],
    approved: [],
    rejected: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const getNestedValue = (obj, path, defaultValue = "N/A") => {
    if (!obj) return defaultValue;

    const keys = typeof path === "string" ? path.split(".") : [path];
    let value = obj;

    for (const key of keys) {
      if (value === undefined || value === null) return defaultValue;
      value = value[key];
    }

    if (value === undefined || value === null || value === "") return defaultValue;
    return value;
  };

  const getSafeValue = (obj, fieldPaths, defaultValue = "N/A") => {
    if (!obj) return defaultValue;

    if (Array.isArray(fieldPaths)) {
      for (const path of fieldPaths) {
        const value = getNestedValue(obj, path);
        if (value !== defaultValue) return value;
      }
      return defaultValue;
    }

    return getNestedValue(obj, fieldPaths, defaultValue);
  };

  const getOrganType = (recipient) => {
    const organType = getSafeValue(recipient, "organType", "");
    return organType ? organType.charAt(0).toUpperCase() + organType.slice(1) : "N/A";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    try {
      if (typeof date === "object") {
        if (date.seconds) {
          return new Date(date.seconds * 1000).toLocaleDateString();
        }
        if (date instanceof Date) {
          return date.toLocaleDateString();
        }
      }
      if (typeof date === "string") {
        return new Date(date).toLocaleDateString();
      }
    } catch (error) {
      console.error("Error formatting date:", error, date);
    }

    return "N/A";
  };

  const getAdminStatusText = (adminStatus) => {
    return adminStatus?.toLowerCase() || "pending";
  };

  const getDisplayStatus = (recipient) => {
    if (recipient.status === APPROVAL_STATUS.DOCTOR_APPROVED) {
      return `Approved by ${recipient.hospitalName}`;
    }
    if (recipient.status === APPROVAL_STATUS.DOCTOR_REJECTED) {
      return `Rejected by ${recipient.hospitalName}`;
    }
    return recipient.status.replace(/_/g, ' ').toUpperCase();
  };

  const fetchRecipients = useCallback(async () => {
    try {
      setLoading(true);
      const recipientsQuery = query(
        collection(db, "recipients"),
        orderBy("updatedAt", "desc")
      );

      const snapshot = await getDocs(recipientsQuery);
      const categorizedRecipients = {
        pending: [],
        approved: [],
        rejected: []
      };

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        
        if (data.adminReviewed) {
          if (data.requestStatus === "admin-approved") {
            categorizedRecipients.approved.push(data);
          } else if (data.requestStatus === "rejected") {
            categorizedRecipients.rejected.push(data);
          }
        } else if (data.doctorReviewed) {
          categorizedRecipients.pending.push(data);
        }
      });

      setRecipients(categorizedRecipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      setError("Failed to load recipients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleAdminDecision = async (recipientId, followDoctorDecision = true, comment = "") => {
    try {
      setActionInProgress(true);
      
      const recipientRef = doc(db, "recipients", recipientId);
      const recipientDoc = await getDoc(recipientRef);
      
      if (!recipientDoc.exists()) {
        toast.error("Recipient not found");
        return;
      }
      
      const recipientData = recipientDoc.data();
      const wasDoctorApproved = recipientData.requestStatus === "doctor-approved";
      
      let newStatus;
      if (followDoctorDecision) {
        newStatus = wasDoctorApproved ? "admin-approved" : "rejected";
      } else {
        newStatus = wasDoctorApproved ? "rejected" : "admin-approved";
      }
      
      await updateDoc(recipientRef, {
        requestStatus: newStatus,
        adminReviewed: true,
        adminReviewDate: new Date(),
        adminComment: comment || (followDoctorDecision ? 
          `Admin confirmed doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}` : 
          `Admin overrode doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}`),
        updatedAt: new Date()
      });

      await addDoc(collection(db, "approvalHistory"), {
        recipientId: recipientId,
        previousStatus: recipientData.requestStatus,
        newStatus: newStatus,
        timestamp: new Date(),
        updatedBy: auth.currentUser.uid,
        updatedRole: 'admin',
        hospitalName: recipientData.hospitalAssociation || "Unknown hospital",
        doctorDecision: recipientData.requestStatus,
        adminAction: followDoctorDecision ? 'confirmed' : 'overrode',
        comment: comment || (followDoctorDecision ? 
          `Admin confirmed doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}` : 
          `Admin overrode doctor's ${wasDoctorApproved ? 'approval' : 'rejection'}`),
        isFinalDecision: true
      });

      try {
        if (recipientData.userId) {
          await addDoc(collection(db, "notifications"), {
            userId: recipientData.userId,
            title: "Application Status Update",
            message: `Your organ/tissue request has been ${newStatus === "admin-approved" ? "approved" : "rejected"}`,
            status: "unread",
            createdAt: new Date()
          });
        }
        
        if (recipientData.doctorId) {
          await addDoc(collection(db, "notifications"), {
            userId: recipientData.doctorId,
            title: "Application Status Update",
            message: `The application for ${recipientData.fullName || "a recipient"} has been ${followDoctorDecision ? 'confirmed' : 'overridden'} by admin`,
            status: "unread",
            createdAt: new Date()
          });
        }
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError);
      }

      toast.success(`Request ${newStatus === "admin-approved" ? "approved" : "rejected"} successfully`);
      await fetchRecipients();
      
      if (showDetailModal) {
        closeDetailModal();
      }
    } catch (error) {
      console.error("Error in admin decision:", error);
      toast.error("Failed to process admin decision");
    } finally {
      setActionInProgress(false);
    }
  };

  const getRecipientName = (recipient) => {
    return getSafeValue(recipient, ["fullName", "userData.fullName", "userData.name", "userData.displayName"]);
  };

  const getRecipientEmail = (recipient) => {
    return getSafeValue(recipient, ["email", "userData.email"]);
  };

  const getRecipientPhone = (recipient) => {
    return getSafeValue(recipient, ["phone", "userData.phone", "userData.phoneNumber"]);
  };

  const getRecipientCondition = (recipient) => {
    return getSafeValue(recipient, ["diagnosedCondition"]);
  };

  const viewRecipientDetails = (recipient) => {
    setSelectedRecipient(recipient);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setTimeout(() => setSelectedRecipient(null), 300);
  };

  const clearError = () => {
    setError(null);
  };

  const RecipientDetailsModal = () => {
    if (!selectedRecipient) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recipient Details</h2>
            <button
              onClick={closeDetailModal}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
              type="button"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <section className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "fullName")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "dateOfBirth")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-medium capitalize">{getSafeValue(selectedRecipient, "gender")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID/Insurance Number</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "nationalId")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "email")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "phone")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "address")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zip/Postal Code</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "zipCode")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Weight</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "weight") !== "N/A" ? `${selectedRecipient.weight} kg` : "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Height</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "height") !== "N/A" ? `${selectedRecipient.height} cm` : "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Blood Type</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "bloodType")}</p>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Organ Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Request Type</p>
                <p className="font-medium capitalize">{getSafeValue(selectedRecipient, "requestType")}</p>
              </div>
              {selectedRecipient.requestType === "organ" && (
                <div>
                  <p className="text-sm text-gray-500">Organ Type</p>
                  <p className="font-medium capitalize">{getSafeValue(selectedRecipient, "organType")}</p>
                </div>
              )}
              {selectedRecipient.requestType === "blood" && (
                <div>
                  <p className="text-sm text-gray-500">Blood Product Type</p>
                  <p className="font-medium capitalize">{getSafeValue(selectedRecipient, "bloodProductType")}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Required Quantity</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "requiredQuantity")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Urgency Level</p>
                <p className="font-medium capitalize">{getSafeValue(selectedRecipient, "urgencyLevel")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Request Date</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "requestDate")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estimated Timeframe</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "estimatedTimeframe")}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Request Reason</p>
                <p className="font-medium">{getSafeValue(selectedRecipient, "requestReason")}</p>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Medical Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Diagnosed Condition</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "diagnosedCondition")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Diagnosis Date</p>
                  <p className="font-medium">{formatDate(selectedRecipient.diagnosisDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Treating Physician</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "treatingPhysician")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Physician Contact</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "physicianContact")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Diagnosis Hospital</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "diagnosisHospital")}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Medical History</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "medicalHistory", "None")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Allergies</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "allergies", "None")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Medications</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "currentMedications", "None")}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Transplant Center</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Province/State</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "state")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "city")}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Hospital/Transplant Center</p>
                  <p className="font-medium">{getSafeValue(selectedRecipient, "hospitalAssociation")}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Approval Status</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Approval Progress</span>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedRecipient.requestStatus === "pending" ? "0%" :
                    selectedRecipient.requestStatus === "doctor-approved" ? "50%" :
                    selectedRecipient.requestStatus === "admin-approved" ? "100%" :
                    selectedRecipient.requestStatus === "rejected" ? "0%" : "0%"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-500" style={{ 
                    width: 
                      selectedRecipient.requestStatus === "pending" ? "5%" :
                      selectedRecipient.requestStatus === "doctor-approved" ? "50%" :
                      selectedRecipient.requestStatus === "admin-approved" ? "100%" :
                      "0%" 
                  }}></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 mr-2 flex items-center justify-center ${
                    selectedRecipient.requestStatus === "pending" || 
                    selectedRecipient.requestStatus === "doctor-approved" || 
                    selectedRecipient.requestStatus === "admin-approved" ? "bg-teal-500" : "bg-gray-300"
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Application Submitted</p>
                    <p className="text-sm text-gray-600">
                      {selectedRecipient.requestSubmissionDate ? 
                        `Submitted on: ${formatDate(selectedRecipient.requestSubmissionDate)}` : 
                        "Application has been submitted for review"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 mr-2 flex items-center justify-center ${
                    selectedRecipient.requestStatus === "doctor-approved" || 
                    selectedRecipient.requestStatus === "admin-approved" ? "bg-teal-500" : 
                    selectedRecipient.requestStatus === "rejected" && selectedRecipient.doctorReviewed ? "bg-red-500" : 
                    "bg-gray-300"
                  }`}>
                    {selectedRecipient.requestStatus === "rejected" && selectedRecipient.doctorReviewed ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        {selectedRecipient.requestStatus === "doctor-approved" || selectedRecipient.requestStatus === "admin-approved" ? (
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
                      {selectedRecipient.requestStatus === "doctor-approved" ? "Approved by doctor" : 
                      selectedRecipient.requestStatus === "admin-approved" ? "Approved by doctor" : 
                      selectedRecipient.requestStatus === "rejected" && selectedRecipient.doctorReviewed ? "Rejected by doctor" : 
                      "Awaiting doctor review"}
                    </p>
                    {selectedRecipient.doctorComment && (
                      <p className="mt-1 text-sm italic text-gray-600">
                        "{selectedRecipient.doctorComment}"
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 mr-2 flex items-center justify-center ${
                    selectedRecipient.requestStatus === "admin-approved" ? "bg-teal-500" : 
                    selectedRecipient.requestStatus === "rejected" && selectedRecipient.adminReviewed ? "bg-red-500" : 
                    "bg-gray-300"
                  }`}>
                    {selectedRecipient.requestStatus === "rejected" && selectedRecipient.adminReviewed ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        {selectedRecipient.requestStatus === "admin-approved" ? (
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
                      {selectedRecipient.requestStatus === "admin-approved" ? "Final approval granted" : 
                      selectedRecipient.requestStatus === "doctor-approved" ? "Awaiting admin approval" : 
                      selectedRecipient.requestStatus === "rejected" && selectedRecipient.adminReviewed ? "Rejected by admin" : 
                      "Awaiting final review"}
                    </p>
                    {selectedRecipient.adminComment && (
                      <p className="mt-1 text-sm italic text-gray-600">
                        "{selectedRecipient.adminComment}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {selectedRecipient.additionalNotes && (
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Additional Notes</h3>
              <p>{selectedRecipient.additionalNotes}</p>
            </section>
          )}

          <div className="mt-6 flex justify-end space-x-2">
            {selectedRecipient.doctorReviewed && !selectedRecipient.adminReviewed && (
              <>
                <button
                  onClick={() => {
                    const comment = window.prompt("Add a comment (optional):");
                    handleAdminDecision(selectedRecipient.id, true, comment);
                  }}
                  className={`px-4 py-2 text-white rounded hover:opacity-90 disabled:bg-gray-300 ${
                    selectedRecipient.requestStatus === "doctor-approved" ? "bg-green-500" : "bg-red-500"
                  }`}
                  disabled={actionInProgress}
                  type="button"
                >
                  Confirm {selectedRecipient.requestStatus === "doctor-approved" ? "Approval" : "Rejection"}
                </button>
                
                <button
                  onClick={() => {
                    const reason = window.prompt("Please provide reason for overriding doctor's decision:");
                    if (reason) {
                      handleAdminDecision(selectedRecipient.id, false, reason);
                    }
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300"
                  disabled={actionInProgress}
                  type="button"
                >
                  Override Doctor's Decision
                </button>
              </>
            )}
            
            <button
              onClick={closeDetailModal}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Recipient Management</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={clearError}
            type="button"
            aria-label="Close error message"
          >
            <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}

      <div className="mb-6 border-b">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 ${
                activeTab === "pending"
                  ? "text-teal-600 border-b-2 border-teal-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("pending")}
              disabled={actionInProgress}
              type="button"
            >
              Pending Requests
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 ${
                activeTab === "approved"
                  ? "text-teal-600 border-b-2 border-teal-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("approved")}
              disabled={actionInProgress}
              type="button"
            >
              Approved
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 ${
                activeTab === "rejected"
                  ? "text-teal-600 border-b-2 border-teal-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("rejected")}
              disabled={actionInProgress}
              type="button"
            >
              Rejected
            </button>
          </li>
        </ul>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Recipient Name</th>
                <th className="py-3 px-6 text-left">Blood Group</th>
                <th className="py-3 px-6 text-left">Age</th>
                <th className="py-3 px-6 text-left">Organ Type</th>
                <th className="py-3 px-6 text-left">Status</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {recipients[activeTab].length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-4 px-6 text-center">
                    No recipients found in this category
                  </td>
                </tr>
              ) : (
                recipients[activeTab].map((recipient) => (
                  <tr key={recipient.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left">
                      <div className="font-medium">{getRecipientName(recipient)}</div>
                    </td>
                    <td className="py-3 px-6 text-left">{getSafeValue(recipient, "bloodType")}</td>
                    <td className="py-3 px-6 text-left">{getSafeValue(recipient, "age")}</td>
                    <td className="py-3 px-6 text-left">{getOrganType(recipient)}</td>
                    <td className="py-3 px-6 text-left">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        recipient.requestStatus === "admin-approved" ? "bg-green-100 text-green-800" : 
                        recipient.requestStatus === "doctor-approved" ? "bg-blue-100 text-blue-800" :
                        recipient.requestStatus === "rejected" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {recipient.requestStatus === "admin-approved" 
                          ? "Approved" 
                          : recipient.requestStatus === "doctor-approved"
                          ? "Doctor Approved"
                          : recipient.requestStatus === "rejected"
                          ? "Rejected"
                          : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center space-x-2">
                        <button
                          onClick={() => viewRecipientDetails(recipient)}
                          className="bg-teal-500 text-white px-3 py-1 rounded hover:bg-teal-600 disabled:bg-gray-300"
                          disabled={actionInProgress}
                          type="button"
                        >
                          View Details
                        </button>

                        {recipient.doctorReviewed && !recipient.adminReviewed && (
                          <button
                            onClick={() => {
                              if (window.confirm(
                                `Are you sure you want to confirm the doctor's ${
                                  recipient.requestStatus === "doctor-approved" ? "approval" : "rejection"
                                }?`
                              )) {
                                handleAdminDecision(recipient.id, true);
                              }
                            }}
                            className={`text-white px-3 py-1 rounded hover:opacity-90 disabled:bg-gray-300 ${
                              recipient.requestStatus === "doctor-approved" ? "bg-green-500" : "bg-red-500"
                            }`}
                            disabled={actionInProgress}
                            type="button"
                          >
                            Confirm {recipient.requestStatus === "doctor-approved" ? "Approval" : "Rejection"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showDetailModal && <RecipientDetailsModal />}
    </div>
  );
}

export default RecipientManagement;
