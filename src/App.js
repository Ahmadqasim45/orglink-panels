import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import {UserProvider} from './contexts/UserContext'
import PrivateRoute from "./components/PrivateRoute"
import Navbar from "./components/Navbar"
import Login from "./components/Login"
import Register from "./components/Register"

// Donor Imports
import DonorDashboard from "./components/donor/Dashboard"
import Profile from "./components/donor/Profile"
import DonorMedicalForm from "./components/donor/medicalForm"
import DonorAppointmentView from "./components/donor/DonorAppointmentView"
      
// Doctor Imports
import DoctorDashboard from "./components/doctor/Dashboard"
import HospitalApplications from "./components/doctor/Application"
import StaffDashboard from "./components/doctor/StaffDashboard"

// Admin Imports
import AdminDashboard from "./components/admin/Dashboard"
import DoctorManagement from "./components/admin/DoctorManagement"
import DonorManagement from "./components/admin/DonorManagement"
import MedicalDocumentReview from "./components/admin/MedicalDocumentReview"



// Recipient Imports
import RecipientDashboard from "./components/recipient/Dashboard"
import TestResults from "./components/recipient/Testresult"
import WaitingListStatus from "./components/recipient/waitinglist-status"
import RecipientAppointmentView from "./components/recipient/RecipientAppointmentView.jsx"

// Appointment Imports
import AppointmentDashboard from "./components/appointments/AppointmentDashboard"

// Page Imports
import BecomeHospital from "./Pages/BecomeHospital"
import NotFoundPage from "./Pages/NotFoundPage"
import Home from "./Pages/Home"
import RecipientProfile from "./components/recipient/CompleteProfile"
import RecipientManagement from "./components/admin/RecipientManagement"



function App() {
  return (
    <UserProvider>
      <Router>
        <Navbar />
        <Routes>          {/* Common Routes */}
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/" element={<Home />} />          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-as-hospital" element={<BecomeHospital />} />

          {/* Donor Routes */}
          <Route
            path="/donor/dashboard"
            element={
              <PrivateRoute role="donor">
                <DonorDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/donor/profile"
            element={
              <PrivateRoute role="donor">
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/donor/medical-form"
            element={
              <PrivateRoute role="donor">
                <DonorMedicalForm />
              </PrivateRoute>
            }
          />          <Route
            path="/donor/appointments"
            element={
              <PrivateRoute role="donor">
                <DonorAppointmentView />
              </PrivateRoute>
            }
          />      

          {/* Doctor Routes */}
          <Route
            path="/doctor/dashboard"
            element={
              <PrivateRoute role="doctor">
                <DoctorDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/doctor/applications"
            element={
              <PrivateRoute role="doctor">
                <HospitalApplications />
              </PrivateRoute>
            }
          />          <Route
            path="/doctor/appointments"
            element={
              <PrivateRoute role="doctor">
                <StaffDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/doctor/donor-document/:appointmentId"
            element={
              <PrivateRoute role="doctor">
                <StaffDashboard />
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/doctor-management"
            element={
              <PrivateRoute role="admin">
                <DoctorManagement />
              </PrivateRoute>
            }
          />          <Route
            path="/admin/donor-management"
            element={
              <PrivateRoute role="admin">
                <DonorManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/recipient-management"
            element={
              <PrivateRoute role="admin">
                <RecipientManagement />
              </PrivateRoute>
            }
          />
        

          {/* Recipient Routes */}
          <Route
            path="/recipient/dashboard"
            element={
              <PrivateRoute role="recipient">
                <RecipientDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/recipient/profile"
            element={
              <PrivateRoute role="recipient">
                <RecipientProfile />
              </PrivateRoute>
            }
          />          
          <Route
            path="/recipient/test-results"
            element={
              <PrivateRoute role="recipient">
                <TestResults />
              </PrivateRoute>
            }
          />
          <Route
            path="/recipient/waiting-list"
            element={
              <PrivateRoute role="recipient">
                <WaitingListStatus />
              </PrivateRoute>
            }
          />          <Route
            path="/recipient/appointments"
            element={
              <PrivateRoute role="recipient">
                <RecipientAppointmentView />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </UserProvider>
  )
}

export default App