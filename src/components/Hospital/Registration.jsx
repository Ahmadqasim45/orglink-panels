import React, { useEffect, useState } from "react";
import { db } from "../../firebase.js";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { addUser } from "../../utils/firebaseFunctions.js";
import Loader from "../Loader/index.jsx";

const provinces = [
  "Punjab",
  "Sindh",
  "Balochistan",
  "Khyber Pakhtunkhwa",
  "Gilgit Baltistan",
];

const HospitalRegistration = () => {
  const [formData, setFormData] = useState({
    hospitalName: "",
    address: "",
    contactNumber: "",
    email: "",
    password: "",
    licenseNumber: "",
    doctorName: "",
    doctorSpecialization: "",
    licenseFile: null,
    province: "",
    city: "",
  });

  const [loading, setloading] = useState(true);  // Start loading as true to check user
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const checkSubmission = async () => {
      const user = auth.currentUser;

      if (!user) {
        setloading(false);  // Set loading false if the user is not logged in
        return;
      }

      // Check if user has already submitted
      const hospitalsRef = collection(db, "hospitals");
      const q = query(hospitalsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setHasSubmitted(true);
      }
      setloading(false);  // Set loading false after fetching user data
    };

    checkSubmission();
  }, [auth]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, licenseFile: file });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.hospitalName.trim())
      newErrors.hospitalName = "Hospital name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.contactNumber.trim())
      newErrors.contactNumber = "Contact number is required";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Valid email is required";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    if (formData.password.trim().length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (!formData.licenseNumber.trim())
      newErrors.licenseNumber = "License number is required";
    if (!formData.doctorName.trim())
      newErrors.doctorName = "Doctor name is required";
    if (!formData.doctorSpecialization.trim())
      newErrors.doctorSpecialization = "Doctor specialization is required";
    if (!formData.licenseFile)
      newErrors.licenseFile = "License file is required";
    if (!formData.province) newErrors.province = "Province is required";
    if (!formData.city.trim()) newErrors.city = "City is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      await addUser(formData.email, userCredential.user.uid);
      const fileUrl = await uploadToCloudinary(formData.licenseFile);

       // Create a copy of formData and remove password before storing
    const { password, ...hospitalData } = formData;

      const finalHospitalData  = {
        ...hospitalData,
        licenseFile: fileUrl,
        verificationStatus: "Pending",
        userId: userCredential.user.uid,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "hospitals"), finalHospitalData);
      setSuccessMessage(
        "Hospital registered successfully! Pending verification."
      );
      setFormData({
        hospitalName: "",
        address: "",
        contactNumber: "",
        email: "",
        password: "",
        licenseNumber: "",
        doctorName: "",
        doctorSpecialization: "",
        licenseFile: null,
        province: "",
        city: "",
      });
    } catch (error) {
      setErrors({
        submit:
          error.code === "auth/email-already-in-use"
            ? "This email is already registered."
            : "Failed to register hospital.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="container mt-5">
        <h2 className="text-danger">
          You have already submitted an application.
        </h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container text-center d-flex align-items-center justify-content-center " style={{ height: "500px" }}>
        <Loader />
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Hospital Registration</h2>
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      {errors.submit && (
        <div className="alert alert-danger">{errors.submit}</div>
      )}
      <form onSubmit={handleSubmit} className="row g-3">
        {Object.keys(formData).map((field) => {
          if (field === "licenseFile") {
            return (
              <div className="col-md-6" key={field}>
                <label className="form-label">License File:</label>
                <input
                  type="file"
                  name="licenseFile"
                  onChange={handleFileChange}
                  className="form-control"
                />
                {errors.licenseFile && (
                  <div className="text-danger">{errors.licenseFile}</div>
                )}
              </div>
            );
          }
          if (field === "province") {
            return (
              <div className="col-md-6" key={field}>
                <label className="form-label">Province:</label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="">Select Province</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                {errors.province && (
                  <div className="text-danger">{errors.province}</div>
                )}
              </div>
            );
          }
          return (
            <div className="col-md-6" key={field}>
              <label className="form-label">
                {field
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
                :
              </label>
              <input
                type={
                  field === "email"
                    ? "email"
                    : field === "password"
                    ? "password"
                    : "text"
                }
                name={field}
                value={formData[field]}
                onChange={handleInputChange}
                className="form-control"
              />
              {errors[field] && (
                <div className="text-danger">{errors[field]}</div>
              )}
            </div>
          );
        })}
        <div className="col-12">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Register"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HospitalRegistration;
