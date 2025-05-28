import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
const donorTypes = ["Kidney", "Heart", "Eye", "Leg", "Arm"];

function MedicalForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Basic Information
    donorName: "",
    bloodType: "",
    age: "",
    weight: "",
    height: "",
    bmi: "",

    // Medical History
    medicalHistory: "",
    currentMedications: "",
    surgicalHistory: "",
    allergies: "",
    chronicConditions: "",

    // Additional Health Information
    bloodPressure: "",
    pulseRate: "",
    hemoglobinLevel: "",
    lastDonationDate: "",

    // Lifestyle Information
    smokingStatus: "",
    alcoholConsumption: "",
    exerciseFrequency: "",

    // Medical Conditions (Boolean fields)
    hasHeartDisease: false,
    hasDiabetes: false,
    hasHIV: false,
    hasHepatitis: false,
    hasCancer: false,

    // Contact Information
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },

    province: "",
    city: "",
    hospital: "",
    donorType: "",

    // Additional Notes
    additionalNotes: "",
  });

  const [cities, setCities] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [noCitiesFound, setNoCitiesFound] = useState(false);
  const [noHospitalsFound, setNoHospitalsFound] = useState(false);
  const [hospitalId, setHospitalId] = useState("");
  // Fetch cities when a province is selected
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.province) return;
      setLoadingCities(true);
      setNoCitiesFound(false);
      const hospitalsRef = collection(db, "hospitals");
      const q = query(
        hospitalsRef,
        where("province", "==", formData.province),
        where("verificationStatus", "==", "Approved") // Filter for "Approved" status
      );
      const querySnapshot = await getDocs(q);

      const uniqueCities = new Set();
      querySnapshot.forEach((doc) => {
        uniqueCities.add(doc.data().city);
      });

      const cityList = [...uniqueCities];
      setCities(cityList);
      setHospitals([]); // Reset hospitals when province changes
      setFormData((prev) => ({ ...prev, city: "", hospital: "" })); // Reset city & hospital
      setLoadingCities(false);

      if (cityList.length === 0) {
        setNoCitiesFound(true);
      }
    };

    fetchCities();
  }, [formData.province]);

  // Fetch hospitals when a city is selected
  useEffect(() => {
    const fetchHospitals = async () => {
      if (!formData.city) return;
      setLoadingHospitals(true);
      setNoHospitalsFound(false);
      const hospitalsRef = collection(db, "hospitals");
      const q = query(hospitalsRef, where("city", "==", formData.city));
      const querySnapshot = await getDocs(q);

      const hospitalList = querySnapshot.docs.map((doc) => ({
        name: doc.data().hospitalName,
        userId: doc.data().userId, // Fetch the `userId` of the hospital
      }));

      setHospitals(hospitalList);
      setFormData((prev) => ({ ...prev, hospital: "" })); // Reset hospital
      setLoadingHospitals(false);

      if (hospitalList.length === 0) {
        setNoHospitalsFound(true);
      }
    };

    fetchHospitals();
  }, [formData.city]);

  useEffect(() => {
    const fetchHospitalUserId = async () => {
      if (!formData.hospital) return;

      const selectedHospital = hospitals.find(
        (h) => h.name === formData.hospital
      );
      if (selectedHospital) {
        setHospitalId(selectedHospital.userId);
      } else {
        setHospitalId(""); // Reset if no hospital found
      }
    };

    fetchHospitalUserId();
  }, [formData.hospital]);

  const calculateBMI = () => {
    if (formData.weight && formData.height) {
      const heightInMeters = formData.height / 100;
      const bmi = (formData.weight / (heightInMeters * heightInMeters)).toFixed(
        1
      );
      setFormData((prev) => ({ ...prev, bmi }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!hospitalId) {
        alert("Selected hospital not found. Please try again.");
        return;
      }

      await setDoc(doc(db, "medicalRecords", auth.currentUser.uid), {
        ...formData,
        donorId: auth.currentUser.uid,
        hospitalId,
        status: "pending",
        submittedAt: new Date(),
      });
      toast.success("Medical information submitted successfully!");
      navigate("/donor/dashboard");
    } catch (error) {
      console.error("Error:", error);
      alert("Error submitting medical information");
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   try {
  //     // Log the form data being sent
  //     console.log('Submitting form data:', formData);

  //     const response = await fetch('http://localhost:5000/api/medical-forms', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(formData)
  //     });

  //     // Log the raw response
  //     console.log('Response status:', response.status);

  //     const data = await response.json();
  //     console.log('Response data:', data);

  //     if (!response.ok) {
  //       throw new Error(data.error || 'Failed to submit form');
  //     }

  //     alert('Form submitted successfully!');
  //   } catch (error) {
  //     console.error('Form submission error:', error);
  //     alert(`Error: ${error.message}`);
  //   }
  // };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Medical Information Form</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Blood Type</label>
              <select
                value={formData.bloodType}
                onChange={(e) =>
                  setFormData({ ...formData, bloodType: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Blood Type</option>
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

            <div>
              <label className="block mb-2">Name</label>
              <input
                type="text"
                value={formData.donorName}
                onChange={(e) =>
                  setFormData({ ...formData, donorName: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
                min="18"
                max="65"
              />
            </div>

            <div>
              <label className="block mb-2">Weight (kg)</label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => {
                  setFormData({ ...formData, weight: e.target.value });
                  calculateBMI();
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-2">Height (cm)</label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => {
                  setFormData({ ...formData, height: e.target.value });
                  calculateBMI();
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
        </div>

        {/* Medical History Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Medical History</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Medical History</label>
              <textarea
                value={formData.medicalHistory}
                onChange={(e) =>
                  setFormData({ ...formData, medicalHistory: e.target.value })
                }
                className="w-full p-2 border rounded"
                rows="4"
                required
              />
            </div>

            <div>
              <label className="block mb-2">Current Medications</label>
              <textarea
                value={formData.currentMedications}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentMedications: e.target.value,
                  })
                }
                className="w-full p-2 border rounded"
                rows="3"
              />
            </div>

            <div>
              <label className="block mb-2">Surgical History</label>
              <textarea
                value={formData.surgicalHistory}
                onChange={(e) =>
                  setFormData({ ...formData, surgicalHistory: e.target.value })
                }
                className="w-full p-2 border rounded"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Medical Conditions Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Medical Conditions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["Heart Disease", "Diabetes", "HIV", "Hepatitis", "Cancer"].map(
              (condition) => {
                const key = `has${condition.replace(/\s+/g, "")}`;
                return (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={key}
                      checked={formData[key]}
                      onChange={(e) =>
                        setFormData({ ...formData, [key]: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <label htmlFor={key}>{condition}</label>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Name</label>
              <input
                type="text"
                value={formData.emergencyContact.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: {
                      ...formData.emergencyContact,
                      name: e.target.value,
                    },
                  })
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-2">Relationship</label>
              <input
                type="text"
                value={formData.emergencyContact.relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: {
                      ...formData.emergencyContact,
                      relationship: e.target.value,
                    },
                  })
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: {
                      ...formData.emergencyContact,
                      phone: e.target.value,
                    },
                  })
                }
                className="w-full p-2 border rounded"
                pattern="[0-9]{10}"
                required
              />
            </div>
          </div>
        </div>

        {/* Health Measurements Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Health Measurements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Blood Pressure (mmHg)</label>
              <input
                type="text"
                value={formData.bloodPressure}
                onChange={(e) =>
                  setFormData({ ...formData, bloodPressure: e.target.value })
                }
                className="w-full p-2 border rounded"
                placeholder="120/80"
                required
              />
            </div>

            <div>
              <label className="block mb-2">Pulse Rate (bpm)</label>
              <input
                type="number"
                value={formData.pulseRate}
                onChange={(e) =>
                  setFormData({ ...formData, pulseRate: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-2">Hemoglobin Level (g/dL)</label>
              <input
                type="number"
                step="0.1"
                value={formData.hemoglobinLevel}
                onChange={(e) =>
                  setFormData({ ...formData, hemoglobinLevel: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-2">Last Donation Date</label>
              <input
                type="date"
                value={formData.lastDonationDate}
                onChange={(e) =>
                  setFormData({ ...formData, lastDonationDate: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Lifestyle Information Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Lifestyle Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Smoking Status</label>
              <select
                value={formData.smokingStatus}
                onChange={(e) =>
                  setFormData({ ...formData, smokingStatus: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Status</option>
                <option value="never">Never Smoked</option>
                <option value="former">Former Smoker</option>
                <option value="current">Current Smoker</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">Alcohol Consumption</label>
              <select
                value={formData.alcoholConsumption}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    alcoholConsumption: e.target.value,
                  })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Frequency</option>
                <option value="never">Never</option>
                <option value="occasional">Occasional</option>
                <option value="regular">Regular</option>
                <option value="frequent">Frequent</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">Exercise Frequency</label>
              <select
                value={formData.exerciseFrequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exerciseFrequency: e.target.value,
                  })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Frequency</option>
                <option value="never">Never</option>
                <option value="occasional">1-2 times/week</option>
                <option value="regular">3-4 times/week</option>
                <option value="frequent">5+ times/week</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">
            Residential Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Select Province</label>
              <select
                value={formData.province}
                onChange={(e) =>
                  setFormData({ ...formData, province: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Province</option>
                <option value="Punjab">Punjab</option>
                <option value="Sindh">Sindh</option>
                <option value="Balochistan">Balochistan</option>
                <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                <option value="Gilgit Baltistan">Gilgit Baltistan</option>
              </select>
            </div>

            {/* City Selection */}
            <div>
              <label className="block mb-2">Select City</label>
              <select
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
                disabled={!formData.province || loadingCities}
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Hospital Selection */}
            <div>
              <label className="block mb-2">Select Hospital</label>
              <select
                value={formData.hospital}
                onChange={(e) =>
                  setFormData({ ...formData, hospital: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
                disabled={!formData.city || loadingHospitals}
              >
                <option value="">Select Hospital</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.userId} value={hospital.name}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type of Donor */}
            <div>
              <label className="block mb-2">Type of Donor</label>
              <select
                value={formData.donorType}
                onChange={(e) =>
                  setFormData({ ...formData, donorType: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Type of Donation</option>
                {donorTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Additional Notes Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Additional Notes</h3>
          <div>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) =>
                setFormData({ ...formData, additionalNotes: e.target.value })
              }
              className="w-full p-2 border rounded"
              rows="4"
              placeholder="Any additional information you'd like to share..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 transition-colors"
          >
            Submit Medical Information
          </button>
        </div>
      </form>
    </div>
  );
}

export default MedicalForm;
