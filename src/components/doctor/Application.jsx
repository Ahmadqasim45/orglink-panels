import React, { useState, useEffect } from "react";
import { db } from "../../firebase.js";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { uploadToCloudinary } from "../../utils/cloudinary.js";
import Loader from "../Loader/index.jsx";

const HospitalApplications = () => {
  const [hospitalData, setHospitalData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = getAuth();

  // Fetch hospital data
  useEffect(() => {
    const fetchHospitalData = async () => {
      if (auth.currentUser) {
        const q = query(
          collection(db, "hospitals"),
          where("userId", "==", auth.currentUser.uid)
        );

        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            setHospitalData({ id: doc.id, ...doc.data() });
          }
        } catch (error) {
          console.error("Error fetching hospital data:", error);
        }
      }
    };

    fetchHospitalData();
  }, [auth.currentUser]);

  const handleEditClick = () => {
    setEditFormData({
      ...hospitalData,
      newLicenseFile: null,
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditFormData((prev) => ({
        ...prev,
        newLicenseFile: file,
      }));
    }
  };

  const handleDeleteFile = () => {
    setEditFormData((prev) => ({
      ...prev,
      licenseFile: null,
      newLicenseFile: null,
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      "hospitalName",
      "address",
      "contactNumber",
      "licenseNumber",
      "doctorName",
      "doctorSpecialization",
    ];

    requiredFields.forEach((field) => {
      if (!editFormData[field]?.trim()) {
        newErrors[field] = `${field
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())} is required`;
      }
    });

    if (!editFormData.licenseFile && !editFormData.newLicenseFile) {
      newErrors.licenseFile = "License file is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      let fileUrl = editFormData.licenseFile;

      // Handle new file upload if exists
      if (editFormData.newLicenseFile) {
        fileUrl = await uploadToCloudinary(editFormData.newLicenseFile);
      }

      const updateData = {
        hospitalName: editFormData.hospitalName,
        address: editFormData.address,
        contactNumber: editFormData.contactNumber,
        licenseNumber: editFormData.licenseNumber,
        doctorName: editFormData.doctorName,
        doctorSpecialization: editFormData.doctorSpecialization,
        licenseFile: fileUrl,
        updatedAt: new Date().toISOString(),
      };

      const docRef = doc(db, "hospitals", hospitalData.id);
      await updateDoc(docRef, updateData);

      setHospitalData((prev) => ({
        ...prev,
        ...updateData,
      }));
      setSuccessMessage("Application updated successfully!");
      setShowModal(false);
    } catch (error) {
      console.error("Error updating hospital:", error);
      setErrors({ submit: "Failed to update application. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hospitalData) {
    return (
      <div
        className="container text-center d-flex align-items-center justify-content-center "
        style={{ height: "500px" }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Hospital Application Status</h2>
      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Application Details</h5>
          <div className="mb-3">
            <strong>Status: </strong>
            <span
              className={`badge bg-${
                hospitalData.verificationStatus === "Pending"
                  ? "warning"
                  : "success"
              }`}
            >
              {hospitalData.verificationStatus}
            </span>
          </div>

          <div className="row">
            <div className="col-md-6">
              <p>
                <strong>Hospital Name:</strong> {hospitalData.hospitalName}
              </p>
              <p>
                <strong>Email:</strong> {hospitalData.email}
              </p>
              <p>
                <strong>Contact Number:</strong> {hospitalData.contactNumber}
              </p>
              <p>
                <strong>Address:</strong> {hospitalData.address}
              </p>
            </div>
            <div className="col-md-6">
              <p>
                <strong>License Number:</strong> {hospitalData.licenseNumber}
              </p>
              <p>
                <strong>Doctor Name:</strong> {hospitalData.doctorName}
              </p>
              <p>
                <strong>Specialization:</strong>{" "}
                {hospitalData.doctorSpecialization}
              </p>
              <p>
                <strong>License File:</strong>{" "}
                <a
                  href={hospitalData.licenseFile}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View File
                </a>
              </p>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleEditClick}
            disabled={hospitalData.verificationStatus !== "Pending"}
          >
            Edit Application
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <div
        className={`modal fade ${showModal ? "show" : ""}`}
        style={{ display: showModal ? "block" : "none" }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Application</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {errors.submit && (
                  <div className="alert alert-danger">{errors.submit}</div>
                )}

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Hospital Name:</label>
                    <input
                      type="text"
                      name="hospitalName"
                      value={editFormData?.hospitalName || ""}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                    {errors.hospitalName && (
                      <div className="text-danger">{errors.hospitalName}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email:</label>
                    <input
                      type="email"
                      value={editFormData?.email || ""}
                      className="form-control"
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Contact Number:</label>
                    <input
                      type="text"
                      name="contactNumber"
                      value={editFormData?.contactNumber || ""}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                    {errors.contactNumber && (
                      <div className="text-danger">{errors.contactNumber}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">License Number:</label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={editFormData?.licenseNumber || ""}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                    {errors.licenseNumber && (
                      <div className="text-danger">{errors.licenseNumber}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Doctor Name:</label>
                    <input
                      type="text"
                      name="doctorName"
                      value={editFormData?.doctorName || ""}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                    {errors.doctorName && (
                      <div className="text-danger">{errors.doctorName}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Doctor Specialization:</label>
                    <input
                      type="text"
                      name="doctorSpecialization"
                      value={editFormData?.doctorSpecialization || ""}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                    {errors.doctorSpecialization && (
                      <div className="text-danger">
                        {errors.doctorSpecialization}
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label">License File:</label>
                    {editFormData?.licenseFile &&
                    !editFormData?.newLicenseFile ? (
                      <div className="d-flex align-items-center gap-2">
                        <a
                          href={editFormData.licenseFile}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Current File
                        </a>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={handleDeleteFile}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="form-control"
                      />
                    )}
                    {errors.licenseFile && (
                      <div className="text-danger">{errors.licenseFile}</div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary me-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Updating..." : "Update Application"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default HospitalApplications;
