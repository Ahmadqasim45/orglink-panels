"use client"

import { useState, useEffect } from "react"
import { db } from "../../firebase"
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore"
import { auth } from "../../firebase"
import { onAuthStateChanged } from "firebase/auth"
import "./recipient-profile.css"
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function CompleteProfile() {
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profileExists, setProfileExists] = useState(false)
  const [originalProfile, setOriginalProfile] = useState(null)

  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const totalSteps = 4 // Changed from 5 to 4 steps

  // Location data states
  const [cities, setCities] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingHospitals, setLoadingHospitals] = useState(false)
  const [noCitiesFound, setNoCitiesFound] = useState(false)
  const [noHospitalsFound, setNoHospitalsFound] = useState(false)
  const [hospitalId, setHospitalId] = useState("")

  const [requestStatus, setRequestStatus] = useState("not-submitted"); // Possible values: not-submitted, pending, doctor-approved, admin-approved, rejected
  const [statusMessage, setStatusMessage] = useState("");
  const [doctorComment, setDoctorComment] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [requestSubmissionDate, setRequestSubmissionDate] = useState(null);

  const [profile, setProfile] = useState({
    // Personal Information
    fullName: "",
    email: "",
    phone: "",
    address: "",
    zipCode: "",
    dateOfBirth: "",
    gender: "",
    nationalId: "",
    bloodType: "",
    weight: "",
    height: "",

    // Transplant Center
    city: "",
    state: "",
    hospitalAssociation: "",

    // Medical Information
    diagnosedCondition: "",
    diagnosisDate: "",
    treatingPhysician: "",
    physicianContact: "",
    diagnosisHospital: "",
    medicalHistory: "",
    allergies: "",
    currentMedications: "",
    previousTransfusions: "no",
    previousTransfusionDetails: "",
    immuneSystemIssues: "no",
    immuneSystemDetails: "",

    // Request Details
    organType: "",
    bloodProductType: "",
    requestType: "organ", // organ or blood
    urgencyLevel: "normal",
    requiredQuantity: "",
    requestReason: "",
    requestDate: "",
    estimatedTimeframe: "",
    matchingCriteria: "",
    currentlyHospitalized: "no",
    hospitalizedLocation: "",

    // Family Information
    familyContactName: "",
    familyContactRelationship: "",
    familyContactPhone: "",
    familyContactEmail: "",
    familyAwareOfCondition: "yes",
    familyAwareOfRequest: "yes",
    hasCaregiver: "no",
    caregiverDetails: "",
    
    // Additional Information (optional)
    howDidYouHear: "",
    additionalNotes: "",
    occupation: "", // optional field
  })

  // Fetch cities when province is selected
  useEffect(() => {
    const fetchCities = async () => {
      if (!profile.state) return

      setLoadingCities(true)
      setNoCitiesFound(false)

      try {
        const hospitalsRef = collection(db, "hospitals")
        const q = query(
          hospitalsRef,
          where("province", "==", profile.state),
          where("verificationStatus", "==", "Approved"),
        )
        const querySnapshot = await getDocs(q)

        const uniqueCities = new Set()
        querySnapshot.forEach((doc) => {
          uniqueCities.add(doc.data().city)
        })

        const cityList = [...uniqueCities]
        setCities(cityList)
        setHospitals([]) // Reset hospitals when province changes

        // Only reset city and hospital if editing
        if (isEditing) {
          setProfile((prev) => ({ ...prev, city: "", hospitalAssociation: "" }))
        }

        setLoadingCities(false)

        if (cityList.length === 0) {
          setNoCitiesFound(true)
        }
      } catch (error) {
        console.error("Error fetching cities:", error)
        setLoadingCities(false)
        setNoCitiesFound(true)
      }
    }

    fetchCities()
  }, [profile.state, isEditing])

  // Fetch hospitals when city is selected
  useEffect(() => {
    const fetchHospitals = async () => {
      if (!profile.city) return

      setLoadingHospitals(true)
      setNoHospitalsFound(false)

      try {
        const hospitalsRef = collection(db, "hospitals")
        const q = query(hospitalsRef, where("city", "==", profile.city))
        const querySnapshot = await getDocs(q)

        const hospitalList = querySnapshot.docs.map((doc) => ({
          name: doc.data().hospitalName,
          userId: doc.data().userId,
        }))

        setHospitals(hospitalList)

        // Only reset hospital if editing
        if (isEditing) {
          setProfile((prev) => ({ ...prev, hospitalAssociation: "" }))
        }

        setLoadingHospitals(false)

        if (hospitalList.length === 0) {
          setNoHospitalsFound(true)
        }
      } catch (error) {
        console.error("Error fetching hospitals:", error)
        setLoadingHospitals(false)
        setNoHospitalsFound(true)
      }
    }

    fetchHospitals()
  }, [profile.city, isEditing])

  // Set hospital ID when hospital is selected
  useEffect(() => {
    const fetchHospitalUserId = async () => {
      if (!profile.hospitalAssociation) {
        setHospitalId("")
        return
      }

      const selectedHospital = hospitals.find((h) => h.name === profile.hospitalAssociation)

      if (selectedHospital) {
        setHospitalId(selectedHospital.userId)
      } else {
        setHospitalId("")
      }
    }

    fetchHospitalUserId()
  }, [profile.hospitalAssociation, hospitals])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        fetchRecipientProfile(currentUser.uid)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const fetchRecipientProfile = async (userId) => {
    try {
      const recipientsRef = collection(db, "recipients")
      const q = query(recipientsRef, where("userId", "==", userId))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        // Profile exists - set to view mode
        const recipientData = querySnapshot.docs[0].data();

        // Get request status information
        setRequestStatus(recipientData.requestStatus || "not-submitted");
        setStatusMessage(recipientData.statusMessage || "");
        setDoctorComment(recipientData.doctorComment || "");
        setAdminComment(recipientData.adminComment || "");
        setRequestSubmissionDate(recipientData.requestSubmissionDate ? 
          recipientData.requestSubmissionDate.toDate() : null);

        // Create a merged profile with all possible fields
        const profileData = {
          // Personal Information
          fullName: recipientData.fullName || "",
          email: recipientData.email || "",
          phone: recipientData.phone || "",
          address: recipientData.address || "",
          zipCode: recipientData.zipCode || "",
          dateOfBirth: recipientData.dateOfBirth || "",
          gender: recipientData.gender || "",
          nationalId: recipientData.nationalId || "",
          bloodType: recipientData.bloodType || "",
          weight: recipientData.weight || "",
          height: recipientData.height || "",
          
          // Transplant Center
          city: recipientData.city || "",
          state: recipientData.state || "",
          hospitalAssociation: recipientData.hospitalAssociation || "",

          // Medical Information
          diagnosedCondition: recipientData.diagnosedCondition || "",
          diagnosisDate: recipientData.diagnosisDate || "",
          treatingPhysician: recipientData.treatingPhysician || "",
          physicianContact: recipientData.physicianContact || "",
          diagnosisHospital: recipientData.diagnosisHospital || "",
          medicalHistory: recipientData.medicalHistory || "",
          allergies: recipientData.allergies || "",
          currentMedications: recipientData.currentMedications || "",
          previousTransfusions: recipientData.previousTransfusions || "no",
          previousTransfusionDetails: recipientData.previousTransfusionDetails || "",
          immuneSystemIssues: recipientData.immuneSystemIssues || "no",
          immuneSystemDetails: recipientData.immuneSystemDetails || "",

          // Request Details
          organType: recipientData.organType || "",
          bloodProductType: recipientData.bloodProductType || "",
          requestType: recipientData.requestType || "organ",
          urgencyLevel: recipientData.urgencyLevel || "normal",
          requiredQuantity: recipientData.requiredQuantity || "",
          requestReason: recipientData.requestReason || "",
          requestDate: recipientData.requestDate || "",
          estimatedTimeframe: recipientData.estimatedTimeframe || "",
          matchingCriteria: recipientData.matchingCriteria || "",
          currentlyHospitalized: recipientData.currentlyHospitalized || "no",
          hospitalizedLocation: recipientData.hospitalizedLocation || "",

          // Family Information
          familyContactName: recipientData.familyContactName || "",
          familyContactRelationship: recipientData.familyContactRelationship || "",
          familyContactPhone: recipientData.familyContactPhone || "",
          familyContactEmail: recipientData.familyContactEmail || "",
          familyAwareOfCondition: recipientData.familyAwareOfCondition || "yes",
          familyAwareOfRequest: recipientData.familyAwareOfRequest || "yes",
          hasCaregiver: recipientData.hasCaregiver || "no",
          caregiverDetails: recipientData.caregiverDetails || "",

          // Additional Information (optional)
          howDidYouHear: recipientData.howDidYouHear || "",
          additionalNotes: recipientData.additionalNotes || "",
          occupation: recipientData.occupation || "",
        }

        setProfile(profileData)
        setOriginalProfile(profileData)
        setProfileExists(true)
        setIsEditing(false) // Set to view mode
        setShowSummary(true) // Show summary view for existing profiles
      } else {
        // No profile exists - set to create mode
        setProfileExists(false)
        setIsEditing(true) // In create mode, all fields are editable
        setShowSummary(false) // Start with step 1 for new profiles

        // Pre-fill email from auth if available
        if (user && user.email) {
          setProfile((prev) => ({
            ...prev,
            email: user.email,
          }))
        }
      }
      setLoading(false)
    } catch (error) {
      console.error("Error fetching recipient profile:", error)
      alert("Failed to load your profile. Please try again.")
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleRadioChange = (name, value) => {
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Show or hide additional fields based on selected options
  const shouldShowField = (fieldName) => {
    switch (fieldName) {
      case "previousTransfusionDetails":
        return profile.previousTransfusions === "yes"
      case "immuneSystemDetails":
        return profile.immuneSystemIssues === "yes"
      case "hospitalizedLocation":
        return profile.currentlyHospitalized === "yes"
      case "organType":
        return profile.requestType === "organ"
      case "bloodProductType":
        return profile.requestType === "blood"
      case "caregiverDetails":
        return profile.hasCaregiver === "yes"
      default:
        return true
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      const recipientsRef = collection(db, "recipients")
      const q = query(recipientsRef, where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)

      // Include hospitalId in the data to be saved
      const profileData = {
        ...profile,
        hospitalId: hospitalId || "",
        updatedAt: new Date(),
      }

      if (querySnapshot.empty) {
        // Create new recipient profile
        const newRecipientRef = doc(collection(db, "recipients"))
        await setDoc(newRecipientRef, {
          ...profileData,
          userId: user.uid,
          createdAt: new Date(),
          requestStatus: "pending",
        })
        console.log("New recipient profile created successfully!")
        alert("Your profile has been created successfully!")
        setProfileExists(true)
        setIsEditing(false) // Switch to view mode after creation
        setShowSummary(true) // Show summary after creation
      } else {
        // Update existing recipient profile
        const recipientDoc = querySnapshot.docs[0].ref
        await updateDoc(recipientDoc, profileData)
        console.log("Recipient profile updated successfully!")
        alert("Your profile has been updated successfully!")
        setIsEditing(false) // Switch to view mode after update
        setShowSummary(true) // Show summary after update
      }

      // Update the original profile after successful save
      setOriginalProfile({ ...profile, hospitalId })

      // Ensure we show the summary view after saving
      setCurrentStep(1)
      setShowSummary(true)
    } catch (error) {
      console.error("Error saving recipient profile:", error)
      alert("Failed to save your profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleSendRequest = async () => {
    try {
      if (!user) {
        toast.error("You must be logged in to send a request.");
        return;
      }

      if (!hospitalId) {
        toast.error("Please select a valid hospital before submitting your request.");
        return;
      }

      setSaving(true);
      
      // Check if profile is complete
      const requiredFields = [
        'fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'nationalId',
        'diagnosedCondition', 'organType', 'hospitalAssociation'
      ];
      
      const missingFields = requiredFields.filter(field => !profile[field]);
      if (missingFields.length > 0) {
        toast.error(`Please complete all required fields before submitting: ${missingFields.join(', ')}`);
        setSaving(false);
        return;
      }

      // First, ensure the profile is saved to the database
      try {
        const recipientsRef = collection(db, "recipients");
        const q = query(recipientsRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        // Include hospitalId in the data to be saved and ensure it's properly linked
        const profileData = {
          ...profile,
          hospitalId: hospitalId, // Ensure this is the selected hospital's userId
          reviewingHospitalId: hospitalId, // Add this to explicitly track which hospital should review
          updatedAt: new Date(),
        };

        let recipientDocRef;
        
        if (querySnapshot.empty) {
          // Create new recipient profile
          recipientDocRef = doc(collection(db, "recipients"));
          await setDoc(recipientDocRef, {
            ...profileData,
            userId: user.uid,
            createdAt: new Date(),
            requestStatus: "pending",
            requestSubmissionDate: new Date(),
            doctorReviewed: false,
            adminReviewed: false,
            doctorComment: "",
            adminComment: "",
            // Explicit fields to ensure request goes to specific hospital
            assignedToHospital: hospitalId,
            assignedHospitalName: profile.hospitalAssociation
          });
          
          console.log("New recipient profile created and request submitted to selected hospital!");
          toast.success("Profile created and request submitted successfully to " + profile.hospitalAssociation);
          
          // Update local state
          setRequestStatus("pending");
          setRequestSubmissionDate(new Date());
          setProfileExists(true);
          setIsEditing(false);
          setShowSummary(true);
        } else {
          // Update existing profile with request status
          recipientDocRef = querySnapshot.docs[0].ref;
          await updateDoc(recipientDocRef, {
            ...profileData,
            requestStatus: "pending",
            requestSubmissionDate: new Date(),
            doctorReviewed: false,
            adminReviewed: false,
            doctorComment: "",
            adminComment: "",
            // Explicit fields to ensure request goes to specific hospital
            assignedToHospital: hospitalId,
            assignedHospitalName: profile.hospitalAssociation
          });
          
          console.log("Profile updated and request submitted to " + profile.hospitalAssociation);
          toast.success(`Application sent successfully to ${profile.hospitalAssociation}! Your request is now pending review.`);
          
          // Update local state
          setRequestStatus("pending");
          setRequestSubmissionDate(new Date());
        }
        
        // Update original profile after successful save
        setOriginalProfile({ ...profile, hospitalId });
        
      } catch (dbError) {
        console.error("Database error:", dbError);
        toast.error(`Database error: ${dbError.message || "Unknown error"}`);
      }
      
      setSaving(false);
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error(`Request failed: ${error.message || "Unknown error"}`);
      setSaving(false);
    }
  };

  const isEditingAllowed = () => {
    // Only allow editing for not-submitted applications
    return requestStatus === "not-submitted";
    // Removed "|| requestStatus === "rejected"" to prevent editing rejected applications
  };

  const toggleEditMode = () => {
    if (!isEditingAllowed()) {
    }
    
    if (isEditing) {
      // Cancel editing - revert to original profile
      setProfile({ ...originalProfile })
      setShowSummary(true)
    } else {
      // Start editing
      setShowSummary(false)
      setCurrentStep(1)
    }
    setIsEditing(!isEditing)
  };

  const editSection = (step) => {
    if (!isEditingAllowed()) {
      toast.warning("You cannot edit your profile while it's under review.");
      return;
    }
    
    setCurrentStep(step)
    setShowSummary(false)
    setIsEditing(true)
  };

  // Step navigation functions
  const goToNextStep = () => {
    // Mark current step as completed
    setCompletedSteps((prev) => ({
      ...prev,
      [currentStep]: true,
    }))

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowSummary(true)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step) => {
    if (step <= totalSteps && (completedSteps[step - 1] || step === 1 || completedSteps[step - 2])) {
      setCurrentStep(step)
      setShowSummary(false)
    }
  }

  // Validation for each step
  const validateStep = (step) => {
    switch (step) {
      case 1: // Personal Information (same as before)
        return (
          profile.fullName &&
          profile.email &&
          profile.phone &&
          profile.address &&
          profile.zipCode &&
          profile.dateOfBirth &&
          profile.gender &&
          profile.nationalId &&
          profile.bloodType &&
          profile.weight &&
          profile.height
        )
      case 2: // Organ Request (moved from step 4)
        return (
          ((profile.requestType === "organ" && profile.organType) ||
            (profile.requestType === "blood" && profile.bloodProductType)) &&
          profile.urgencyLevel &&
          profile.requiredQuantity &&
          profile.requestReason &&
          profile.requestDate &&
          profile.estimatedTimeframe &&
          (profile.currentlyHospitalized !== "yes" || profile.hospitalizedLocation)
        )
      case 3: // Medical Information (specific to selected organ)
        return (
          profile.diagnosedCondition &&
          profile.diagnosisDate &&
          profile.treatingPhysician &&
          profile.physicianContact &&
          profile.diagnosisHospital &&
          profile.medicalHistory &&
          profile.allergies &&
          profile.currentMedications &&
          (profile.previousTransfusions !== "yes" || profile.previousTransfusionDetails) &&
          (profile.immuneSystemIssues !== "yes" || profile.immuneSystemDetails)
        )
      case 4: // Transplant Center (moved from step 2)
        return (
          profile.state &&
          profile.city &&
          profile.hospitalAssociation
        )
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const getStepTitle = (step) => {
    switch (step) {
      case 1:
        return "Personal Information"
      case 2:
        return "Organ Request"
      case 3:
        return "Medical Information"
      case 4:
        return "Transplant Center"
      default:
        return ""
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-teal-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Recipient Profile</h2>
            {profileExists && !isEditing && !showSummary && (
              <button
                type="button"
                className="px-4 py-2 bg-white text-teal-700 rounded-md font-medium hover:bg-gray-100 transition-colors"
                onClick={toggleEditMode}
              >
                <i className="fas fa-edit mr-2"></i>
                Edit Profile
              </button>
            )}
            {profileExists && isEditing && (
              <button
                type="button"
                className="px-4 py-2 bg-white text-teal-700 rounded-md font-medium hover:bg-gray-100 transition-colors"
                onClick={toggleEditMode}
              >
                Cancel
              </button>
            )}
          </div>
          <p className="mt-2 text-teal-100">
            {!profileExists
              ? "Please complete your recipient profile information"
              : isEditing
                ? "Edit your recipient information below"
                : "View your recipient information and request details"}
          </p>
        </div>

        {/* Progress Indicator */}
        {!showSummary && (
          <div className="px-6 pt-6">
            {/* Current step title - replacing the step indicators */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h4 className="text-lg font-semibold text-teal-700">
                  Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}
                </h4>
              </div>
              <div className="text-sm text-gray-600">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </div>
            </div>
            
            {/* Keep the progress bar */}
            <div className="relative h-2 bg-gray-200 rounded-full mb-6">
              <div
                className="absolute top-0 left-0 h-2 bg-teal-600 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Summary View */}
            {showSummary && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Profile Summary</h3>

                {/* Application Status - Simplified */}
                {requestStatus !== "not-submitted" && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Application Status</h4>
                    
                    <div className="flex items-center mb-3">
                      <span className="text-sm font-medium mr-2">Status:</span>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        requestStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                        requestStatus === "doctor-approved" ? "bg-blue-100 text-blue-800" :
                        requestStatus === "admin-approved" ? "bg-green-100 text-green-800" :
                        requestStatus === "rejected" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {requestStatus === "pending" ? "Pending Review" :
                         requestStatus === "doctor-approved" ? "Approved" :
                         requestStatus === "admin-approved" ? "Approved" :
                         requestStatus === "rejected" ? "Rejected" :
                         "Not Submitted"}
                      </span>
                    </div>
                    
                    {requestSubmissionDate && (
                      <div className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">Submitted on:</span> {requestSubmissionDate.toLocaleDateString()}
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Approval Progress</span>
                        <span className="text-sm font-medium text-gray-700">
                          {requestStatus === "pending" ? "0%" :
                           requestStatus === "doctor-approved" ? "50%" :
                           requestStatus === "admin-approved" ? "100%" :
                           requestStatus === "rejected" ? "0%" : "0%"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-500" style={{ 
                          width: 
                            requestStatus === "pending" ? "5%" :
                            requestStatus === "doctor-approved" ? "50%" :
                            requestStatus === "admin-approved" ? "100%" :
                            "0%" 
                        }}></div>
                      </div>
                      
                      {/* Medical team messages with enhanced content */}
                      {requestStatus === "pending" && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                          <p className="text-yellow-800 font-medium">Your application is under review by the medical team.</p>
                          <p className="text-yellow-700 mt-1">You cannot edit your information while your application is being reviewed.</p>
                        </div>
                      )}

                      {requestStatus === "doctor-approved" && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                          <p className="text-blue-800 font-medium">Congratulations! Your application has been approved by the medical team.</p>
                          
                          {doctorComment && (
                            <div className="mt-2 bg-white p-3 rounded-md border border-blue-200">
                              <p className="font-medium text-blue-800">Medical Team Note:</p>
                              <p className="italic">{doctorComment}</p>
                            </div>
                          )}
                          
                          <p className="mt-2 text-blue-700">The medical team will contact you soon to schedule your appointment.</p>
                        </div>
                      )}

                      {requestStatus === "admin-approved" && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-3">
                          <p className="text-green-800 font-medium">Congratulations! Your application has been fully approved!</p>
                          
                          {adminComment && (
                            <div className="mt-2 bg-white p-3 rounded-md border border-green-200">
                              <p className="font-medium text-green-800">Approval Note:</p>
                              <p className="italic">{adminComment}</p>
                            </div>
                          )}
                          
                          <div className="mt-2">
                            <p className="text-green-700"><span className="font-medium">Hospital:</span> {profile.hospitalAssociation}</p>
                            <p className="text-green-700 mt-1">Your transplant center will contact you shortly to schedule your initial consultation.</p>
                          </div>
                        </div>
                      )}

                      {requestStatus === "rejected" && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3">
                          <p className="text-red-800 font-medium">We're sorry, your application has been declined.</p>
                          
                          {doctorComment && (
                            <div className="mt-2 bg-white p-3 rounded-md border border-red-200">
                              <p className="font-medium text-red-800">Message from Medical Team:</p>
                              <p className="italic">{doctorComment}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal Information Summary - Stays as step 1 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Personal Information</h4>
                    {isEditingAllowed() && (
                      <button
                        type="button"
                        className="text-teal-600 hover:text-teal-800 flex items-center text-sm font-medium"
                        onClick={() => editSection(1)}
                      >
                        <i className="fas fa-edit mr-1"></i> Edit
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">{profile.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{profile.dateOfBirth}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-medium capitalize">{profile.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ID/Insurance Number</p>
                      <p className="font-medium">{profile.nationalId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{profile.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{profile.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Zip/Postal Code</p>
                      <p className="font-medium">{profile.zipCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Weight</p>
                      <p className="font-medium">{profile.weight} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Height</p>
                      <p className="font-medium">{profile.height} cm</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Blood Type</p>
                      <p className="font-medium">{profile.bloodType}</p>
                    </div>
                  </div>
                </div>
                
                {/* Organ Request Summary - Now step 2 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Organ Request</h4>
                    {isEditingAllowed() && (
                      <button
                        type="button"
                        className="text-teal-600 hover:text-teal-800 flex items-center text-sm font-medium"
                        onClick={() => editSection(2)}
                      >
                        <i className="fas fa-edit mr-1"></i> Edit
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Request Type</p>
                      <p className="font-medium capitalize">{profile.requestType}</p>
                    </div>
                    {profile.requestType === "organ" && (
                      <div>
                        <p className="text-sm text-gray-500">Organ Type</p>
                        <p className="font-medium capitalize">{profile.organType}</p>
                      </div>
                    )}
                    {profile.requestType === "blood" && (
                      <div>
                        <p className="text-sm text-gray-500">Blood Product Type</p>
                        <p className="font-medium capitalize">{profile.bloodProductType}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Required Quantity</p>
                      <p className="font-medium">{profile.requiredQuantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Urgency Level</p>
                      <p className="font-medium capitalize">{profile.urgencyLevel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Request Date</p>
                      <p className="font-medium">{profile.requestDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Estimated Timeframe</p>
                      <p className="font-medium">{profile.estimatedTimeframe}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Request Reason</p>
                      <p className="font-medium">{profile.requestReason}</p>
                    </div>
                  </div>
                </div>

                {/* Medical Information Summary - Now step 3 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Medical Information</h4>
                    {isEditingAllowed() && (
                      <button
                        type="button"
                        className="text-teal-600 hover:text-teal-800 flex items-center text-sm font-medium"
                        onClick={() => editSection(3)}
                      >
                        <i className="fas fa-edit mr-1"></i> Edit
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Diagnosed Condition</p>
                      <p className="font-medium">{profile.diagnosedCondition}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Diagnosis Date</p>
                      <p className="font-medium">{profile.diagnosisDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Treating Physician</p>
                      <p className="font-medium">{profile.treatingPhysician}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Physician Contact</p>
                      <p className="font-medium">{profile.physicianContact}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Diagnosis Hospital</p>
                      <p className="font-medium">{profile.diagnosisHospital}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Medical History</p>
                      <p className="font-medium">{profile.medicalHistory}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Allergies</p>
                      <p className="font-medium">{profile.allergies}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Medications</p>
                      <p className="font-medium">{profile.currentMedications}</p>
                    </div>
                  </div>
                </div>

                {/* Transplant Center Summary - Now step 4 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Transplant Center</h4>
                    {isEditingAllowed() && (
                      <button
                        type="button"
                        className="text-teal-600 hover:text-teal-800 flex items-center text-sm font-medium"
                        onClick={() => editSection(4)}
                      >
                        <i className="fas fa-edit mr-1"></i> Edit
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Province/State</p>
                      <p className="font-medium">{profile.state}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">City</p>
                      <p className="font-medium">{profile.city}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Hospital/Transplant Center</p>
                      <p className="font-medium">{profile.hospitalAssociation}</p>
                    </div>
                  </div>
                </div>

                {showSummary && requestStatus === "not-submitted" && (
                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSendRequest}
                      disabled={saving}
                      className="px-6 py-3 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition-colors flex items-center"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i> Send Request for Approval
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!showSummary && (
              <>
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                          Full Legal Name*
                        </label>
                        <input
                          id="fullName"
                          name="fullName"
                          value={profile.fullName}
                          onChange={handleChange}
                          placeholder="John Doe"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                          Date of Birth*
                        </label>
                        <input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={profile.dateOfBirth}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                          Sex/Gender*
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          value={profile.gender}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                          disabled={profileExists && !isEditing}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700">
                          Government ID/Health Insurance Number*
                        </label>
                        <input
                          id="nationalId"
                          name="nationalId"
                          value={profile.nationalId}
                          onChange={handleChange}
                          placeholder="ID Number"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email Address*
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={profile.email}
                          onChange={handleChange}
                          placeholder="john.doe@example.com"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone Number*
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          value={profile.phone}
                          onChange={handleChange}
                          placeholder="+1 (555) 123-4567"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Home Address*
                        </label>
                        <input
                          id="address"
                          name="address"
                          value={profile.address}
                          onChange={handleChange}
                          placeholder="123 Main St"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                          Zip/Postal Code*
                        </label>
                        <input
                          id="zipCode"
                          name="zipCode"
                          value={profile.zipCode}
                          onChange={handleChange}
                          placeholder="10001"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                    </div>

                    <h4 className="text-lg font-semibold text-gray-800 mt-8 border-b pb-2">Physical Attributes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                          Weight (kg)*
                        </label>
                        <input
                          id="weight"
                          name="weight"
                          type="number"
                          value={profile.weight}
                          onChange={handleChange}
                          placeholder="70"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="height" className="block text-sm font-medium text-gray-700">
                          Height (cm)*
                        </label>
                        <input
                          id="height"
                          name="height"
                          type="number"
                          value={profile.height}
                          onChange={handleChange}
                          placeholder="175"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700">
                          Blood Type (ABO and Rh factor)*
                        </label>
                        <select
                          id="bloodType"
                          name="bloodType"
                          value={profile.bloodType}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                          disabled={profileExists && !isEditing}
                        >
                          <option value="">Select blood type</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Organ Request */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Organ Request</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Request Type*</label>
                        <div className="flex gap-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="requestType"
                              value="organ"
                              checked={profile.requestType === "organ"}
                              onChange={() => handleRadioChange("requestType", "organ")}
                              className="form-radio h-5 w-5 text-teal-600"
                              disabled={profileExists && !isEditing}
                            />
                            <span className="ml-2">Organ</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="requestType"
                              value="blood"
                              checked={profile.requestType === "blood"}
                              onChange={() => handleRadioChange("requestType", "blood")}
                              className="form-radio h-5 w-5 text-teal-600"
                              disabled={profileExists && !isEditing}
                            />
                            <span className="ml-2">Blood Product</span>
                          </label>
                        </div>
                      </div>

                      {shouldShowField("organType") && (
                        <div className="space-y-2">
                          <label htmlFor="organType" className="block text-sm font-medium text-gray-700">
                            Organ Type*
                          </label>
                          <select
                            id="organType"
                            name="organType"
                            value={profile.organType}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            required={profile.requestType === "organ"}
                            disabled={profileExists && !isEditing}
                          >
                            <option value="">Select organ</option>
                            <option value="kidney">Kidney</option>
                            <option value="liver">Liver</option>
                            <option value="heart">Heart</option>
                            <option value="lung">Lung</option>
                            <option value="pancreas">Pancreas</option>
                            <option value="intestine">Intestine</option>
                            <option value="cornea">Cornea</option>
                            <option value="bone">Bone</option>
                            <option value="skin">Skin</option>
                            <option value="heart-valves">Heart Valves</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      )}

                      {shouldShowField("bloodProductType") && (
                        <div className="space-y-2">
                          <label htmlFor="bloodProductType" className="block text-sm font-medium text-gray-700">
                            Blood Product Type*
                          </label>
                          <select
                            id="bloodProductType"
                            name="bloodProductType"
                            value={profile.bloodProductType}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            required={profile.requestType === "blood"}
                            disabled={profileExists && !isEditing}
                          >
                            <option value="">Select blood product</option>
                            <option value="whole-blood">Whole Blood</option>
                            <option value="red-cells">Red Blood Cells</option>
                            <option value="platelets">Platelets</option>
                            <option value="plasma">Plasma</option>
                            <option value="cryoprecipitate">Cryoprecipitate</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      )}
                  
                      <div className="space-y-2">
                        <label htmlFor="urgencyLevel" className="block text-sm font-medium text-gray-700">
                          Urgency Level*
                        </label>
                        <select
                          id="urgencyLevel"
                          name="urgencyLevel"
                          value={profile.urgencyLevel}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                          disabled={profileExists && !isEditing}
                        >
                          <option value="normal">Normal</option>
                          <option value="urgent">Urgent</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="requiredQuantity" className="block text-sm font-medium text-gray-700">
                          Required Quantity*
                        </label>
                        <input
                          id="requiredQuantity"
                          name="requiredQuantity"
                          value={profile.requiredQuantity}
                          onChange={handleChange}
                          placeholder="e.g., 1 kidney, 500ml blood"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="requestDate" className="block text-sm font-medium text-gray-700">
                          Request Date*
                        </label>
                        <input
                          id="requestDate"
                          name="requestDate"
                          type="date"
                          value={profile.requestDate}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="estimatedTimeframe" className="block text-sm font-medium text-gray-700">
                          Estimated Timeframe*
                        </label>
                        <input
                          id="estimatedTimeframe"
                          name="estimatedTimeframe"
                          value={profile.estimatedTimeframe}
                          onChange={handleChange}
                          placeholder="e.g., 6 months, 1 year"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label htmlFor="requestReason" className="block text-sm font-medium text-gray-700">
                          Request Reason*
                        </label>
                        <textarea
                          id="requestReason"
                          name="requestReason"
                          value={profile.requestReason}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Explain why you need this organ/blood product"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Medical Information */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="diagnosedCondition" className="block text-sm font-medium text-gray-700">
                          Diagnosed Condition*
                        </label>
                        <input
                          id="diagnosedCondition"
                          name="diagnosedCondition"
                          value={profile.diagnosedCondition}
                          onChange={handleChange}
                          placeholder="e.g., End-stage renal disease"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="diagnosisDate" className="block text-sm font-medium text-gray-700">
                          Diagnosis Date*
                        </label>
                        <input
                          id="diagnosisDate"
                          name="diagnosisDate"
                          type="date"
                          value={profile.diagnosisDate}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="treatingPhysician" className="block text-sm font-medium text-gray-700">
                          Treating Physician*
                        </label>
                        <input
                          id="treatingPhysician"
                          name="treatingPhysician"
                          value={profile.treatingPhysician}
                          onChange={handleChange}
                          placeholder="Dr. John Smith"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="physicianContact" className="block text-sm font-medium text-gray-700">
                          Physician Contact*
                        </label>
                        <input
                          id="physicianContact"
                          name="physicianContact"
                          value={profile.physicianContact}
                          onChange={handleChange}
                          placeholder="Phone number or email"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="diagnosisHospital" className="block text-sm font-medium text-gray-700">
                          Diagnosis Hospital*
                        </label>
                        <input
                          id="diagnosisHospital"
                          name="diagnosisHospital"
                          value={profile.diagnosisHospital}
                          onChange={handleChange}
                          placeholder="Hospital where diagnosed"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700">
                          Medical History*
                        </label>
                        <textarea
                          id="medicalHistory"
                          name="medicalHistory"
                          value={profile.medicalHistory}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Brief medical history relevant to your condition"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                          Allergies*
                        </label>
                        <textarea
                          id="allergies"
                          name="allergies"
                          value={profile.allergies}
                          onChange={handleChange}
                          rows={2}
                          placeholder="List any allergies; enter 'None' if none"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700">
                          Current Medications*
                        </label>
                        <textarea
                          id="currentMedications"
                          name="currentMedications"
                          value={profile.currentMedications}
                          onChange={handleChange}
                          rows={2}
                          placeholder="List current medications; enter 'None' if none"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={profileExists && !isEditing}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Transplant Center */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Transplant Center</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                          Province/State*
                        </label>
                        <select
                          id="state"
                          name="state"
                          value={profile.state}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                          disabled={profileExists && !isEditing}
                        >
                          <option value="">Select Province</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Sindh">Sindh</option>
                          <option value="Balochistan">Balochistan</option>
                          <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                          <option value="Gilgit Baltistan">Gilgit Baltistan</option>
                          <option value="Islamabad">Islamabad Capital Territory</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                          City*
                        </label>
                        <select
                          id="city"
                          name="city"
                          value={profile.city}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                          disabled={(profileExists && !isEditing) || !profile.state || loadingCities}
                        >
                          <option value="">Select City</option>
                          {loadingCities ? (
                            <option value="" disabled>
                              Loading cities...
                            </option>
                          ) : noCitiesFound ? (
                            <option value="" disabled>
                              No cities found with approved hospitals
                            </option>
                          ) : (
                            cities.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))
                          )}
                        </select>
                        {noCitiesFound && (
                          <p className="mt-1 text-sm text-red-600">
                            No cities with approved hospitals found in this province.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <label htmlFor="hospitalAssociation" className="block text-sm font-medium text-gray-700">
                          Hospital/Transplant Center*
                        </label>
                        <select
                          id="hospitalAssociation"
                          name="hospitalAssociation"
                          value={profile.hospitalAssociation}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                          disabled={(profileExists && !isEditing) || !profile.city || loadingHospitals}
                        >
                          <option value="">Select Hospital</option>
                          {loadingHospitals ? (
                            <option value="" disabled>
                              Loading hospitals...
                            </option>
                          ) : noHospitalsFound ? (
                            <option value="" disabled>
                              No hospitals found
                            </option>
                          ) : (
                            hospitals.map((hospital) => (
                              <option key={hospital.userId} value={hospital.name}>
                                {hospital.name}
                              </option>
                            ))
                          )}
                        </select>
                        {noHospitalsFound && (
                          <p className="mt-1 text-sm text-red-600">
                            No approved hospitals found in this city. Please select another city or contact support.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <div className="bg-blue-50 p-4 rounded-md">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">
                            <i className="fas fa-info-circle mr-2"></i>Information
                          </h4>
                          <p className="text-sm text-blue-800">
                            Your selected transplant center will be notified of your request. They will contact you to coordinate your transplant evaluation and waitlist registration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation Buttons */}
          {!showSummary && (
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={goToPreviousStep}
                className={`px-4 py-2 flex items-center text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors ${
                  currentStep === 1 ? "invisible" : ""
                }`}
                disabled={currentStep === 1}
              >
                <i className="fas fa-chevron-left mr-1"></i> Previous
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className={`px-6 py-2 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition-colors flex items-center ${
                    !validateStep(currentStep) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={!validateStep(currentStep)}
                >
                  Next <i className="fas fa-chevron-right ml-1"></i>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className={`px-6 py-2 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition-colors flex items-center ${
                    !validateStep(currentStep) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={!validateStep(currentStep)}
                >
                  Review <i className="fas fa-chevron-right ml-1"></i>
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
