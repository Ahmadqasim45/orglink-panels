import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { Tabs, Tab, Table, Button, Modal, Badge } from "react-bootstrap";
// import "bootstrap/dist/css/bootstrap.min.css";
import "./admin.css";

const HospitalList = () => {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [activeTab, setActiveTab] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredHospitals, setFilteredHospitals] = useState([]);
  
  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "hospitals"));
      const hospitalData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHospitals(hospitalData);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedHospital) return;

    try {
      await updateDoc(doc(db, "hospitals", selectedHospital.id), {
        verificationStatus: status,
      });
      fetchHospitals();
      setSelectedHospital(null);
    } catch (error) {
      console.error("Error updating hospital status:", error);
    }
  };

  const getFilteredHospitals = (status) => {
    return hospitals.filter(
      (hospital) => hospital.verificationStatus === status
    );
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Registered Hospitals</h2>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        {/* Pending Tab */}
        <Tab eventKey="Pending" title={`Pending (${getFilteredHospitals("Pending").length})`}>
          {getFilteredHospitals("Pending").length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Hospital Name</th>
                  <th>Email</th>
                  <th>License Number</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredHospitals("Pending").map((hospital) => (
                  <tr key={hospital.id}>
                    <td>{hospital.hospitalName}</td>
                    <td>{hospital.email}</td>
                    <td>{hospital.licenseNumber}</td>
                    <td>
                      <Button
                        variant="info"
                        onClick={() => setSelectedHospital(hospital)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No pending applications.</p>
          )}
        </Tab>

        {/* Approved Tab */}
        <Tab eventKey="Approved" title={`Approved (${getFilteredHospitals("Approved").length})`}>
          {getFilteredHospitals("Approved").length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Hospital Name</th>
                  <th>Email</th>
                  <th>License Number</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredHospitals("Approved").map((hospital) => (
                  <tr key={hospital.id}>
                    <td>{hospital.hospitalName}</td>
                    <td>{hospital.email}</td>
                    <td>{hospital.licenseNumber}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No approved applications.</p>
          )}
        </Tab>

        {/* Rejected Tab */}
        <Tab eventKey="Rejected" title={`Rejected (${getFilteredHospitals("Rejected").length})`}>
          {getFilteredHospitals("Rejected").length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Hospital Name</th>
                  <th>Email</th>
                  <th>License Number</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredHospitals("Rejected").map((hospital) => (
                  <tr key={hospital.id}>
                    <td>{hospital.hospitalName}</td>
                    <td>{hospital.email}</td>
                    <td>{hospital.licenseNumber}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No rejected applications.</p>
          )}
        </Tab>
      </Tabs>

      {/* Modal */}
      {selectedHospital && (
        <Modal show onHide={() => setSelectedHospital(null)}>
          <Modal.Header closeButton>
            <Modal.Title>{selectedHospital.hospitalName}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              <strong>Email:</strong> {selectedHospital.email}
            </p>
            <p>
              <strong>License Number:</strong> {selectedHospital.licenseNumber}
            </p>
            <p>
              <strong>Contact:</strong> {selectedHospital.contactNumber}
            </p>            {selectedHospital.licenseFile && (
              <div className="mt-3">
                <p className="font-medium mb-2">License Document:</p>
                <div className="relative">
                  <img
                    src={selectedHospital.licenseFile}
                    alt="License"
                    className="img-fluid max-w-full rounded border border-gray-200"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="success"
              onClick={() => handleStatusUpdate("Approved")}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => handleStatusUpdate("Rejected")}
            >
              Reject
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default HospitalList;
