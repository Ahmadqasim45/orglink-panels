import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  orderBy,
  serverTimestamp,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import {
  APPROVAL_STATUS,
  getStatusColor,
  getStatusDisplay,
  isDoctorActionDisabled,
  isAdminActioned
} from '../../utils/approvalSystem';
import * as appointmentIntegration from '../../utils/appointmentIntegration';
import AppointmentModal from './AppointmentModal';

function

  DoctorDashboard() {
  const navigate = useNavigate();
  const [donors, setDonors] = useState({
    pending: [],
    approved: [],
    rejected: [],
  });
  const [recipients, setRecipients] = useState({
    pending: [],
    approved: [],
    rejected: [],
  });
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [selectedRecipient, setSelectedRecipient] = useState(null); const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isRecipientDetailsModalOpen, setIsRecipientDetailsModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [activeRecipientTab, setActiveRecipientTab] = useState("pending");
  const [scheduleData, setScheduleData] = useState({
    date: "",
    time: "",
  });
  const [existingAppointments, setExistingAppointments] = useState([]); const [donorSearch, setDonorSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false); const [loading, setLoading] = useState(false);
  const [donorAppointments, setDonorAppointments] = useState({});
  const [recipientAppointments, setRecipientAppointments] = useState({});
  const [currentPatient, setCurrentPatient] = useState(null);
  const [currentPatientType, setCurrentPatientType] = useState(null);
  const [user, setUser] = useState(null); // Added user state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchDonors();
    fetchRecipients();
    fetchExistingAppointments();

    // Make sure the modal is closed when the component mounts
    setIsAppointmentModalOpen(false);

    // Clear any global state from previous sessions
    window.currentDoctorInfo = null;
    window.selectedPatientInfo = null;
    window.setCurrentPatient = null;
    window.setCurrentPatientType = null;
  }, []);

  const fetchUser = async () => {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setUser(userDoc.data());
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const getSafeValue = (obj, path, defaultValue = "N/A") => {
    if (!obj) return defaultValue;

    if (Array.isArray(path)) {
      let current = obj;
      for (const key of path) {
        if (current[key] === undefined) return defaultValue;
        current = current[key];
      }
      return current;
    }

    return obj[path] ?? defaultValue;
  };

  const getDonorName = (donor) => {
    if (donor?.fullName) return donor.fullName;
    if (donor?.name) return donor.name;
    if (donor?.donorName) return donor.donorName;
    if (donor?.userData?.fullName) return donor.userData.fullName;
    if (donor?.userData?.name) return donor.userData.name;
    if (donor?.userData?.displayName) return donor.userData.displayName;
    if (donor?.formData?.fullName) return donor.formData.fullName;
    if (donor?.formData?.name) return donor.formData.name;
    if (donor?.email) return donor.email;
    if (donor?.userData?.email) return donor.userData.email;
    return "Unknown Donor";
  };

  // Helper function to get progress percentage for donor status
  const getDonorProgressPercentage = (status) => {
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
        return "80%";
      case APPROVAL_STATUS.ADMIN_APPROVED:
      case "admin-approved":
      case APPROVAL_STATUS.FINAL_APPROVED:
      case APPROVAL_STATUS.FINAL_ADMIN_APPROVED:
      case "approved":
      case "final-admin-approved":
        return "100%";
      case APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED:
      case "initial-doctor-rejected":
      case APPROVAL_STATUS.DOCTOR_REJECTED:
      case "doctor-rejected":
      case APPROVAL_STATUS.ADMIN_REJECTED:
      case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
      case APPROVAL_STATUS.FINAL_ADMIN_REJECTED:
      case "rejected":
      case "initial-admin-rejected":
      case "final-admin-rejected":
        return "0%";
      default:
        return "0%";
    }
  };

  // Helper function to get donor status text
  const getDonorStatusText = (status) => {
    switch (status) {
      case APPROVAL_STATUS.PENDING:
      case "pending":
        return "Pending Initial Review";
      case APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED:
      case "initial-doctor-approved":
        return "Doctor Approved";
      case APPROVAL_STATUS.INITIALLY_APPROVED:
      case "initially-approved":
        return "Initial Admin Approved";
      case APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS:
      case "medical-evaluation-in-progress":
        return "Medical Evaluation In Progress";
      case APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED:
      case "medical-evaluation-completed":
        return "Medical Evaluation Completed";
      case APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW:
      case "pending-final-admin-review":
        return "Pending Final Admin Review";
      case APPROVAL_STATUS.FINAL_ADMIN_APPROVED:
      case "final-admin-approved":
        return "🎉 Final Admin Approved!";
      case APPROVAL_STATUS.FINAL_ADMIN_REJECTED:
      case "final-admin-rejected":
        return "❌ Final Admin Rejected";
      case APPROVAL_STATUS.ADMIN_APPROVED:
      case "admin-approved":
      case APPROVAL_STATUS.FINAL_APPROVED:
      case "approved":
        return "🎉 Final Approval Completed - Fully Approved!";
      case APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED:
      case "initial-doctor-rejected":
        return "Doctor Rejected";
      case APPROVAL_STATUS.ADMIN_REJECTED:
      case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
      case APPROVAL_STATUS.FINAL_REJECTED:
      case "rejected":
      case "initial-admin-rejected":
        return "Rejected";
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
    }
  };

  const getRecipientName = (recipient) => {
    return recipient?.fullName || recipient?.name || "N/A";
  };

  const getRecipientPhone = (recipient) => {
    return recipient?.phone || recipient?.contactNumber || "N/A";
  };

  const getRecipientEmail = (recipient) => {
    return recipient?.email || "N/A";
  };

  const getRecipientCondition = (recipient) => {
    return recipient?.diagnosedCondition || "Not specified";
  };

  const filterDonors = (donors) => {
    if (!donorSearch) return donors || [];
    const searchTerm = donorSearch.toLowerCase().trim();

    return (donors || []).filter(donor => {
      const searchFields = [
        donor?.fullName,
        donor?.bloodType,
        donor?.age?.toString(),
        donor?.weight?.toString()
      ];

      return searchFields.some(field =>
        field?.toLowerCase().includes(searchTerm)
      );
    });
  };

  const filterRecipients = (recipients) => {
    if (!recipientSearch) return recipients || [];
    const searchTerm = recipientSearch.toLowerCase().trim();

    return (recipients || []).filter(recipient => {
      if (!recipient) return false; // Filter out null recipients

      const searchFields = [
        recipient?.fullName,
        recipient?.bloodType,
        recipient?.age?.toString(),
        recipient?.organType
      ];

      return searchFields.some(field =>
        field?.toLowerCase().includes(searchTerm)
      );
    });
  };

  useEffect(() => {
    fetchDonors();
    fetchRecipients();
    fetchExistingAppointments();
  }, []);

  const fetchDonors = async () => {
    try {
      console.log("Starting donor fetch...");
      const currentUserId = auth.currentUser.uid;
      console.log("Current user ID:", currentUserId);

      const donorsData = {
        pending: [],
        approved: [],
        rejected: []
      };

      try {
        const q = query(
          collection(db, "medicalRecords"),
          where("hospitalId", "==", currentUserId)
        );

        console.log("Fetching donors with hospitalId...");
        const querySnapshot = await getDocs(q);
        console.log(`Found ${querySnapshot.size} donors with hospitalId`);        querySnapshot.forEach((docSnapshot) => {
          const donor = { id: docSnapshot.id, ...docSnapshot.data() };
          const status = donor.requestStatus || donor.status;

          if (status === "pending" || status === APPROVAL_STATUS.PENDING) {
            donorsData.pending.push(donor);          } else if (
            status === "doctor-approved" ||
            status === APPROVAL_STATUS.DOCTOR_APPROVED ||
            status === "admin-approved" ||
            status === APPROVAL_STATUS.ADMIN_APPROVED ||
            status === "approved" ||
            status === APPROVAL_STATUS.FINAL_APPROVED ||
            status === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ||
            status === "initially-approved" ||
            status === APPROVAL_STATUS.INITIALLY_APPROVED ||
            status === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS ||
            status === "medical-evaluation-in-progress" ||
            status === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED ||
            status === "medical-evaluation-completed"
          ) {
            donorsData.approved.push(donor);
          } else if (
            status === "rejected" ||
            status === APPROVAL_STATUS.DOCTOR_REJECTED ||
            status === APPROVAL_STATUS.ADMIN_REJECTED ||
            status === APPROVAL_STATUS.FINAL_REJECTED ||
            status === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED
          ) {
            donorsData.rejected.push(donor);
          }
        });
      } catch (err) {
        console.warn("Error with first query method:", err);
      }

      const totalDonors = Object.values(donorsData).flat().length;
      if (totalDonors === 0) {
        try {
          console.log("Trying alternate field structure...");
          const alternateQuery = query(
            collection(db, "medicalRecords"),
            where("assignedToHospital", "==", currentUserId)
          );

          const alternateSnapshot = await getDocs(alternateQuery);
          console.log(`Found ${alternateSnapshot.size} donors with assignedToHospital`);          alternateSnapshot.forEach((docSnapshot) => {
            const donor = { id: docSnapshot.id, ...docSnapshot.data() };
            const status = donor.requestStatus || donor.status;

            if (status === "pending" || status === APPROVAL_STATUS.PENDING) {
              donorsData.pending.push(donor);
            } else if (
              status === "doctor-approved" ||
              status === APPROVAL_STATUS.DOCTOR_APPROVED ||
              status === "admin-approved" ||
              status === APPROVAL_STATUS.ADMIN_APPROVED ||
              status === "approved" ||
              status === APPROVAL_STATUS.FINAL_APPROVED ||
              status === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ||
              status === "initially-approved" ||
              status === APPROVAL_STATUS.INITIALLY_APPROVED ||
              status === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS ||
              status === "medical-evaluation-in-progress" ||
              status === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED ||
              status === "medical-evaluation-completed"
            ) {
              donorsData.approved.push(donor);
            } else if (
              status === "rejected" ||
              status === APPROVAL_STATUS.DOCTOR_REJECTED ||
              status === APPROVAL_STATUS.ADMIN_REJECTED ||
              status === APPROVAL_STATUS.FINAL_REJECTED ||
              status === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED
            ) {
              donorsData.rejected.push(donor);
            }
          });
        } catch (err) {
          console.warn("Error with second query method:", err);
        }
      }

      console.log("Final donor counts:", {
        pending: donorsData.pending.length,
        approved: donorsData.approved.length,
        rejected: donorsData.rejected.length
      });
      setDonors(donorsData);
    } catch (error) {
      console.error("Error fetching donors:", error);
      toast.error("Error fetching donors. Please try again.");
    }
  };

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      const currentUserId = auth.currentUser.uid;
      const recipientsData = {
        pending: [],
        approved: [],
        rejected: [],
      };

      console.log("Doctor ID:", currentUserId);

      const doctorRef = doc(db, "users", currentUserId);
      const doctorDoc = await getDoc(doctorRef);
      const hospitalId = doctorDoc.exists() ? doctorDoc.data().hospitalId || currentUserId : currentUserId;

      console.log("Fetching recipients for hospital ID:", hospitalId);

      const recipientsRef = collection(db, "recipients");
      const querySnapshot = await getDocs(recipientsRef);

      console.log("Total recipients found:", querySnapshot.size);

      querySnapshot.forEach((docSnapshot) => {
        const recipient = { id: docSnapshot.id, ...docSnapshot.data() };

        console.log("Checking recipient:", recipient.fullName,
          "hospitalId:", recipient.hospitalId,
          "RecipientId", recipient.userId,
          "hospitalAssociation:", recipient.hospitalAssociation,
          "assignedToHospital:", recipient.assignedToHospital);

        if (
          recipient.hospitalId === hospitalId ||
          recipient.hospitalId === currentUserId ||
          recipient.assignedToHospital === hospitalId ||
          recipient.assignedToHospital === currentUserId
        ) {
          console.log("MATCH FOUND for recipient:", recipient.fullName);

          const status = recipient.requestStatus;

          if (status === "pending" || status === APPROVAL_STATUS.PENDING) {
            recipientsData.pending.push(recipient);
          } else if (
            status === "doctor-approved" ||
            status === APPROVAL_STATUS.DOCTOR_APPROVED ||
            status === "admin-approved" ||
            status === APPROVAL_STATUS.ADMIN_APPROVED
          ) {
            recipientsData.approved.push(recipient);
          } else if (
            status === "rejected" ||
            status === APPROVAL_STATUS.DOCTOR_REJECTED ||
            status === APPROVAL_STATUS.ADMIN_REJECTED
          ) {
            recipientsData.rejected.push(recipient);
          }
        }
      });

      console.log("Filtered recipient data:", recipientsData);
      setRecipients(recipientsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      toast.error("Error loading recipient data");    setLoading(false);
    }
  };
  
  const fetchExistingAppointments = async () => {
    try {
      const currentUserId = auth.currentUser.uid;
      const appointments = [];

      // Fetch donor appointments
      const donorApptsQuery = query(
        collection(db, "donorAppointments"),
        where("doctorId", "==", currentUserId)
      );
      const donorApptsSnap = await getDocs(donorApptsQuery);
      donorApptsSnap.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to string format for date
        const formattedDate = data.date && data.date.seconds
          ? new Date(data.date.seconds * 1000).toISOString().split('T')[0]
          : typeof data.date === 'string' ? data.date : '';

        appointments.push({
          id: doc.id,
          ...data,
          // Replace date object with formatted string to prevent React child rendering issues
          date: formattedDate,
          // Ensure donor name is present
          donorName: data.donorName || "Unknown Donor"
        });
      });

      // Fetch recipient appointments
      const recipientApptsQuery = query(
        collection(db, "recipientAppointments"),
        where("doctorId", "==", currentUserId)
      );
      const recipientApptsSnap = await getDocs(recipientApptsQuery);
      recipientApptsSnap.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to string format for date
        const formattedDate = data.date && data.date.seconds
          ? new Date(data.date.seconds * 1000).toISOString().split('T')[0]
          : typeof data.date === 'string' ? data.date : '';

        appointments.push({
          id: doc.id,
          ...data,
          // Replace date object with formatted string to prevent React child rendering issues
          date: formattedDate,
          // Ensure recipient name is present
          recipientName: data.recipientName || "Unknown Recipient"
        });
      });

      // Also check the legacy appointments collection
      const legacyApptsQuery = query(
        collection(db, "appointments"),
        where("doctorId", "==", currentUserId)
      );
      const legacyApptsSnap = await getDocs(legacyApptsQuery);
      legacyApptsSnap.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to string format for date
        const formattedDate = data.date && data.date.seconds
          ? new Date(data.date.seconds * 1000).toISOString().split('T')[0]
          : typeof data.date === 'string' ? data.date : '';

        appointments.push({
          id: doc.id,
          ...data,
          // Replace date object with formatted string to prevent React child rendering issues
          date: formattedDate
        });
      });

      setExistingAppointments(appointments);
      console.log("Appointments loaded:", appointments.length);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments. Please try again.");
    }
  };

  // Check if appointments exist for a specific patient
  const hasAppointments = (patientId, type) => {
    if (type === "donor") {
      return donorAppointments[patientId] && donorAppointments[patientId].length > 0;
    } else {
      return recipientAppointments[patientId] && recipientAppointments[patientId].length > 0;
    }
  };

  // Organize appointments by patient ID
  useEffect(() => {
    if (existingAppointments.length > 0) {
      const donorAppts = {};
      const recipientAppts = {};

      existingAppointments.forEach(appointment => {
        if (appointment.donorId) {
          if (!donorAppts[appointment.donorId]) {
            donorAppts[appointment.donorId] = [];
          }
          donorAppts[appointment.donorId].push(appointment);
        }

        if (appointment.recipientId) {
          if (!recipientAppts[appointment.recipientId]) {
            recipientAppts[appointment.recipientId] = [];
          }
          recipientAppts[appointment.recipientId].push(appointment);
        }
      });

      setDonorAppointments(donorAppts);
      setRecipientAppointments(recipientAppts);
    }
  }, [existingAppointments]);

  const handleViewDetails = (donor) => {
    setSelectedDonor(donor);
    setIsDetailsModalOpen(true);
  };
  const handleViewRecipientDetails = (recipient) => {
    // Reset any previously selected recipient to ensure we only show the current one
    setSelectedRecipient(null);

    // Set timeout to ensure UI updates properly
    setTimeout(() => {
      setSelectedRecipient(recipient);
      setIsRecipientDetailsModalOpen(true);
    }, 10);
  }; const isTimeSlotAvailable = (date, time) => {
    return !existingAppointments.some(appointment => {
      // For formatted dates (already processed in fetchExistingAppointments)
      const aptDate = appointment.date || ''; // This should already be a formatted string now
      return aptDate === date && appointment.time === time;
    });
  };

  const handleScheduleSubmit = async (recipientId) => {
    if (!scheduleData.date || !scheduleData.time) {
      toast.error("Please select both date and time");
      return;
    }

    if (!isTimeSlotAvailable(scheduleData.date, scheduleData.time)) {
      toast.error("This time slot is already booked. Please select another time.");
      return;
    }

    try {
      setActionInProgress(true);
      const recipientRef = doc(db, "recipients", recipientId);
      const recipientDoc = await getDoc(recipientRef);

      if (!recipientDoc.exists()) {
        toast.error("Recipient record not found");
        return;
      }

      const recipientData = recipientDoc.data();

      if (recipientData.requestStatus !== "admin-approved") {
        toast.error("Cannot schedule appointment. Admin approval is pending.");
        return;
      }

      await addDoc(collection(db, "appointments"), {
        recipientId,
        doctorId: auth.currentUser.uid,
        hospitalId: auth.currentUser.uid,
        date: scheduleData.date,
        time: scheduleData.time,
        createdAt: new Date(),
        appointmentType: "transplant-evaluation",
        appointmentStatus: "scheduled"
      });

      await updateDoc(recipientRef, {
        appointmentScheduled: true,
        appointmentDate: scheduleData.date,
        appointmentTime: scheduleData.time,
        updatedAt: new Date()
      });

      await fetchRecipients();
      setIsSchedulingModalOpen(false);
      setScheduleData({ date: "", time: "" });
      toast.success("Appointment scheduled successfully!");
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      toast.error("Error scheduling appointment. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (recipientId) => {
    try {
      setActionInProgress(true);

      const reason = prompt("Please provide a reason for rejection:");
      if (!reason) {
        setActionInProgress(false);
        return;
      }

      const recipientRef = doc(db, "recipients", recipientId);

      await updateDoc(recipientRef, {
        requestStatus: APPROVAL_STATUS.DOCTOR_REJECTED,
        doctorReviewed: true,
        doctorComment: reason,
        doctorId: auth.currentUser.uid,
        doctorReviewDate: new Date()
      });

      toast.success("Application rejected");
      await fetchRecipients();
    } catch (error) {
      console.error("Error in rejection process:", error);
      toast.error("Failed to reject application");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleApprove = async (recipientId) => {
    try {
      setActionInProgress(true);

      const recipientRef = doc(db, "recipients", recipientId);

      await updateDoc(recipientRef, {
        requestStatus: APPROVAL_STATUS.DOCTOR_APPROVED,
        doctorReviewed: true,
        doctorComment: "",
        doctorId: auth.currentUser.uid,
        doctorReviewDate: new Date()
      });

      toast.success("Application approved and sent to admin for final review");
      await fetchRecipients();
    } catch (error) {
      console.error("Error in approval process:", error);
      toast.error("Failed to approve application");
    } finally {
      setActionInProgress(false);
    }
  };  const handleApproveDonor = async (donorId) => {
    try {
      setActionInProgress(true);

      const donorRef = doc(db, "medicalRecords", donorId);

      await updateDoc(donorRef, {
        requestStatus: APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED,
        status: APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED,
        doctorReviewed: true,
        doctorComment: "",
        doctorId: auth.currentUser.uid,
        doctorReviewDate: serverTimestamp()
      });

      // Import and trigger automatic status transition
      const { triggerAutomaticStatusTransition } = await import('../../utils/approvalSystem');
      const finalStatus = await triggerAutomaticStatusTransition(donorId, APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED);
      
      if (finalStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL) {
        toast.success("Donor application initially approved and forwarded for admin review.");
      } else {
        toast.success("Donor application initially approved. Medical evaluation required next.");
      }
      
      await fetchDonors();
    } catch (error) {
      console.error("Error in donor initial approval process:", error);
      toast.error("Failed to approve donor application");
    } finally {
      setActionInProgress(false);
    }
  };const handleRejectDonor = async (donorId) => {
    try {
      setActionInProgress(true);

      const reason = prompt("Please provide a reason for rejection:");
      if (!reason) {
        setActionInProgress(false);
        return;
      }

      const donorRef = doc(db, "medicalRecords", donorId);

      await updateDoc(donorRef, {
        requestStatus: APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED,
        status: APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED,
        doctorReviewed: true,
        doctorComment: reason,
        rejectionReason: reason,
        doctorId: auth.currentUser.uid,
        doctorReviewDate: serverTimestamp()
      });

      toast.success("Donor application rejected - not eligible for donation");
      await fetchDonors();
    } catch (error) {
      console.error("Error in donor rejection process:", error);
      toast.error("Failed to reject donor application");
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Handle final approval after medical evaluation
  const handleFinalApproveDonor = async (donorId) => {
    try {
      setActionInProgress(true);

      const donorRef = doc(db, "medicalRecords", donorId);
      const donorSnap = await getDoc(donorRef);
      
      if (!donorSnap.exists()) {
        toast.error("Donor record not found");
        setActionInProgress(false);
        return;
      }
      
      const comment = prompt("Enter assessment notes after medical evaluation:");
      
      await updateDoc(donorRef, {
        requestStatus: APPROVAL_STATUS.DOCTOR_APPROVED, // Keep using DOCTOR_APPROVED for backward compatibility
        status: APPROVAL_STATUS.DOCTOR_APPROVED,
        finalDoctorApproved: true,
        finalDoctorComment: comment || "Approved after medical evaluation",
        finalEvaluationDate: serverTimestamp(),
        doctorId: auth.currentUser.uid
      });

      toast.success("Final approval completed after medical evaluation");
      await fetchDonors();
    } catch (error) {
      console.error("Error in final donor approval process:", error);
      toast.error("Failed to complete final approval");
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Handle final rejection after medical evaluation
  const handleFinalRejectDonor = async (donorId) => {
    try {
      setActionInProgress(true);

      const reason = prompt("Please provide a reason for rejection after medical evaluation:");
      if (!reason) {
        setActionInProgress(false);
        return;
      }

      const donorRef = doc(db, "medicalRecords", donorId);

      await updateDoc(donorRef, {
        requestStatus: APPROVAL_STATUS.DOCTOR_REJECTED, // Keep using DOCTOR_REJECTED for backward compatibility
        status: APPROVAL_STATUS.DOCTOR_REJECTED,
        finalDoctorRejected: true,
        finalDoctorComment: reason,
        finalRejectionReason: reason,
        finalEvaluationDate: serverTimestamp(),
        doctorId: auth.currentUser.uid
      });

      toast.success("Donor application rejected after medical evaluation");
      await fetchDonors();
    } catch (error) {
      console.error("Error in final donor rejection process:", error);
      toast.error("Failed to reject donor after medical evaluation");
    } finally {
      setActionInProgress(false);
    }
  };  // Authentication helper functions for donor appointment scheduling
  const isDonorEligibleForAppointment = (donor) => {
    if (!donor) return false;
    
    const status = donor.requestStatus || donor.status;
    
    // Define eligible statuses - donors who have received initial admin approval or beyond
    // Authentication only blocks those who haven't received initial admin approval yet
    const eligibleStatuses = [
      APPROVAL_STATUS.INITIALLY_APPROVED,
      APPROVAL_STATUS.ADMIN_APPROVED,
      APPROVAL_STATUS.FINAL_APPROVED,
      APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS,
      APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED,
      'initially-approved',
      'admin-approved', 
      'approved',
      'medical-evaluation-in-progress',
      'medical-evaluation-completed'
    ];
    
    return eligibleStatuses.includes(status);
  };

  const getDonorIneligibilityReason = (donor) => {
    if (!donor) return "Donor information not found";
    
    const status = donor.requestStatus || donor.status;
    
    switch (status) {
      case APPROVAL_STATUS.PENDING:
      case 'pending':
        return "Donor application is still under initial review";
      
      case APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED:
      case 'initial-doctor-approved':
        return "Donor needs initial admin approval before appointments can be scheduled";
      
      case APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL:
      case 'pending-initial-admin-approval':
        return "Donor is waiting for initial admin approval";
      
      case APPROVAL_STATUS.INITIAL_ADMIN_REJECTED:
      case 'initial-admin-rejected':
        return "Donor was rejected by admin during initial review";
      
      case APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED:
      case 'initial-doctor-rejected':
        return "Donor was rejected during initial medical review";
      
      case APPROVAL_STATUS.DOCTOR_REJECTED:
      case 'doctor-rejected':
        return "Donor was rejected after medical evaluation";
      
      case APPROVAL_STATUS.ADMIN_REJECTED:
      case 'admin-rejected':
        return "Donor application was rejected by administration";
      
      case APPROVAL_STATUS.FINAL_REJECTED:
      case 'final-rejected':
        return "Donor application was finally rejected";
      
      default:
        return "Donor is not eligible for appointment scheduling at this time";
    }
  };

const handleAppointmentsAction = (patient, type) => {
    // Special authentication check for donors
    if (type === "donor") {
      if (!isDonorEligibleForAppointment(patient)) {
        const reason = getDonorIneligibilityReason(patient);
        toast.error(`Cannot schedule appointment: ${reason}`);
        return;
      }
    }
    
    // If patient already has appointments, navigate to the appointments page
    if (hasAppointments(patient.id, type)) {
      navigate(`/doctor/appointments?type=${type}&id=${patient.id}`);
      return;
    }
    // Check if modal is currently open
    if (isAppointmentModalOpen) {
      setIsAppointmentModalOpen(false);

      // Wait for the modal to close completely before opening it again
      setTimeout(() => {
        setupAndOpenModal(patient, type);
      }, 200);
    } else {
      // Modal is already closed, proceed directly
      setupAndOpenModal(patient, type);
    }
  };

  // Helper function to set up and open the modal
  const setupAndOpenModal = (patient, type) => {
    console.log("Setting up appointment modal for patient:", patient.id, "type:", type);

    // Reset global variables for safety
    window.currentDoctorInfo = null;
    window.selectedPatientInfo = null;

    // Set today's date by default for better UX
    const today = new Date().toISOString().split('T')[0];
    setScheduleData({
      date: today,
      time: ""
    });

    // Register our global functions for the modal
    window.setCurrentPatient = setCurrentPatient;
    window.setCurrentPatientType = setCurrentPatientType;

    // Set patient info
    setCurrentPatient(patient);
    setCurrentPatientType(type);

    // Open the modal with a small delay to ensure React has processed the state changes
    setTimeout(() => {
      console.log("Opening appointment modal");
      setIsAppointmentModalOpen(true);
    }, 100);
  };
  const handleCreateAppointment = async (appointmentData) => {
    console.log("handleCreateAppointment called with data:", appointmentData);

    try {
      if (!currentPatient) {
        console.error("No patient selected");
        toast.error("Please select a patient");
        return;
      }

      if (!scheduleData.date || !scheduleData.time) {
        console.error("Missing date or time");
        toast.error("Please select both date and time");
        return;
      }

      // Ensure purpose has a value - get it from the passed data or use default
      const appointmentPurpose = appointmentData.purpose || "Medical Consultation";
      console.log("Using purpose:", appointmentPurpose);

      // Make sure we properly track if this is recipient or donor
      const patientType = appointmentData.type || currentPatientType;
      console.log("Patient type for appointment:", patientType);

      // Import the unified appointment system if needed
      let appointmentIntegration;
      try {
        appointmentIntegration = require('../../utils/appointmentIntegration');
      } catch (importError) {
        console.log("Using legacy appointment creation - integration module not available");
      }

      if (!isTimeSlotAvailable(scheduleData.date, scheduleData.time)) {
        toast.error("This time slot is already booked. Please select another time.");
        return;
      }

      setActionInProgress(true);
      const patientId = currentPatient.id;

      // Get doctor and hospital information - UPDATED APPROACH
      let doctorName = "Your doctor";
      let hospitalName = "Hospital";

      // First, try to get hospital directly from hospitals collection where userId matches current user
      const hospitalsRef = collection(db, "hospitals");
      const hospitalQuery = query(hospitalsRef, where("userId", "==", auth.currentUser.uid));
      const hospitalSnapshot = await getDocs(hospitalQuery);

      // If we found a hospital with matching userId, use its doctorName directly
      if (!hospitalSnapshot.empty) {
        const hospitalData = hospitalSnapshot.docs[0].data();
        console.log("Hospital data found:", hospitalData);

        // Use doctorName directly from hospital data - this matches Registration.jsx
        if (hospitalData.doctorName) {
          doctorName = hospitalData.doctorName;
        }

        // Get hospital name from hospital data
        if (hospitalData.hospitalName) {
          hospitalName = hospitalData.hospitalName;
        }
      } else {
        // Fallback: Get current doctor's information from user document
        const doctorRef = doc(db, "users", auth.currentUser.uid);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          doctorName = doctorData.firstName && doctorData.lastName
            ? `Dr. ${doctorData.firstName} ${doctorData.lastName}`.trim()
            : doctorData.doctorName
              ? doctorData.doctorName
              : doctorData.displayName
                ? `Dr. ${doctorData.displayName}`.trim()
                : "Doctor";

          // Look for hospital by hospitalId if it exists in doctor data
          if (doctorData.hospitalId) {
            const hospitalRef = doc(db, "hospitals", doctorData.hospitalId);
            const hospitalSnap = await getDoc(hospitalRef);
            if (hospitalSnap.exists()) {
              const hospitalData = hospitalSnap.data();
              hospitalName = hospitalData.hospitalName || hospitalData.name || "Hospital";
            }
          }
        }
      }

      console.log("Appointment data:", { doctorName, hospitalName, purpose: appointmentPurpose });
      // Common appointment data
      const commonAppointmentData = {
        doctorId: auth.currentUser.uid,
        doctorName: doctorName,
        hospitalName: hospitalName,
        date: Timestamp.fromDate(new Date(scheduleData.date)),
        time: scheduleData.time,
        status: "scheduled",
        notes: "",
        purpose: appointmentPurpose,
        doctorScheduled: true,       // Mark as doctor-scheduled
        scheduledByDoctor: true,     // Additional flag for compatibility
        createdAt: Timestamp.now()
      };

      let appointmentId;
      let patientName = "";
      // Create appointment in the appropriate collection
      if (currentPatientType === "donor") {
        // Get the donor name for notification
        const donorRef = doc(db, "medicalRecords", patientId);
        const donorSnap = await getDoc(donorRef);

        if (donorSnap.exists()) {
          const donorData = donorSnap.data();
          patientName = getDonorName(donorData);

          // Try to use unified appointment integration if available
          if (appointmentIntegration && appointmentIntegration.createAppointment) {
            const createResult = await appointmentIntegration.createAppointment({
              ...commonAppointmentData,
              donorId: patientId,
              donorName: patientName,
              patientId: patientId,
              userId: patientId,
              bloodType: donorData.bloodType || "",
              organType: donorData.organType || donorData.donorType || "",
              contactNumber: donorData.phone || donorData.contactNumber || "",
              patientName
            }, "donor");

            if (createResult.success) {
              appointmentId = createResult.appointmentId;
            } else {
              throw new Error(createResult.error || "Failed to create appointment");
            }
          } else {            // Legacy approach
            const appointmentRef = await addDoc(collection(db, "donorAppointments"), {
              ...commonAppointmentData,
              donorId: patientId,
              donorName: patientName,
              bloodType: donorData.bloodType || "",
              organType: donorData.organType || donorData.donorType || "",
              contactNumber: donorData.phone || donorData.contactNumber || "",
              type: "donor" // Add type field for easier filtering
            });

            appointmentId = appointmentRef.id;

            const appointmentIds = donorData.appointmentIds || [];

            await updateDoc(donorRef, {
              appointmentIds: [...appointmentIds, appointmentId],
              appointmentScheduled: true,
              appointmentDate: scheduleData.date,
              appointmentTime: scheduleData.time, updatedAt: Timestamp.now()
            });

            // Send notification to donor
            try {
              await addDoc(collection(db, "notifications"), {
                userId: patientId,
                title: "New Appointment Scheduled",
                message: `${doctorName} has scheduled an appointment for you on ${scheduleData.date} at ${scheduleData.time}`,
                read: false,
                createdAt: Timestamp.now()
              });
            } catch (notificationError) {
              console.error("Error creating notification:", notificationError);
            }
          }
        }
      } else {
        // Get the recipient name for notification
        const recipientRef = doc(db, "recipients", patientId);
        const recipientSnap = await getDoc(recipientRef);

        if (recipientSnap.exists()) {
          const recipientData = recipientSnap.data();
          patientName = getRecipientName(recipientData);
          // Create recipient appointment with enhanced data and ID fields
          const appointmentData = {
            ...commonAppointmentData,
            recipientId: recipientData.userId,
            patientId: recipientData.userId,  // Add patientId for consistency
            userId: recipientData.userId,     // Add userId for broader matching
            recipientName: patientName,
            patientName: patientName, // Add patientName for consistency
            bloodType: recipientData.bloodType || "",
            organType: recipientData.organType || recipientData.neededOrgan || "",
            contactNumber: recipientData.phone || recipientData.contactNumber || "",
            urgencyLevel: recipientData.urgencyLevel || "",
            type: "recipient",      // Add type field for easier filtering
            patientType: "recipient", // Add patientType for consistency
            appointmentType: "recipient",
            appointmentFor: "recipient"
          };

          console.log("Creating recipient appointment with data:", appointmentData);

          // Try to use unified appointment integration if available
          if (appointmentIntegration && appointmentIntegration.createAppointment) {
            const createResult = await appointmentIntegration.createAppointment(appointmentData, "recipient");

            if (createResult.success) {
              appointmentId = createResult.appointmentId;
            } else {
              throw new Error(createResult.error || "Failed to create appointment");
            }
          } else {
            // Legacy approach
            const appointmentRef = await addDoc(collection(db, "recipientAppointments"), appointmentData);

            appointmentId = appointmentRef.id;

            const appointmentIds = recipientData.appointmentIds || []; await updateDoc(recipientRef, {
              appointmentIds: [...appointmentIds, appointmentId],
              appointmentScheduled: true,
              appointmentDate: scheduleData.date,
              appointmentTime: scheduleData.time,
              updatedAt: Timestamp.now()
            });

            // Send notification to recipient
            try {
              await addDoc(collection(db, "notifications"), {
                userId: patientId,
                title: "New Appointment Scheduled",
                message: `${doctorName} has scheduled an appointment for you on ${scheduleData.date} at ${scheduleData.time}`,
                read: false,
                createdAt: Timestamp.now()
              });
            } catch (notificationError) {
              console.error("Error creating notification:", notificationError);
            }
          }
        }

        // Refresh data
        await fetchExistingAppointments();
        if (currentPatientType === "donor") {
          await fetchDonors();
          // Update local state to show "View Appointments" immediately for this patient
          if (!donorAppointments[patientId] || donorAppointments[patientId].length === 0) {
            const updatedDonorAppts = { ...donorAppointments };
            if (!updatedDonorAppts[patientId]) {
              updatedDonorAppts[patientId] = [];
            }
            updatedDonorAppts[patientId].push({
              id: appointmentId,
              donorId: patientId,
              donorName: patientName,
              date: scheduleData.date, // Store as string, not as timestamp or Date object
              time: scheduleData.time,
              status: "scheduled"
            });
            setDonorAppointments(updatedDonorAppts);
          }
        } else {
          await fetchRecipients();
          // Update local state to show "View Appointments" immediately for this patient
          if (!recipientAppointments[patientId] || recipientAppointments[patientId].length === 0) {
            const updatedRecipientAppts = { ...recipientAppointments };
            if (!updatedRecipientAppts[patientId]) {
              updatedRecipientAppts[patientId] = [];
            }
            updatedRecipientAppts[patientId].push({
              id: appointmentId,
              recipientId: patientId,
              patientId: patientId,      // Add additional ID field for better matching
              userId: patientId,         // Add user ID field for consistency
              recipientName: patientName,
              patientName: patientName,  // Add patient name for consistency
              date: scheduleData.date,   // Store as string, not as timestamp or Date object
              time: scheduleData.time,
              status: "scheduled",
              type: "recipient",         // Add appointment type
              patientType: "recipient",  // Add patient type for better filtering
              appointmentType: "recipient", // Ensure compatibility with filters
              doctorName: doctorName,     // Add doctor name for UI display
              hospitalName: hospitalName  // Add hospital name for UI display
            });
            setRecipientAppointments(updatedRecipientAppts);
          }
        }

        // Reset global state references
        window.setCurrentPatient = null;
        window.setCurrentPatientType = null;
        window.selectedPatientInfo = null;
        window.currentDoctorInfo = null;
        // Show double toast notification
        toast.success("Appointment successfully scheduled");

        // Add a slight delay for the second toast to appear after the first
        setTimeout(() => {
          toast.success(`Appointment successfully sent to ${patientName}`);
        }, 500);
        // Navigate to appointments view for this patient after scheduling
        navigate(`/doctor/appointments?type=${currentPatientType}&id=${patientId}`);
      }
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      toast.error("Error scheduling appointment. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const DonorDetailsModal = () => {
    if (!selectedDonor) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">
            Donor Details: {getDonorName(selectedDonor)}
          </h2>

          {/* Basic Information Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-medium">Blood Type:</span>{" "}
                {selectedDonor.bloodType}
              </p>
              <p>
                <span className="font-medium">Organ Type:</span>{" "}
                <span className="capitalize">{selectedDonor.donorType || selectedDonor.organType || "Not specified"}</span>
              </p>
              <p>
                <span className="font-medium">Age:</span> {selectedDonor.age}
              </p>
              <p>
                <span className="font-medium">Weight:</span>{" "}
                {selectedDonor.weight} kg
              </p>
              <p>
                <span className="font-medium">Height:</span>{" "}
                {selectedDonor.height} cm
              </p>
              <p>
                <span className="font-medium">BMI:</span> {selectedDonor.bmi}
              </p>
            </div>
          </section>

          {/* Medical History Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Medical History</h3>
            <p>
              <span className="font-medium">Medical History:</span>{" "}
              {selectedDonor.medicalHistory || "None recorded"}
            </p>
            <p>
              <span className="font-medium">Current Medications:</span>{" "}
              {selectedDonor.currentMedications || "None"}
            </p>
            <p>
              <span className="font-medium">Surgical History:</span>{" "}
              {selectedDonor.surgicalHistory || "None"}
            </p>
            <p>
              <span className="font-medium">Allergies:</span>{" "}
              {selectedDonor.allergies || "None reported"}
            </p>
            <p>
              <span className="font-medium">Chronic Conditions:</span>{" "}
              {selectedDonor.chronicConditions || "None reported"}
            </p>
          </section>

          {/* Health Measurements Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Health Measurements</h3>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-medium">Blood Pressure:</span>{" "}
                {selectedDonor.bloodPressure || "Not recorded"}
              </p>
              <p>
                <span className="font-medium">Pulse Rate:</span>{" "}
                {selectedDonor.pulseRate ? `${selectedDonor.pulseRate} bpm` : "Not recorded"}
              </p>
              <p>
                <span className="font-medium">Hemoglobin Level:</span>{" "}
                {selectedDonor.hemoglobinLevel ? `${selectedDonor.hemoglobinLevel} g/dL` : "Not recorded"}
              </p>
              <p>
                <span className="font-medium">Last Donation:</span>{" "}
                {selectedDonor.lastDonationDate || "First time donor"}
              </p>
            </div>
          </section>

          {/* Lifestyle Information Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">
              Lifestyle Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-medium">Smoking Status:</span>{" "}
                {selectedDonor.smokingStatus === "never" ? "Never Smoked" :
                  selectedDonor.smokingStatus === "former" ? "Former Smoker" :
                    selectedDonor.smokingStatus === "current" ? "Current Smoker" :
                      selectedDonor.smokingStatus || "Not specified"}
              </p>
              <p>
                <span className="font-medium">Alcohol Consumption:</span>{" "}
                {selectedDonor.alcoholConsumption === "never" ? "Never" :
                  selectedDonor.alcoholConsumption === "occasional" ? "Occasional" :
                    selectedDonor.alcoholConsumption === "regular" ? "Regular" :
                      selectedDonor.alcoholConsumption === "frequent" ? "Frequent" :
                        selectedDonor.alcoholConsumption || "Not specified"}
              </p>
              <p>
                <span className="font-medium">Exercise Frequency:</span>{" "}
                {selectedDonor.exerciseFrequency === "never" ? "Never" :
                  selectedDonor.exerciseFrequency === "occasional" ? "1-2 times/week" :
                    selectedDonor.exerciseFrequency === "regular" ? "3-4 times/week" :
                      selectedDonor.exerciseFrequency === "frequent" ? "5+ times/week" :
                        selectedDonor.exerciseFrequency || "Not specified"}
              </p>
            </div>
          </section>

          {/* Medical Conditions Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Medical Conditions</h3>
            <div className="grid grid-cols-2 gap-2">
              <p>
                Heart Disease: {selectedDonor.hasHeartDisease ? "Yes" : "No"}
              </p>
              <p>Diabetes: {selectedDonor.hasDiabetes ? "Yes" : "No"}</p>
              <p>HIV: {selectedDonor.hasHIV ? "Yes" : "No"}</p>
              <p>Hepatitis: {selectedDonor.hasHepatitis ? "Yes" : "No"}</p>
              <p>Cancer: {selectedDonor.hasCancer ? "Yes" : "No"}</p>
            </div>
          </section>

          {/* Residential Information Section - New section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Residential Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-medium">Province:</span>{" "}
                {selectedDonor.province || "Not specified"}
              </p>
              <p>
                <span className="font-medium">City:</span>{" "}
                {selectedDonor.city || "Not specified"}
              </p>
              <p>
                <span className="font-medium">Hospital:</span>{" "}
                {selectedDonor.hospital || "Not assigned"}
              </p>
            </div>
          </section>

          {/* Emergency Contact Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {selectedDonor.emergencyContact?.name || "Not provided"}
              </p>
              <p>
                <span className="font-medium">Relationship:</span>{" "}
                {selectedDonor.emergencyContact?.relationship || "Not provided"}
              </p>              <p>
                <span className="font-medium">Phone:</span>{" "}
                {selectedDonor.emergencyContact?.phone || "Not provided"}
              </p>
            </div>
          </section>

          {/* Additional Notes Section */}
          {selectedDonor.additionalNotes && (
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Additional Notes</h3>
              <p>{selectedDonor.additionalNotes}</p>
            </section>
          )}

          {/* Approval Status Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Approval Status</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {/* Modern stepped progress bar */}
              <div className="mb-6">
                <div className="relative">
                  {/* Main progress track */}
                  <div className="w-full bg-gray-200 h-2 rounded-full absolute top-4"></div>
                  
                  {/* Active progress */}
                  <div 
                    className="bg-blue-600 h-2 rounded-full absolute top-4 transition-all duration-700 ease-in-out"
                    style={{
                      width:
                        selectedDonor.requestStatus === "pending" ? "0%" :
                        selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "25%" :
                        (selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                         selectedDonor.status === "initially-approved") ? "40%" :
                        (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                         selectedDonor.status === "medical-evaluation-in-progress") ? "65%" :
                        (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                         selectedDonor.status === "medical-evaluation-completed") ? "75%" :
                        (selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || 
                         selectedDonor.status === "pending-final-admin-review") ? "85%" :
                        selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "80%" :
                        (selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                        selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                        selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED ||
                        selectedDonor.status === "final-admin-approved" ||
                        selectedDonor.requestStatus === "approved" ||
                        selectedDonor.status === "approved") ? "100%" :
                        "0%"
                    }}
                  ></div>
                    {/* Stage markers */}
                  <div className="flex justify-between relative">
                    
                    {/* Stage 1: Initial Review */}
                    <div className="text-center">
                      <div className={`
                        w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                        ${selectedDonor.requestStatus === "pending" ? 
                          "bg-blue-500 ring-4 ring-blue-100" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED || 
                          selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ||
                          selectedDonor.status === "initially-approved" ||
                          selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                          selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                          selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                          selectedDonor.requestStatus === "approved" ||
                          selectedDonor.status === "approved") ? 
                          "bg-green-500" : 
                          selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ? 
                          "bg-red-500" : 
                          "bg-gray-400"}
                      `}>
                        {(selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED || 
                         selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ||
                         selectedDonor.status === "initially-approved" ||
                         selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                         selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                         selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                         selectedDonor.requestStatus === "approved" ||
                         selectedDonor.status === "approved") ? 
                          "✓" : selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ?
                          "✗" : "1"}
                      </div>
                      <div className="mt-2 text-xs font-medium">Initial Review</div>
                      <div className="text-xs text-gray-500">Medical information</div>
                    </div>
                    
                    {/* Stage 1.5: Initial Admin Approval (New Stage) */}
                    <div className="text-center">
                      <div className={`
                        w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                        ${(selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                         selectedDonor.status === "initially-approved") ? 
                          "bg-blue-500 ring-4 ring-blue-100" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                          selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                          selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                          "bg-green-500" : 
                          "bg-gray-400"}
                      `}>
                        {(selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                         selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                         selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                          "✓" : (selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                         selectedDonor.status === "initially-approved") ? 
                          "◐" : "1.5"}
                      </div>
                      <div className="mt-2 text-xs font-medium">Initial Admin Approval</div>
                      <div className="text-xs text-gray-500">Ready for appointments</div>
                    </div>
                      {/* Stage 2: Medical Evaluation */}
                    <div className="text-center">
                      <div className={`
                        w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                        ${(selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                          selectedDonor.status === "medical-evaluation-in-progress") ? 
                          "bg-purple-500 ring-4 ring-purple-100" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                          selectedDonor.status === "medical-evaluation-completed") ? 
                          "bg-blue-500 ring-4 ring-blue-100" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                          selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                          selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                          "bg-green-500" : 
                          selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ? 
                          "bg-red-500" : 
                          "bg-gray-400"}
                      `}>
                        {(selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                         selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                         selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                          "✓" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                          selectedDonor.status === "medical-evaluation-in-progress") ? 
                          "⚕" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                          selectedDonor.status === "medical-evaluation-completed") ? 
                          "✓" : 
                          selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ? 
                          "✗" : "2"}
                      </div>
                      <div className="mt-2 text-xs font-medium">Medical Evaluation</div>
                      <div className="text-xs text-gray-500">
                        {(selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                          selectedDonor.status === "medical-evaluation-in-progress") ? 
                          "In Progress" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                          selectedDonor.status === "medical-evaluation-completed") ? 
                          "Completed" : 
                          "Appointment & assessment"}
                      </div>
                    </div>
                      {/* Stage 3: Admin Final Decision */}
                    <div className="text-center">
                      <div className={`
                        w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                        ${(selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || 
                          selectedDonor.status === "pending-final-admin-review") ? 
                          "bg-indigo-500 ring-4 ring-indigo-100" : 
                          selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? 
                          "bg-blue-500 ring-4 ring-blue-100" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED || 
                          selectedDonor.status === "final-admin-approved" ||
                          selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                          selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                          "bg-green-500" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_REJECTED || 
                          selectedDonor.status === "final-admin-rejected" ||
                          selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED) ? 
                          "bg-red-500" : 
                          "bg-gray-400"}
                      `}>
                        {(selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED || 
                         selectedDonor.status === "final-admin-approved" ||
                         selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                         selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED) ? 
                          "✓" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_REJECTED || 
                          selectedDonor.status === "final-admin-rejected" ||
                          selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED) ? 
                          "✗" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || 
                          selectedDonor.status === "pending-final-admin-review") ? 
                          "⏳" : "3"}
                      </div>
                      <div className="mt-2 text-xs font-medium">Final Admin Review</div>
                      <div className="text-xs text-gray-500">
                        {(selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || 
                          selectedDonor.status === "pending-final-admin-review") ? 
                          "Under Review" : 
                          (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED || 
                          selectedDonor.status === "final-admin-approved") ? 
                          "Approved" :
                          (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_REJECTED || 
                          selectedDonor.status === "final-admin-rejected") ? 
                          "Rejected" : 
                          "Final decision"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Current status indicator */}
              <div className="mt-6 text-center">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full
                    ${selectedDonor.requestStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "bg-blue-100 text-blue-800" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                       selectedDonor.status === "initially-approved") ? "bg-green-100 text-green-800" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                       selectedDonor.status === "medical-evaluation-in-progress") ? "bg-purple-100 text-purple-800" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                       selectedDonor.status === "medical-evaluation-completed") ? "bg-blue-100 text-blue-800" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || 
                       selectedDonor.status === "pending-final-admin-review") ? "bg-indigo-100 text-indigo-800" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "bg-blue-100 text-blue-800" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED || 
                       selectedDonor.status === "final-admin-approved") ? "bg-emerald-100 text-emerald-800" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED ? "bg-green-100 text-green-800" :
                      (selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                       selectedDonor.requestStatus === "approved" ||
                       selectedDonor.status === "approved") ? "bg-green-100 text-green-800" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_REJECTED || 
                       selectedDonor.status === "final-admin-rejected") ? "bg-red-200 text-red-900" :
                      "bg-red-100 text-red-800"}
                  `}>
                    <span className="mr-1">●</span>
                    {selectedDonor.requestStatus === "pending" ? "Awaiting Initial Review" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "Awaiting Medical Evaluation" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                       selectedDonor.status === "initially-approved") ? "Initially Approved by Admin - Ready for Appointments" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || 
                       selectedDonor.status === "medical-evaluation-in-progress") ? "Medical Evaluation In Progress" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || 
                       selectedDonor.status === "medical-evaluation-completed") ? "Medical Evaluation Completed" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || 
                       selectedDonor.status === "pending-final-admin-review") ? "⏳ Pending Final Admin Review" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "Awaiting Admin Final Approval" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED || 
                       selectedDonor.status === "final-admin-approved") ? "🎉 Final Admin Approved!" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED ||
                       selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                       selectedDonor.requestStatus === "approved" ||
                       selectedDonor.status === "approved") ? "🎉 Final Approval Completed" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ? "Not Eligible for Donation" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ? "Rejected After Medical Evaluation" :
                      (selectedDonor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_REJECTED || 
                       selectedDonor.status === "final-admin-rejected") ? "❌ Final Admin Rejected" :
                      selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED ? "Admin Rejected" :
                      "Rejected"}
                  </span>
                </div>
              </div>

              {/* Initial notes */}
              {selectedDonor.doctorComment && (
                <div className="mt-2 p-3 bg-white rounded-md border border-gray-200">
                  <p className="font-medium text-gray-800">Initial Doctor Notes:</p>
                  <p className="italic">{selectedDonor.doctorComment}</p>
                </div>
              )}
              
              {/* Final evaluation notes */}
              {selectedDonor.finalDoctorComment && (
                <div className="mt-2 p-3 bg-white rounded-md border border-blue-200">
                  <p className="font-medium text-blue-800">Final Evaluation Notes:</p>
                  <p className="italic">{selectedDonor.finalDoctorComment}</p>
                </div>
              )}
                {/* Admin notes */}
              {selectedDonor.adminComment && (
                <div className="mt-2 p-3 bg-white rounded-md border border-green-200">
                  <p className="font-medium text-green-800">Admin Notes:</p>
                  <p className="italic">{selectedDonor.adminComment}</p>
                </div>
              )}
          </section>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {activeTab === "pending" && (
              <>
                <button
                  onClick={() => handleApproveDonor(selectedDonor.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  disabled={actionInProgress}
                >
                  Initial Approve
                </button>
                <button
                  onClick={() => handleRejectDonor(selectedDonor.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  disabled={actionInProgress}
                >
                  Reject
                </button>
              </>
            )}
            
            {activeTab === "approved" && (
              <>
                {/* Initially approved by doctor - needs medical evaluation */}
                {selectedDonor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAppointmentsAction(selectedDonor, "donor")}
                      className={`px-4 py-2 rounded ${
                        isDonorEligibleForAppointment(selectedDonor)
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-gray-400 text-gray-200 cursor-not-allowed"
                      }`}
                      disabled={actionInProgress || !isDonorEligibleForAppointment(selectedDonor)}
                      title={isDonorEligibleForAppointment(selectedDonor) 
                        ? `Schedule medical evaluation for ${getDonorName(selectedDonor)}`
                        : getDonorIneligibilityReason(selectedDonor)
                      }
                    >
                      {hasAppointments(selectedDonor.id, "donor") ? "View Evaluation" : "Schedule Evaluation"}
                    </button>
                    
                    {hasAppointments(selectedDonor.id, "donor") && (
                      <>
                        <button
                          onClick={() => handleFinalApproveDonor(selectedDonor.id)}
                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                          disabled={actionInProgress}
                        >
                          Final Approve
                        </button>
                        <button
                          onClick={() => handleFinalRejectDonor(selectedDonor.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          disabled={actionInProgress}
                        >
                          Final Reject
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Initially approved by admin - ready for appointments */}
                {(selectedDonor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || 
                  selectedDonor.status === "initially-approved") && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAppointmentsAction(selectedDonor, "donor")}
                      className={`px-4 py-2 rounded ${
                        isDonorEligibleForAppointment(selectedDonor)
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-gray-400 text-gray-200 cursor-not-allowed"
                      }`}
                      disabled={actionInProgress || !isDonorEligibleForAppointment(selectedDonor)}
                      title={isDonorEligibleForAppointment(selectedDonor) 
                        ? `Schedule appointment for ${getDonorName(selectedDonor)}`
                        : getDonorIneligibilityReason(selectedDonor)
                      }
                    >
                      {hasAppointments(selectedDonor.id, "donor") ? "View Appointments" : "Schedule Appointment"}
                    </button>
                  </div>
                )}

                {/* Fully approved donors */}
                {(selectedDonor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                  selectedDonor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                  selectedDonor.status === APPROVAL_STATUS.FINAL_APPROVED) && (
                  hasAppointments(selectedDonor.id, "donor") ? (
                    <button
                      onClick={() => navigate(`/doctor/appointments?type=donor&id=${selectedDonor.id}`)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      disabled={actionInProgress}
                    >
                      View Appointments
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAppointmentsAction(selectedDonor, "donor")}
                      className={`px-4 py-2 rounded ${
                        isDonorEligibleForAppointment(selectedDonor) 
                          ? "bg-green-500 text-white hover:bg-green-600" 
                          : "bg-gray-400 text-gray-200 cursor-not-allowed"
                      }`}
                      disabled={actionInProgress || !isDonorEligibleForAppointment(selectedDonor)}
                      title={isDonorEligibleForAppointment(selectedDonor) 
                        ? "Schedule appointment for eligible donor" 
                        : getDonorIneligibilityReason(selectedDonor)
                      }
                    >
                      Schedule Appointment
                    </button>
                  )
                )}
                
                {/* Show ineligibility notice for non-eligible donors */}
                {!isDonorEligibleForAppointment(selectedDonor) && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-yellow-800 font-medium">Appointment Scheduling Restricted</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">{getDonorIneligibilityReason(selectedDonor)}</p>
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );  };

  const RecipientDetailsModal = () => {
    if (!selectedRecipient) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">
            Recipient Details: {getRecipientName(selectedRecipient)}
          </h2>

          {/* Personal Information Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {getRecipientName(selectedRecipient)}
              </p>
              <p>
                <span className="font-medium">Blood Type:</span>{" "}
                {selectedRecipient.bloodType}
              </p>
              <p>
                <span className="font-medium">Age:</span> {selectedRecipient.age}
              </p>
              <p>
                <span className="font-medium">Gender:</span>{" "}
                {selectedRecipient.gender}
              </p>
              <p>
                <span className="font-medium">Weight:</span>{" "}
                {selectedRecipient.weight} kg
              </p>
              <p>
                <span className="font-medium">Height:</span>{" "}
                {selectedRecipient.height} cm
              </p>
            </div>
          </section>

          {/* Medical Information Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Medical Information</h3>
            <p>
              <span className="font-medium">Needed Organ:</span>{" "}
              <span className="capitalize">
                {selectedRecipient.organType || selectedRecipient.neededOrgan || "Not specified"}
              </span>
            </p>
            <p>
              <span className="font-medium">Urgency Level:</span>{" "}
              <span className={`px-2 py-1 rounded-full text-xs font-semibold
                ${selectedRecipient.urgencyLevel === "critical" ? "bg-red-100 text-red-800" : 
                  selectedRecipient.urgencyLevel === "high" ? "bg-orange-100 text-orange-800" :
                  selectedRecipient.urgencyLevel === "medium" ? "bg-yellow-100 text-yellow-800" :
                  "bg-blue-100 text-blue-800"}`}>
                {selectedRecipient.urgencyLevel ? selectedRecipient.urgencyLevel.toUpperCase() : "NORMAL"}
              </span>
            </p>
            <p>
              <span className="font-medium">Medical Condition:</span>{" "}
              {selectedRecipient.medicalCondition || "Not specified"}
            </p>
            <p>
              <span className="font-medium">Medical History:</span>{" "}
              {selectedRecipient.medicalHistory || "None recorded"}
            </p>
            <p>
              <span className="font-medium">Current Medications:</span>{" "}
              {selectedRecipient.currentMedications || "None"}
            </p>
            <p>
              <span className="font-medium">Allergies:</span>{" "}
              {selectedRecipient.allergies || "None reported"}
            </p>
          </section>

          {/* Approval Status Section */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Approval Status</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {/* Status indicator */}
              <div className="mt-6 text-center">
                <span className={`px-3 py-1 text-sm font-medium rounded-full
                  ${selectedRecipient.requestStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                    selectedRecipient.requestStatus === "doctor-approved" ? "bg-blue-100 text-blue-800" :
                    selectedRecipient.requestStatus === "admin-approved" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"}
                `}>
                  <span className="mr-1">●</span>
                  {selectedRecipient.requestStatus === "pending" ? "Awaiting Doctor Review" :
                    selectedRecipient.requestStatus === "doctor-approved" ? "Doctor Approved, Awaiting Admin Review" :
                    selectedRecipient.requestStatus === "admin-approved" ? "Fully Approved" :
                    selectedRecipient.requestStatus === "doctor-rejected" ? "Rejected by Doctor" :
                    selectedRecipient.requestStatus === "admin-rejected" ? "Rejected by Admin" :
                    "Rejected"}
                </span>
              </div>
            </div>

            {/* Doctor notes */}
            {selectedRecipient.doctorComment && (
              <div className="mt-2 p-3 bg-white rounded-md border border-gray-200">
                <p className="font-medium text-gray-800">Doctor Notes:</p>
                <p className="italic">{selectedRecipient.doctorComment}</p>
              </div>
            )}
            
            {/* Admin notes */}
            {selectedRecipient.adminComment && (
              <div className="mt-2 p-3 bg-white rounded-md border border-green-200">
                <p className="font-medium text-green-800">Admin Notes:</p>
                <p className="italic">{selectedRecipient.adminComment}</p>
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {activeRecipientTab === "pending" && (
              <>
                <button                  onClick={() => handleApprove(selectedRecipient.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  disabled={actionInProgress}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedRecipient.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  disabled={actionInProgress}
                >
                  Reject
                </button>
              </>
            )}
            
            {activeRecipientTab === "approved" && (
              <button
                onClick={() => handleAppointmentsAction(selectedRecipient, "recipient")}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={actionInProgress}
              >
                {hasAppointments(selectedRecipient.id, "recipient") ? "View Appointments" : "Schedule Appointment"}
              </button>
            )}
            <button
              onClick={() => setIsRecipientDetailsModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SchedulingModal = () => {
    if (!selectedDonor) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-auto">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto my-4">
          <h2 className="text-2xl font-bold mb-4">Schedule Medical Test</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={scheduleData.date}
                onChange={(e) =>
                  setScheduleData({ ...scheduleData, date: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            
            <div>
              <label className="block mb-2">Time</label>
              <input
                type="time"
                className="w-full p-2 border rounded"
                value={scheduleData.time}
                onChange={(e) =>
                  setScheduleData({ ...scheduleData, time: e.target.value })
                }
              />
            </div>
                  
                  {/* Active progress */}
                  <div 
                    className="bg-blue-600 h-2 rounded-full absolute top-4 transition-all duration-700 ease-in-out" 
                    style={{
                      width:
                        selectedRecipient.requestStatus === "pending" ? "0%" :
                        selectedRecipient.requestStatus === "doctor-approved" ? "50%" :
                        selectedRecipient.requestStatus === "admin-approved" ? "100%" :
                        "0%"
                    }}
                  ></div>
                  
                  {/* Stage markers */}
                  <div className="flex justify-between relative">
                    {/* Stage 1: Doctor Review */}
                    <div className="text-center">
                      <div className={`
                        w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                        ${selectedRecipient.requestStatus === "pending" ? 
                          "bg-blue-500 ring-4 ring-blue-100" : 
                          (selectedRecipient.requestStatus === "doctor-approved" || 
                          selectedRecipient.requestStatus === "admin-approved") ? 
                          "bg-green-500" : 
                          selectedRecipient.requestStatus === "rejected" ? 
                          "bg-red-500" : 
                          "bg-gray-400"}
                      `}>
                        {(selectedRecipient.requestStatus === "doctor-approved" || 
                         selectedRecipient.requestStatus === "admin-approved") ? 
                          "✓" : selectedRecipient.requestStatus === "rejected" ? 
                          "✗" : "1"}
                      </div>
                      <div className="mt-2 text-xs font-medium">Doctor Review</div>
                      <div className="text-xs text-gray-500">Medical assessment</div>
                    </div>
                    
                    {/* Stage 2: Admin Final Decision */}
                    <div className="text-center">
                      <div className={`
                        w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold
                        ${selectedRecipient.requestStatus === "doctor-approved" ? 
                          "bg-blue-500 ring-4 ring-blue-100" : 
                          selectedRecipient.requestStatus === "admin-approved" ? 
                          "bg-green-500" : 
                          selectedRecipient.requestStatus === "admin-rejected" ? 
                          "bg-red-500" : 
                          "bg-gray-400"}
                      `}>
                        {selectedRecipient.requestStatus === "admin-approved" ? 
                          "✓" : selectedRecipient.requestStatus === "admin-rejected" ? 
                          "✗" : "2"}
                      </div>
                      <div className="mt-2 text-xs font-medium">Admin Approval</div>
                      <div className="text-xs text-gray-500">Final decision</div>
                    </div>
                  </div>
                </div>
                
                {/* Current status indicator */}
                <div className="mt-6 text-center">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full
                    ${selectedRecipient.requestStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                      selectedRecipient.requestStatus === "doctor-approved" ? "bg-blue-100 text-blue-800" :
                      selectedRecipient.requestStatus === "admin-approved" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"}
                  `}>
                    <span className="mr-1">●</span>
                    {selectedRecipient.requestStatus === "pending" ? "Awaiting Doctor Review" :
                      selectedRecipient.requestStatus === "doctor-approved" ? "Awaiting Admin Final Approval" :
                      selectedRecipient.requestStatus === "admin-approved" ? "Approved" :
                      selectedRecipient.requestStatus === "rejected" ? "Rejected" :
                      "Unknown Status"}
                  </span>
                </div>
              </div>

              {selectedRecipient.doctorComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-800">Medical Team Note:</p>
                  <p className="italic">{selectedRecipient.doctorComment}</p>
                </div>
              )}

              {selectedRecipient.adminComment && (
                <div className="mt-2 bg-white p-3 rounded-md border border-green-200">
                  <p className="font-medium text-green-800">Admin Note:</p>
                  <p className="italic">{selectedRecipient.adminComment}</p>                </div>
              )}
         
          <div className="flex justify-end space-x-2">
            {activeRecipientTab === "pending" && (
              <>
                <button
                  onClick={() => handleApprove(selectedRecipient.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  disabled={actionInProgress}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedRecipient.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  disabled={actionInProgress}
                >
                  Reject
                </button>
              </>)}
            {activeRecipientTab === "approved" && (
              hasAppointments(selectedRecipient.id, "recipient") ? (
                <button
                  onClick={() => navigate(`/doctor/appointments?type=recipient&id=${selectedRecipient.id}`)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={actionInProgress}
                >
                  View Appointments
                </button>
              ) : (
                <button
                  onClick={() => handleAppointmentsAction(selectedRecipient, "recipient")}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-blue-600"
                  disabled={actionInProgress}
                >
                  Schedule Appointment
                </button>
              )
            )}
            <button
              onClick={() => setIsRecipientDetailsModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
   
    );
  };
  // Note: Using the imported AppointmentModal component instead of an internal one
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Doctor Dashboard</h2>

      {/* Quick Actions */}
      <div className="mb-6 bg-white p-5 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => navigate('/doctor/appointments')}
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium">Appointments</h4>
              <p className="text-sm text-gray-600">Manage patient appointments</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/doctor/applications')}
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium">Applications</h4>
              <p className="text-sm text-gray-600">View application status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Donor Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            {/* Updated 3-tab system for donors */}
            <button
              className={`px-4 py-2 rounded ${activeTab === "pending"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => setActiveTab("pending")}
            >
              Pending Donors ({filterDonors(donors.pending).length})
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === "approved"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => setActiveTab("approved")}
            >
              Approved Donors ({filterDonors(donors.approved).length})
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === "rejected"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => setActiveTab("rejected")}
            >
              Rejected Donors ({filterDonors(donors.rejected).length})
            </button>
          </div>
          <div className="w-64">
            <input
              type="text"
              placeholder="Search donors by name, blood type, age..."
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={donorSearch}
              onChange={(e) => setDonorSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Donor Name</th>
              <th className="py-3 px-6 text-left">Blood Group</th>
              <th className="py-3 px-6 text-left">Organ Type</th>
              <th className="py-3 px-6 text-left">Age</th>
              <th className="py-3 px-6 text-left">Weight</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {donors[activeTab] && filterDonors(donors[activeTab]).length > 0 ? (
              filterDonors(donors[activeTab]).map((donor) => (
                <tr key={donor.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-6 text-left">
                    <div className="font-medium">{getDonorName(donor)}</div>
                  </td>
                  <td className="py-3 px-6 text-left">{getSafeValue(donor, "bloodType")}</td>
                  <td className="py-3 px-6 text-left">
                    <span className="capitalize">{getSafeValue(donor, "donorType") || getSafeValue(donor, "organType") || "Not specified"}</span>
                  </td>
                  <td className="py-3 px-6 text-left">{getSafeValue(donor, "age")}</td>
                  <td className="py-3 px-6 text-left">{getSafeValue(donor, "weight")} kg</td>                  <td className="py-3 px-6 text-left">
                    <div className="flex flex-col gap-1">                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        donor.requestStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                        donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "bg-blue-50 text-blue-700" :
                        donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ? "bg-red-100 text-red-800" :
                        donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "bg-blue-100 text-blue-800" :
                        (donor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || donor.status === "initially-approved") ? "bg-green-50 text-green-700" :
                        (donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || donor.status === "medical-evaluation-in-progress") ? "bg-purple-100 text-purple-800" :
                        (donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || donor.status === "medical-evaluation-completed") ? "bg-blue-100 text-blue-800" :
                        (donor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || donor.status === "pending-final-admin-review") ? "bg-indigo-100 text-indigo-800" :
                        (donor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED || donor.status === "final-admin-approved") ? "bg-emerald-100 text-emerald-800" :
                        (donor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                         donor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                         donor.requestStatus === "approved" ||
                         donor.status === "approved")
                          ? "bg-green-100 text-green-800" :
                        (donor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_REJECTED || donor.status === "final-admin-rejected") ? "bg-red-200 text-red-900" :
                        (donor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED || donor.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED)
                          ? "bg-red-100 text-red-800" :
                        getStatusColor(donor.status)
                      }`}>
                        {donor.requestStatus === "pending" ? "Pending Initial Review" :
                        donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "Initially Approved" :
                        donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED ? "Initially Rejected" :
                        donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "Final Doctor Approved" :
                        (donor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED || donor.status === "initially-approved") ? "Initially Approved by Admin" :
                        (donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS || donor.status === "medical-evaluation-in-progress") ? "Medical Evaluation In Progress" :
                        (donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED || donor.status === "medical-evaluation-completed") ? "Medical Evaluation Completed" :
                        (donor.requestStatus === APPROVAL_STATUS.PENDING_FINAL_ADMIN_REVIEW || donor.status === "pending-final-admin-review") ? "⏳ Pending Final Admin Review" :
                        (donor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_APPROVED || donor.status === "final-admin-approved") ? "🎉 Final Admin Approved!" :
                        (donor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                         donor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                         donor.requestStatus === "approved" ||
                         donor.status === "approved")
                          ? "🎉 Final Approval Completed" :
                        (donor.requestStatus === APPROVAL_STATUS.FINAL_ADMIN_REJECTED || donor.status === "final-admin-rejected") ? "❌ Final Admin Rejected" :
                        (donor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED || donor.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED)
                          ? "Rejected" :
                        getStatusDisplay(donor.status, 'doctor')}</span>
                      
                      {/* Appointment eligibility indicator */}
                      {(donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                        donor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED ||
                        donor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ||
                        donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS ||
                        donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED ||
                        donor.status === "initially-approved" ||
                        donor.status === "medical-evaluation-in-progress" ||
                        donor.status === "medical-evaluation-completed" ||
                        donor.status === APPROVAL_STATUS.FINAL_APPROVED ||
                        donor.requestStatus === "approved" ||
                        donor.status === "approved") && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isDonorEligibleForAppointment(donor)
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`} title={isDonorEligibleForAppointment(donor) 
                          ? "Eligible for appointments"
                          : getDonorIneligibilityReason(donor)
                        }>
                          {isDonorEligibleForAppointment(donor) ? (
                            <>
                              <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Appointment Ready
                            </>
                          ) : (
                            <>
                              <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Needs Admin Approval
                            </>
                          )}
                        </span>
                      )}
                      
                      {/* Mini progress indicator */}
                      {!(donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED || 
                         donor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ||
                         donor.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED) && (
                        <div className="flex items-center mt-1 w-full">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full flex">
                            {/* Stage 1 */}
                            <div className={`h-1.5 rounded-l-full ${
                              donor.requestStatus === "pending" ? "bg-yellow-500 animate-pulse" :
                              "bg-green-500"
                            }`} style={{ width: "33%" }}></div>
                            
                            {/* Stage 2 */}
                            <div className={`h-1.5 ${
                              donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED ? "bg-yellow-500 animate-pulse" :
                              (donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                               donor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                               donor.status === APPROVAL_STATUS.FINAL_APPROVED) ? "bg-green-500" :
                              "bg-gray-200"
                            }`} style={{ width: "33%" }}></div>
                            
                            {/* Stage 3 */}
                            <div className={`h-1.5 rounded-r-full ${
                              donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED ? "bg-yellow-500 animate-pulse" :
                              (donor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                               donor.status === APPROVAL_STATUS.FINAL_APPROVED) ? "bg-green-500" :
                              "bg-gray-200"
                            }`} style={{ width: "33%" }}></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Rejected indicator */}
                      {(donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_REJECTED || 
                        donor.requestStatus === APPROVAL_STATUS.DOCTOR_REJECTED ||
                        donor.requestStatus === APPROVAL_STATUS.ADMIN_REJECTED) && (
                        <div className="flex items-center mt-1">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: "100%" }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(donor)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        View Details
                      </button>                      {activeTab === "pending" && (
                        <>
                          <button
                            onClick={() => handleApproveDonor(donor.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            disabled={actionInProgress}
                          >
                            Initial Approve
                          </button>
                          <button
                            onClick={() => handleRejectDonor(donor.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            disabled={actionInProgress}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {activeTab === "approved" && (
                        <>                          {donor.requestStatus === APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED && (
                            <>
                              <button
                                onClick={() => handleAppointmentsAction(donor, "donor")}
                                className={`px-3 py-1 rounded text-white text-sm ${
                                  isDonorEligibleForAppointment(donor)
                                    ? "bg-blue-500 hover:bg-blue-600"
                                    : "bg-gray-400 cursor-not-allowed"
                                }`}
                                type="button"
                                disabled={!isDonorEligibleForAppointment(donor)}
                                title={isDonorEligibleForAppointment(donor) 
                                  ? `Schedule medical evaluation for ${getDonorName(donor)}` 
                                  : getDonorIneligibilityReason(donor)
                                }
                              >
                                {isDonorEligibleForAppointment(donor) ? (
                                  <>
                                    <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    {hasAppointments(donor.id, "donor") ? "View Evaluation" : "Schedule Evaluation"}
                                  </>
                                ) : (
                                  <>
                                    <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                    </svg>
                                    Restricted
                                  </>
                                )}
                              </button>
                              
                              {hasAppointments(donor.id, "donor") && (
                                <>
                                  <button
                                    onClick={() => handleFinalApproveDonor(donor.id)}
                                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                                    disabled={actionInProgress}
                                  >
                                    Final Approve
                                  </button>
                                  <button
                                    onClick={() => handleFinalRejectDonor(donor.id)}
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                    disabled={actionInProgress}
                                  >
                                    Final Reject
                                  </button>
                                </>
                              )}
                            </>
                          )}                            {(donor.requestStatus === APPROVAL_STATUS.DOCTOR_APPROVED || 
                           donor.requestStatus === APPROVAL_STATUS.ADMIN_APPROVED || 
                           donor.requestStatus === APPROVAL_STATUS.INITIALLY_APPROVED ||
                           donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_IN_PROGRESS ||
                           donor.requestStatus === APPROVAL_STATUS.MEDICAL_EVALUATION_COMPLETED ||
                           donor.status === "initially-approved" ||
                           donor.status === "medical-evaluation-in-progress" ||
                           donor.status === "medical-evaluation-completed" ||
                           donor.status === APPROVAL_STATUS.FINAL_APPROVED) && (
                            <button
                              onClick={() => handleAppointmentsAction(donor, "donor")}
                              className={`px-3 py-1 rounded text-white text-sm ${
                                isDonorEligibleForAppointment(donor)
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-400 cursor-not-allowed"
                              }`}
                              type="button"
                              disabled={!isDonorEligibleForAppointment(donor)}
                              title={isDonorEligibleForAppointment(donor) 
                                ? `View appointments for ${getDonorName(donor)}` 
                                : getDonorIneligibilityReason(donor)
                              }
                            >
                              {isDonorEligibleForAppointment(donor) ? (
                                <>
                                  <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  View Appointments
                                </>
                              ) : (
                                <>
                                  <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                  </svg>
                                  Restricted
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-4 px-6 text-center">
                  {donorSearch
                    ? `No matching donors found in ${activeTab} list`
                    : `No donors found in ${activeTab} list`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recipients Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded ${activeRecipientTab === "pending"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => setActiveRecipientTab("pending")}
            >
              Pending Recipients ({filterRecipients(recipients.pending).length})
            </button>
            <button
              className={`px-4 py-2 rounded ${activeRecipientTab === "approved"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => setActiveRecipientTab("approved")}
            >
              Approved Recipients ({filterRecipients(recipients.approved).length})
            </button>
            <button
              className={`px-4 py-2 rounded ${activeRecipientTab === "rejected"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => setActiveRecipientTab("rejected")}
            >
              Rejected Recipients ({filterRecipients(recipients.rejected).length})
            </button>
          </div>
          <div className="w-64">
            <input
              type="text"
              placeholder="Search recipients by name, blood type..."
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Recipients Table */}
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Blood Type</th>
              <th className="py-3 px-6 text-left">Request Type</th>
              <th className="py-3 px-6 text-left">Organ Type</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {recipients[activeRecipientTab] && filterRecipients(recipients[activeRecipientTab]).length > 0 ? (
              filterRecipients(recipients[activeRecipientTab]).map((recipient) => (
                <tr key={recipient.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-6 text-left">
                    <div className="font-medium">{getRecipientName(recipient)}</div>
                  </td>
                  <td className="py-3 px-6 text-left">{recipient.bloodType}</td>
                  <td className="py-3 px-6 text-left">
                    <span className="capitalize">{recipient.requestType || "Organ"}</span>
                  </td>
                  <td className="py-3 px-6 text-left">
                    <span className="capitalize">{recipient.organType || "Not specified"}</span>
                  </td>
                  <td className="py-3 px-6 text-left">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${recipient.requestStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                        recipient.requestStatus === "doctor-approved" ? "bg-blue-100 text-blue-800" :
                          recipient.requestStatus === "admin-approved" ? "bg-green-100 text-green-800" :
                            recipient.requestStatus === "rejected" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                      }`}>
                      {recipient.requestStatus === "pending" ? "Pending Review" :
                        recipient.requestStatus === "doctor-approved" ? "Doctor Approved" :
                          recipient.requestStatus === "admin-approved" ? "Admin Approved" :
                            recipient.requestStatus === "rejected" ? "Rejected" :
                              "Unknown Status"}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center space-x-2">
                      <button
                        onClick={() => handleViewRecipientDetails(recipient)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        View Details
                      </button>

                      {activeRecipientTab === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(recipient.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            disabled={actionInProgress}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(recipient.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            disabled={actionInProgress}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {activeRecipientTab === "approved" && (
                        <button
                          onClick={() => handleAppointmentsAction(recipient, "recipient")}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                          title={`Schedule appointment for ${getRecipientName(recipient)}`}
                        >
                          {hasAppointments(recipient.id, "recipient") ? "View Appointments" : "Schedule Appointment"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-4 px-6 text-center">
                  {recipientSearch
                    ? `No matching recipients found in ${activeRecipientTab} list`
                    : `No recipients found in ${activeRecipientTab} list`}
                </td>
              </tr>
            )}          </tbody>        </table>
      </div>      {isDetailsModalOpen && <DonorDetailsModal />}
      {isSchedulingModalOpen && <SchedulingModal />}
      {isRecipientDetailsModalOpen && <RecipientDetailsModal />}

      {/* Only render the appointment modal when it's explicitly shown */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          console.log("Modal close requested");

          // Reset all global variables
          if (window.setCurrentPatient) window.setCurrentPatient = null;
          if (window.setCurrentPatientType) window.setCurrentPatientType = null;
          window.selectedPatientInfo = null;
          window.currentDoctorInfo = null;

          // Close the modal first
          setIsAppointmentModalOpen(false);

          // Then reset patient data with a delay to prevent UI flashing
          setTimeout(() => {
            setCurrentPatient(null);
            setCurrentPatientType(null);
            setScheduleData({ date: "", time: "" });
          }, 100);
        }}
        onSubmit={handleCreateAppointment} currentPatient={currentPatient}
        currentPatientType={currentPatientType}
        scheduleData={scheduleData}
        setScheduleData={setScheduleData}
        existingAppointments={existingAppointments}
        actionInProgress={actionInProgress}
        getDonorName={getDonorName}
        getRecipientName={getRecipientName}
        donors={donors}
        recipients={recipients}
      />
    </div>
  );
}
export default DoctorDashboard;
