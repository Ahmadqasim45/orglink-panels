"use client"

import { useState, useEffect } from "react"
import { db } from "../../firebase"
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore"
import { auth } from "../../firebase"
import { onAuthStateChanged } from "firebase/auth"

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profileExists, setProfileExists] = useState(false)
  const [originalProfile, setOriginalProfile] = useState(null)
  const [activeTab, setActiveTab] = useState("personal")

  // Location data states
  const [cities, setCities] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingHospitals, setLoadingHospitals] = useState(false)
  const [noCitiesFound, setNoCitiesFound] = useState(false)
  const [noHospitalsFound, setNoHospitalsFound] = useState(false)
  const [hospitalId, setHospitalId] = useState("")

  const [profile, setProfile] = useState({
    // Personal Information
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    occupation: "",
    nationalId: "",

    // Physical Attributes
    weight: "",
    height: "",
    bloodType: "",

    // Medical Information
    lastDonation: "",
    medicalConditions: "",
    allergies: "",
    medications: "",
    surgeries: "",
    chronicDiseases: "",
    familyMedicalHistory: "",
    smoker: "no",
    alcoholConsumption: "none",

    // Donation History & Preferences
    donationHistory: [],
    previousDonations: "",
    preferredDonationCenter: "",
    preferredDonationTime: "",
    preferredContactMethod: "phone",
    willingToTravelDistance: "",
    organDonorConsent: "no",
    donationFrequency: "",
    donationMotivation: "",

    // Eligibility Information
    recentIllness: "no",
    recentVaccination: "no",
    recentTattoo: "no",
    recentPiercing: "no",
    recentPregnancy: "no",
    recentSurgery: "no",
    recentBloodTransfusion: "no",
    travelHistory: "",

    // Emergency Contact
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
      address: "",
    },

    // Additional Information
    additionalNotes: "",
    howDidYouHear: "",
    volunteerInterest: "no",
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
          where("verificationStatus", "==", "Approved"), // Filter for "Approved" status
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
          setProfile((prev) => ({ ...prev, city: "", preferredDonationCenter: "" }))
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
          userId: doc.data().userId, // Fetch the `userId` of the hospital
        }))

        setHospitals(hospitalList)

        // Only reset hospital if editing
        if (isEditing) {
          setProfile((prev) => ({ ...prev, preferredDonationCenter: "" }))
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
      if (!profile.preferredDonationCenter) {
        setHospitalId("")
        return
      }

      const selectedHospital = hospitals.find((h) => h.name === profile.preferredDonationCenter)

      if (selectedHospital) {
        setHospitalId(selectedHospital.userId)
      } else {
        setHospitalId("") // Reset if no hospital found
      }
    }

    fetchHospitalUserId()
  }, [profile.preferredDonationCenter, hospitals])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        fetchDonorProfile(currentUser.uid)
      } else {
        setUser(null)
        setLoading(false)
        // Redirect to login page using regular browser navigation
        window.location.href = "/login"
      }
    })

    return () => unsubscribe()
  }, [])

  const fetchDonorProfile = async (userId) => {
    try {
      const donorsRef = collection(db, "donors")
      const q = query(donorsRef, where("userId", "==", userId))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        // Profile exists - set to view mode
        const donorData = querySnapshot.docs[0].data()

        // Create a merged profile with all possible fields
        const profileData = {
          // Personal Information
          fullName: donorData.fullName || "",
          email: donorData.email || "",
          phone: donorData.phone || "",
          address: donorData.address || "",
          city: donorData.city || "",
          state: donorData.state || "",
          zipCode: donorData.zipCode || "",
          dateOfBirth: donorData.dateOfBirth || "",
          age: donorData.age || "",
          gender: donorData.gender || "",
          occupation: donorData.occupation || "",
          nationalId: donorData.nationalId || "",

          // Physical Attributes
          weight: donorData.weight || "",
          height: donorData.height || "",
          bloodType: donorData.bloodType || "",

          // Medical Information
          lastDonation: donorData.lastDonation || "",
          medicalConditions: donorData.medicalConditions || "",
          allergies: donorData.allergies || "",
          medications: donorData.medications || "",
          surgeries: donorData.surgeries || "",
          chronicDiseases: donorData.chronicDiseases || "",
          familyMedicalHistory: donorData.familyMedicalHistory || "",
          smoker: donorData.smoker || "no",
          alcoholConsumption: donorData.alcoholConsumption || "none",

          // Donation History & Preferences
          donationHistory: donorData.donationHistory || [],
          previousDonations: donorData.previousDonations || "",
          preferredDonationCenter: donorData.preferredDonationCenter || "",
          preferredDonationTime: donorData.preferredDonationTime || "",
          preferredContactMethod: donorData.preferredContactMethod || "phone",
          willingToTravelDistance: donorData.willingToTravelDistance || "",
          organDonorConsent: donorData.organDonorConsent || "no",
          donationFrequency: donorData.donationFrequency || "",
          donationMotivation: donorData.donationMotivation || "",

          // Eligibility Information
          recentIllness: donorData.recentIllness || "no",
          recentVaccination: donorData.recentVaccination || "no",
          recentTattoo: donorData.recentTattoo || "no",
          recentPiercing: donorData.recentPiercing || "no",
          recentPregnancy: donorData.recentPregnancy || "no",
          recentSurgery: donorData.recentSurgery || "no",
          recentBloodTransfusion: donorData.recentBloodTransfusion || "no",
          travelHistory: donorData.travelHistory || "",

          // Emergency Contact
          emergencyContact: donorData.emergencyContact || {
            name: "",
            phone: "",
            relationship: "",
            address: "",
          },

          // Additional Information
          additionalNotes: donorData.additionalNotes || "",
          howDidYouHear: donorData.howDidYouHear || "",
          volunteerInterest: donorData.volunteerInterest || "no",
        }

        setProfile(profileData)
        setOriginalProfile(profileData)
        setProfileExists(true)
        setIsEditing(false) // Set to view mode
      } else {
        // No profile exists - set to create mode
        setProfileExists(false)
        setIsEditing(true) // In create mode, all fields are editable

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
      console.error("Error fetching donor profile:", error)
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

  const handleEmergencyContactChange = (e) => {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value,
      },
    }))
  }

  const handleRadioChange = (name, value) => {
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      const donorsRef = collection(db, "donors")
      const q = query(donorsRef, where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)

      // Include hospitalId in the data to be saved
      const profileData = {
        ...profile,
        hospitalId: hospitalId || "",
        updatedAt: new Date(),
      }

      if (querySnapshot.empty) {
        // Create new donor profile
        const newDonorRef = doc(collection(db, "donors"))
        await setDoc(newDonorRef, {
          ...profileData,
          userId: user.uid,
          createdAt: new Date(),
        })
        console.log("New donor profile created successfully!")
        alert("Your profile has been created successfully!")
        setProfileExists(true)
        setIsEditing(false) // Switch to view mode after creation
      } else {
        // Update existing donor profile
        const donorDoc = querySnapshot.docs[0].ref
        await updateDoc(donorDoc, profileData)
        console.log("Donor profile updated successfully!")
        alert("Your profile has been updated successfully!")
        setIsEditing(false) // Switch to view mode after update
      }

      // Update the original profile after successful save
      setOriginalProfile({ ...profile, hospitalId })
    } catch (error) {
      console.error("Error saving donor profile:", error)
      alert("Failed to save your profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const toggleEditMode = () => {
    if (isEditing) {
      // Cancel editing - revert to original profile
      setProfile({ ...originalProfile })
    }
    setIsEditing(!isEditing)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="header-content">
            <h2 className="card-title">Donor Profile</h2>
            {/* Only show Edit button if profile exists and we're in view mode */}
            {profileExists && !isEditing && (
              <button type="button" className="btn btn-edit" onClick={toggleEditMode}>
                Edit Profile
              </button>
            )}
            {/* Only show Cancel button if we're editing an existing profile */}
            {profileExists && isEditing && (
              <button type="button" className="btn btn-secondary" onClick={toggleEditMode}>
                Cancel
              </button>
            )}
          </div>
          <p className="card-description">
            {!profileExists
              ? "Please complete your donor profile information"
              : isEditing
                ? "Edit your donor information below"
                : "View your donor information and donation history"}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === "personal" ? "active" : ""}`}
            onClick={() => setActiveTab("personal")}
          >
            Personal Info
          </button>
          <button
            className={`tab-button ${activeTab === "medical" ? "active" : ""}`}
            onClick={() => setActiveTab("medical")}
          >
            Medical Info
          </button>
          <button
            className={`tab-button ${activeTab === "donation" ? "active" : ""}`}
            onClick={() => setActiveTab("donation")}
          >
            Donation Preferences
          </button>
          <button
            className={`tab-button ${activeTab === "eligibility" ? "active" : ""}`}
            onClick={() => setActiveTab("eligibility")}
          >
            Eligibility
          </button>
          <button
            className={`tab-button ${activeTab === "emergency" ? "active" : ""}`}
            onClick={() => setActiveTab("emergency")}
          >
            Emergency Contact
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-content">
            {/* Personal Information Tab */}
            {activeTab === "personal" && (
              <div className="section">
                <h3 className="section-title">Personal Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name*</label>
                    <input
                      id="fullName"
                      name="fullName"
                      value={profile.fullName}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email*</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={handleChange}
                      placeholder="john.doe@example.com"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number*</label>
                    <input
                      id="phone"
                      name="phone"
                      value={profile.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 123-4567"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateOfBirth">Date of Birth*</label>
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={handleChange}
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="age">Age*</label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      value={profile.age}
                      onChange={handleChange}
                      placeholder="25"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gender">Gender*</label>
                    <select
                      id="gender"
                      name="gender"
                      value={profile.gender}
                      onChange={handleChange}
                      className="form-control"
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
                  <div className="form-group">
                    <label htmlFor="occupation">Occupation</label>
                    <input
                      id="occupation"
                      name="occupation"
                      value={profile.occupation}
                      onChange={handleChange}
                      placeholder="Software Engineer"
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="nationalId">National ID / Passport</label>
                    <input
                      id="nationalId"
                      name="nationalId"
                      value={profile.nationalId}
                      onChange={handleChange}
                      placeholder="ID Number"
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="address">Address*</label>
                    <input
                      id="address"
                      name="address"
                      value={profile.address}
                      onChange={handleChange}
                      placeholder="123 Main St"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">Province/State*</label>
                    <select
                      id="state"
                      name="state"
                      value={profile.state}
                      onChange={handleChange}
                      className="form-control"
                      required
                      disabled={profileExists && !isEditing}
                    >
                      <option value="">Select Province</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Sindh">Sindh</option>
                      <option value="Balochistan">Balochistan</option>
                      <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                      <option value="Gilgit Baltistan">Gilgit Baltistan</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="city">City*</label>
                    <select
                      id="city"
                      name="city"
                      value={profile.city}
                      onChange={handleChange}
                      className="form-control"
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
                          No cities found
                        </option>
                      ) : (
                        cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="zipCode">Zip/Postal Code*</label>
                    <input
                      id="zipCode"
                      name="zipCode"
                      value={profile.zipCode}
                      onChange={handleChange}
                      placeholder="10001"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                </div>

                <h3 className="section-title mt-4">Physical Attributes</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="weight">Weight (kg)*</label>
                    <input
                      id="weight"
                      name="weight"
                      type="number"
                      value={profile.weight}
                      onChange={handleChange}
                      placeholder="70"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="height">Height (cm)*</label>
                    <input
                      id="height"
                      name="height"
                      type="number"
                      value={profile.height}
                      onChange={handleChange}
                      placeholder="175"
                      required
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bloodType">Blood Type*</label>
                    <select
                      id="bloodType"
                      name="bloodType"
                      value={profile.bloodType}
                      onChange={handleChange}
                      className="form-control"
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

            {/* Medical Information Tab */}
            {activeTab === "medical" && (
              <div className="section">
                <h3 className="section-title">Medical Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="lastDonation">Last Donation Date</label>
                    <input
                      id="lastDonation"
                      name="lastDonation"
                      type="date"
                      value={profile.lastDonation}
                      onChange={handleChange}
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label>Smoker?</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="smoker"
                          checked={profile.smoker === "yes"}
                          onChange={() => handleRadioChange("smoker", "yes")}
                          disabled={profileExists && !isEditing}
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="smoker"
                          checked={profile.smoker === "no"}
                          onChange={() => handleRadioChange("smoker", "no")}
                          disabled={profileExists && !isEditing}
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="alcoholConsumption">Alcohol Consumption</label>
                    <select
                      id="alcoholConsumption"
                      name="alcoholConsumption"
                      value={profile.alcoholConsumption}
                      onChange={handleChange}
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    >
                      <option value="none">None</option>
                      <option value="occasional">Occasional</option>
                      <option value="moderate">Moderate</option>
                      <option value="frequent">Frequent</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="allergies">Allergies*</label>
                    <textarea
                      id="allergies"
                      name="allergies"
                      value={profile.allergies}
                      onChange={handleChange}
                      placeholder="List any allergies you have, or type 'None' if not applicable"
                      className="form-control"
                      rows="2"
                      required
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="medications">Current Medications*</label>
                    <textarea
                      id="medications"
                      name="medications"
                      value={profile.medications}
                      onChange={handleChange}
                      placeholder="List any medications you are currently taking, or type 'None' if not applicable"
                      className="form-control"
                      rows="2"
                      required
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="medicalConditions">Medical Conditions*</label>
                    <textarea
                      id="medicalConditions"
                      name="medicalConditions"
                      value={profile.medicalConditions}
                      onChange={handleChange}
                      placeholder="List any medical conditions that might affect your eligibility to donate, or type 'None' if not applicable"
                      className="form-control"
                      rows="3"
                      required
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="surgeries">Previous Surgeries</label>
                    <textarea
                      id="surgeries"
                      name="surgeries"
                      value={profile.surgeries}
                      onChange={handleChange}
                      placeholder="List any surgeries you've had in the past, or type 'None' if not applicable"
                      className="form-control"
                      rows="2"
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="chronicDiseases">Chronic Diseases</label>
                    <textarea
                      id="chronicDiseases"
                      name="chronicDiseases"
                      value={profile.chronicDiseases}
                      onChange={handleChange}
                      placeholder="List any chronic diseases you have, or type 'None' if not applicable"
                      className="form-control"
                      rows="2"
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="familyMedicalHistory">Family Medical History</label>
                    <textarea
                      id="familyMedicalHistory"
                      name="familyMedicalHistory"
                      value={profile.familyMedicalHistory}
                      onChange={handleChange}
                      placeholder="List any relevant family medical history, or type 'None' if not applicable"
                      className="form-control"
                      rows="2"
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* Donation Preferences Tab */}
            {activeTab === "donation" && (
              <div className="section">
                <h3 className="section-title">Donation Preferences</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="previousDonations">Number of Previous Donations</label>
                    <input
                      id="previousDonations"
                      name="previousDonations"
                      type="number"
                      value={profile.previousDonations}
                      onChange={handleChange}
                      placeholder="0"
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="preferredDonationCenter">Preferred Donation Center</label>
                    <select
                      id="preferredDonationCenter"
                      name="preferredDonationCenter"
                      value={profile.preferredDonationCenter}
                      onChange={handleChange}
                      className="form-control"
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
                  </div>
                  <div className="form-group">
                    <label htmlFor="preferredDonationTime">Preferred Donation Time</label>
                    <select
                      id="preferredDonationTime"
                      name="preferredDonationTime"
                      value={profile.preferredDonationTime}
                      onChange={handleChange}
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    >
                      <option value="">Select preferred time</option>
                      <option value="morning">Morning (8am - 12pm)</option>
                      <option value="afternoon">Afternoon (12pm - 5pm)</option>
                      <option value="evening">Evening (5pm - 8pm)</option>
                      <option value="weekend">Weekends Only</option>
                      <option value="anytime">Anytime</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="preferredContactMethod">Preferred Contact Method</label>
                    <select
                      id="preferredContactMethod"
                      name="preferredContactMethod"
                      value={profile.preferredContactMethod}
                      onChange={handleChange}
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    >
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="willingToTravelDistance">Willing to Travel Distance (km)</label>
                    <input
                      id="willingToTravelDistance"
                      name="willingToTravelDistance"
                      type="number"
                      value={profile.willingToTravelDistance}
                      onChange={handleChange}
                      placeholder="10"
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="donationFrequency">Preferred Donation Frequency</label>
                    <select
                      id="donationFrequency"
                      name="donationFrequency"
                      value={profile.donationFrequency}
                      onChange={handleChange}
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    >
                      <option value="">Select frequency</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Every 3 months</option>
                      <option value="biannually">Every 6 months</option>
                      <option value="annually">Annually</option>
                      <option value="asNeeded">As needed (emergency)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Organ Donor Consent</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="organDonorConsent"
                          checked={profile.organDonorConsent === "yes"}
                          onChange={() => handleRadioChange("organDonorConsent", "yes")}
                          disabled={profileExists && !isEditing}
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="organDonorConsent"
                          checked={profile.organDonorConsent === "no"}
                          onChange={() => handleRadioChange("organDonorConsent", "no")}
                          disabled={profileExists && !isEditing}
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Volunteer Interest</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="volunteerInterest"
                          checked={profile.volunteerInterest === "yes"}
                          onChange={() => handleRadioChange("volunteerInterest", "yes")}
                          disabled={profileExists && !isEditing}
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="volunteerInterest"
                          checked={profile.volunteerInterest === "no"}
                          onChange={() => handleRadioChange("volunteerInterest", "no")}
                          disabled={profileExists && !isEditing}
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="donationMotivation">Motivation for Donating</label>
                    <textarea
                      id="donationMotivation"
                      name="donationMotivation"
                      value={profile.donationMotivation}
                      onChange={handleChange}
                      placeholder="What motivates you to donate blood?"
                      className="form-control"
                      rows="3"
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="howDidYouHear">How did you hear about us?</label>
                    <select
                      id="howDidYouHear"
                      name="howDidYouHear"
                      value={profile.howDidYouHear}
                      onChange={handleChange}
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    >
                      <option value="">Select an option</option>
                      <option value="friend">Friend or Family</option>
                      <option value="social">Social Media</option>
                      <option value="news">News or TV</option>
                      <option value="doctor">Doctor Recommendation</option>
                      <option value="event">Community Event</option>
                      <option value="online">Online Search</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {profileExists && profile.donationHistory.length > 0 && (
                  <div className="mt-4">
                    <h3 className="section-title">Donation History</h3>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Location</th>
                            <th>Type</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.donationHistory.map((donation, index) => (
                            <tr key={index}>
                              <td>{new Date(donation.date.seconds * 1000).toLocaleDateString()}</td>
                              <td>{donation.location}</td>
                              <td>{donation.type}</td>
                              <td>
                                <span
                                  className={`status-badge ${
                                    donation.status === "Completed"
                                      ? "status-completed"
                                      : donation.status === "Scheduled"
                                        ? "status-scheduled"
                                        : "status-pending"
                                  }`}
                                >
                                  {donation.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Eligibility Information Tab */}
            {activeTab === "eligibility" && (
              <div className="section">
                <h3 className="section-title">Eligibility Information</h3>
                <p className="section-description">
                  Please answer the following questions to help determine your eligibility to donate blood.
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Have you been ill in the past 14 days?*</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentIllness"
                          checked={profile.recentIllness === "yes"}
                          onChange={() => handleRadioChange("recentIllness", "yes")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentIllness"
                          checked={profile.recentIllness === "no"}
                          onChange={() => handleRadioChange("recentIllness", "no")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Have you received any vaccinations in the past 4 weeks?*</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentVaccination"
                          checked={profile.recentVaccination === "yes"}
                          onChange={() => handleRadioChange("recentVaccination", "yes")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentVaccination"
                          checked={profile.recentVaccination === "no"}
                          onChange={() => handleRadioChange("recentVaccination", "no")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Have you gotten a tattoo in the past 12 months?*</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentTattoo"
                          checked={profile.recentTattoo === "yes"}
                          onChange={() => handleRadioChange("recentTattoo", "yes")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentTattoo"
                          checked={profile.recentTattoo === "no"}
                          onChange={() => handleRadioChange("recentTattoo", "no")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Have you gotten a piercing in the past 12 months?*</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentPiercing"
                          checked={profile.recentPiercing === "yes"}
                          onChange={() => handleRadioChange("recentPiercing", "yes")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentPiercing"
                          checked={profile.recentPiercing === "no"}
                          onChange={() => handleRadioChange("recentPiercing", "no")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Have you been pregnant in the past 6 weeks?</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentPregnancy"
                          checked={profile.recentPregnancy === "yes"}
                          onChange={() => handleRadioChange("recentPregnancy", "yes")}
                          disabled={profileExists && !isEditing}
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentPregnancy"
                          checked={profile.recentPregnancy === "no"}
                          onChange={() => handleRadioChange("recentPregnancy", "no")}
                          disabled={profileExists && !isEditing}
                        />
                        No
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentPregnancy"
                          checked={profile.recentPregnancy === "na"}
                          onChange={() => handleRadioChange("recentPregnancy", "na")}
                          disabled={profileExists && !isEditing}
                        />
                        N/A
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Have you had surgery in the past 6 months?*</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentSurgery"
                          checked={profile.recentSurgery === "yes"}
                          onChange={() => handleRadioChange("recentSurgery", "yes")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentSurgery"
                          checked={profile.recentSurgery === "no"}
                          onChange={() => handleRadioChange("recentSurgery", "no")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Have you received a blood transfusion in the past 12 months?*</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentBloodTransfusion"
                          checked={profile.recentBloodTransfusion === "yes"}
                          onChange={() => handleRadioChange("recentBloodTransfusion", "yes")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recentBloodTransfusion"
                          checked={profile.recentBloodTransfusion === "no"}
                          onChange={() => handleRadioChange("recentBloodTransfusion", "no")}
                          disabled={profileExists && !isEditing}
                          required
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="travelHistory">Recent Travel History (past 12 months)</label>
                    <textarea
                      id="travelHistory"
                      name="travelHistory"
                      value={profile.travelHistory}
                      onChange={handleChange}
                      placeholder="List any countries you've visited in the past 12 months, or type 'None' if not applicable"
                      className="form-control"
                      rows="3"
                      disabled={profileExists && !isEditing}
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Contact Tab */}
            {activeTab === "emergency" && (
              <div className="section">
                <h3 className="section-title">Emergency Contact</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="emergencyContactName">Name*</label>
                    <input
                      id="emergencyContactName"
                      name="name"
                      value={profile.emergencyContact.name}
                      onChange={handleEmergencyContactChange}
                      placeholder="Jane Doe"
                      className="form-control"
                      required
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyContactPhone">Phone*</label>
                    <input
                      id="emergencyContactPhone"
                      name="phone"
                      value={profile.emergencyContact.phone}
                      onChange={handleEmergencyContactChange}
                      placeholder="+1 (555) 987-6543"
                      className="form-control"
                      required
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyContactRelationship">Relationship*</label>
                    <input
                      id="emergencyContactRelationship"
                      name="relationship"
                      value={profile.emergencyContact.relationship}
                      onChange={handleEmergencyContactChange}
                      placeholder="Spouse, Parent, Friend, etc."
                      className="form-control"
                      required
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="emergencyContactAddress">Address</label>
                    <input
                      id="emergencyContactAddress"
                      name="address"
                      value={profile.emergencyContact.address}
                      onChange={handleEmergencyContactChange}
                      placeholder="Emergency contact's address"
                      className="form-control"
                      disabled={profileExists && !isEditing}
                    />
                  </div>
                </div>

                <div className="form-group full-width mt-4">
                  <label htmlFor="additionalNotes">Additional Notes</label>
                  <textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    value={profile.additionalNotes}
                    onChange={handleChange}
                    placeholder="Any additional information you'd like to provide"
                    className="form-control"
                    rows="3"
                    disabled={profileExists && !isEditing}
                  ></textarea>
                </div>
              </div>
            )}
          </div>
          <div className="card-footer">
            {/* Show Save button when creating a new profile or editing an existing one */}
            {(!profileExists || isEditing) && (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : profileExists ? "Update Profile" : "Create Profile"}
              </button>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          max-width: 900px;
          margin: 0 auto;
        }
        .card-header {
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .card-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .card-description {
          margin: 0;
          color: #666;
        }
        .tab-navigation {
          display: flex;
          overflow-x: auto;
          border-bottom: 1px solid #eee;
          background-color: #f9fafb;
        }
        .tab-button {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #4a5568;
          white-space: nowrap;
        }
        .tab-button:hover {
          background-color: #f1f5f9;
        }
        .tab-button.active {
          color: #3182ce;
          border-bottom: 2px solid #3182ce;
          background-color: white;
        }
        .card-content {
          padding: 1.5rem;
        }
        .card-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
        }
        .section {
          margin-bottom: 2rem;
        }
        .section-title {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          font-weight: 500;
        }
        .section-description {
          margin-bottom: 1rem;
          color: #666;
        }
        .mt-4 {
          margin-top: 1.5rem;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .full-width {
          grid-column: 1 / -1;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .form-control {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          background-color: ${profileExists && !isEditing ? "#f9f9f9" : "white"};
        }
        .form-control:disabled {
          cursor: not-allowed;
          opacity: 0.8;
        }
        textarea.form-control {
          min-height: 80px;
          resize: vertical;
        }
        .radio-group {
          display: flex;
          gap: 1rem;
        }
        .radio-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          cursor: ${profileExists && !isEditing ? "default" : "pointer"};
        }
        .btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          border: none;
          font-weight: 500;
        }
        .btn-primary {
          background-color: #3182ce;
          color: white;
        }
        .btn-primary:hover {
          background-color: #2c5282;
        }
        .btn-edit {
          background-color: #4a5568;
          color: white;
        }
        .btn-edit:hover {
          background-color: #2d3748;
        }
        .btn-secondary {
          background-color: #718096;
          color: white;
        }
        .btn-secondary:hover {
          background-color: #4a5568;
        }
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .table-container {
          overflow-x: auto;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        .table th, .table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .table th {
          background-color: #f9fafb;
          font-weight: 500;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .status-completed {
          background-color: #c6f6d5;
          color: #22543d;
        }
        .status-scheduled {
          background-color: #bee3f8;
          color: #2a4365;
        }
        .status-pending {
          background-color: #feebc8;
          color: #7b341e;
        }
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #3182ce;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

