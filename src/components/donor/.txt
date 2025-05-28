import React, { useState } from "react";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";

function MedicalForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Basic Information
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

    // Additional Notes
    additionalNotes: "",
  });

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
      await setDoc(doc(db, "medicalRecords", auth.currentUser.uid), {
        ...formData,
        donorId: auth.currentUser.uid,
        status: "pending",
        submittedAt: new Date(),
      });
      alert("Medical information submitted successfully!");
      navigate("/donor/dashboard");
    } catch (error) {
      console.error("Error:", error);
      alert("Error submitting medical information");
    }
  };

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
