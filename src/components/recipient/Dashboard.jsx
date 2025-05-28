"use client"

// Update the first import line
import React, { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import { UserContext } from "../../contexts/UserContext"
import { db } from "../../firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import {
  FaUserCircle,
  FaClipboardList,
  FaCalendarAlt,
  FaFileMedical,
  FaHeartbeat,
  FaHospital,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa"

// Helper function to safely format appointment dates
const formatAppointmentDate = (date) => {
  try {
    if (!date) return "Unknown date";
    
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    } else if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    } else if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString();
    }
    
    return "Invalid date format";
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date error";
  }
};

function RecipientDashboard() {
  const { user } = useContext(UserContext)
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [appointments, setAppointments] = useState([])
  const [stats, setStats] = useState({
    waitTime: "N/A",
    matchProgress: 0,
    healthScore: "N/A",
    compatibilityMatches: 0,
  })
  const [loading, setLoading] = useState(true)
  const [profileStatus, setProfileStatus] = useState({
    isComplete: false,
    missingFields: [],
  })

  useEffect(() => {
    const fetchRecipientData = async () => {
      if (!user) return

      try {
        // Fetch recipient profile
        const recipientsRef = collection(db, "recipients")
        const q = query(recipientsRef, where("userId", "==", user.uid))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const profileData = querySnapshot.docs[0].data()
          setProfile(profileData)

          // Check profile completeness
          checkProfileCompleteness(profileData)
        }

        // Fetch organ requests
        const requestsQuery = query(collection(db, "organRequests"), where("recipientId", "==", user.uid))
        const requestsSnap = await getDocs(requestsQuery)
        const requestsData = requestsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setRequests(requestsData)

        // Fetch appointments
        const appointmentsQuery = query(collection(db, "appointments"), where("recipientId", "==", user.uid))
        const appointmentsSnap = await getDocs(appointmentsQuery)
        const appointmentsData = appointmentsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAppointments(appointmentsData)

        // Set mock stats data (in real app, this would come from the database)
        if (requestsData.length > 0) {
          setStats({
            waitTime: "3 months",
            matchProgress: 65,
            healthScore: "Good",
            compatibilityMatches: 2,
          })
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching recipient data:", error)
        setLoading(false)
      }
    }

    fetchRecipientData()
  }, [user])

  // Check if profile is complete and identify missing fields
  const checkProfileCompleteness = (profileData) => {
    const requiredFields = [
      { name: "fullName", label: "Full Name" },
      { name: "email", label: "Email" },
      { name: "phone", label: "Phone Number" },
      { name: "address", label: "Address" },
      { name: "city", label: "City" },
      { name: "state", label: "State/Province" },
      { name: "zipCode", label: "Zip/Postal Code" },
      { name: "dateOfBirth", label: "Date of Birth" },
      { name: "gender", label: "Gender" },
      { name: "bloodType", label: "Blood Type" },
      { name: "nationalId", label: "National ID" },
      { name: "diagnosedCondition", label: "Medical Condition" },
      { name: "hospitalAssociation", label: "Hospital" },
    ]

    const missing = requiredFields.filter((field) => !profileData[field.name] || profileData[field.name] === "")

    setProfileStatus({
      isComplete: missing.length === 0,
      missingFields: missing,
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-[#973131] rounded-full animate-spin"></div>
          <div className="mt-4 text-[#973131] font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  // Get active request
  const activeRequest = requests.find((req) => ["Pending", "Approved", "In Progress", "Matched"].includes(req.status))

  // Get upcoming appointment
  const upcomingAppointment = appointments.find(
    (app) => app.status === "Confirmed" && new Date(app.date.toDate()) > new Date(),
  )

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header with cleaner design */}
        <header className="mb-6 bg-white rounded-lg shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#973131] mb-1">Recipient Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back{profile?.fullName ? `, ${profile.fullName}` : ""}! Monitor your organ requests and health
                status
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              {profileStatus.isComplete ? (
                <div className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-md text-sm">
                  <FaCheckCircle className="mr-2 text-xs" />
                  <span>Profile Complete</span>
                </div>
              ) : (
                <Link
                  to="/recipient/profile"
                  className="flex items-center bg-yellow-50 text-yellow-700 px-3 py-1.5 text-sm rounded-md hover:bg-yellow-100 transition-colors"
                >
                  <FaExclamationTriangle className="mr-2 text-xs" />
                  <span>Complete Profile</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Profile Alert with improved layout */}
        {!profileStatus.isComplete && (
          <div className="bg-white border-l-4 border-yellow-400 p-4 mb-6 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="flex-shrink-0 bg-yellow-100 rounded-full p-1.5">
                  <FaExclamationTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-800 text-base">Profile Incomplete</p>
                  <p className="text-sm text-gray-600 mt-0.5">Please complete your profile to access all features.</p>
                </div>
              </div>

              {profileStatus.missingFields.length > 0 && (
                <div className="md:ml-auto mt-4 md:mt-0">
                  <div className="bg-gray-50 rounded-md p-2 text-sm">
                    <p className="font-medium text-gray-700 mb-1">Missing information:</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {profileStatus.missingFields.slice(0, 3).map((field, index) => (
                        <li key={index} className="flex items-center">
                          <span className="mr-1.5">•</span> {field.label}
                        </li>
                      ))}
                      {profileStatus.missingFields.length > 3 && (
                        <li className="flex items-center">
                          <span className="mr-1.5">•</span> And {profileStatus.missingFields.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <Link
                to="/recipient/profile"
                className="mt-4 md:mt-0 md:ml-4 inline-flex items-center px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors shadow-sm"
              >
                Complete Profile
                <svg className="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Status Summary with cleaner design */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <FaClipboardList className="mr-2 text-[#973131]" />
            Organ Request Status
          </h2>

          {activeRequest ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-md border border-gray-100">
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Request</span>
                <p className="font-medium text-gray-800">{activeRequest.organType} Transplant</p>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-md border border-gray-100">
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Status</span>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    activeRequest.status === "Approved"
                      ? "bg-green-100 text-green-800"
                      : activeRequest.status === "Pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : activeRequest.status === "Matched"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {activeRequest.status}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-md border border-gray-100">
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Waiting since</span>
                <p className="font-medium text-gray-800">
                  {activeRequest.createdAt?.toDate().toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-md border border-gray-100 flex items-center">
                <Link
                  to={`/recipient/request-details/${activeRequest.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center group"
                >
                  View details
                  <svg
                    className="ml-1 h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-md text-center border border-gray-100">
              <div className="inline-block p-2.5 bg-gray-100 rounded-full mb-2.5">
                <FaClipboardList size={20} className="text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm mb-3.5">You don't have any active organ requests</p>
              <Link
                to="/recipient/request-organ"
                className="inline-flex items-center bg-[#973131] text-white px-3.5 py-1.5 text-sm rounded-md hover:bg-opacity-90 transition-all duration-300"
              >
                <svg className="h-3.5 w-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Start a new request
              </Link>
            </div>
          )}
        </div>

        {/* Dashboard Cards with section title */}
        <div className="mb-6">
          <h2 className="text-base font-medium text-gray-700 mb-3 px-1">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DashboardCard
              title="My Profile"
              icon={<FaUserCircle size={18} />}
              linkTo="/recipient/profile"
              status={profileStatus.isComplete ? "Complete" : "Incomplete"}
              statusColor={profileStatus.isComplete ? "text-green-600" : "text-red-600"}
              color="from-pink-50 to-red-50"
              hoverColor="group-hover:from-pink-100 group-hover:to-red-100"
            />

            <DashboardCard
              title="Organ Requests"
              icon={<FaClipboardList size={18} />}
              linkTo="/recipient/request-organ"
              status={activeRequest ? activeRequest.status : "No requests"}
              statusColor={
                activeRequest
                  ? activeRequest.status === "Approved"
                    ? "text-green-600"
                    : activeRequest.status === "Pending"
                      ? "text-yellow-600"
                      : activeRequest.status === "Matched"
                        ? "text-blue-600"
                        : "text-gray-600"
                  : "text-gray-600"
              }
              color="from-yellow-50 to-amber-50"
              hoverColor="group-hover:from-yellow-100 group-hover:to-amber-100"
            />

            <DashboardCard
              title="Medical Documents"
              icon={<FaFileMedical size={18} />}
              linkTo="/recipient/medical-documents"
              status={profile?.documentsUploaded ? "Uploaded" : "Needed"}
              statusColor={profile?.documentsUploaded ? "text-green-600" : "text-red-600"}
              color="from-blue-50 to-indigo-50"
              hoverColor="group-hover:from-blue-100 group-hover:to-indigo-100"
            />

            <DashboardCard
              title="Appointments"
              icon={<FaCalendarAlt size={18} />}
              linkTo="/recipient/appointments"              status={
                upcomingAppointment
                  ? `Next: ${formatAppointmentDate(upcomingAppointment.date)}`
                  : "No upcoming"
              }
              statusColor={upcomingAppointment ? "text-blue-600" : "text-gray-600"}
              color="from-green-50 to-emerald-50"
              hoverColor="group-hover:from-green-100 group-hover:to-emerald-100"
            />
          </div>
        </div>

        {/* Rest of your dashboard with updated styling... */}
        {/* Continue with similar improvements for other sections */}
      </div>
    </div>
  )
}

// View for incomplete profile
function IncompleteProfileView({ profileStatus }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center">
      <div className="max-w-3xl mx-auto">
        <div className="inline-block p-6 bg-yellow-50 rounded-full mb-6">
          <FaUserCircle size={64} className="text-yellow-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">Complete Your Profile to Get Started</h2>
        <p className="text-gray-600 mb-8 text-lg">
          Your profile is incomplete. Please provide all required information to access the full features of the
          recipient dashboard.
        </p>

        {profileStatus.missingFields.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Missing Information:</h3>
            <ul className="text-left space-y-2">
              {profileStatus.missingFields.map((field, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  {field.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
          <Link
            to="/recipient/profile"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#973131] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <FaUserCircle className="mr-2" />
            Complete Your Profile
          </Link>

          <Link
            to="/recipient/help"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300"
          >
            <FaHospital className="mr-2" />
            Need Help?
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature Card 1 - Request Organs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            {/* Top colored accent bar */}
            <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-500"></div>
            
            <div className="p-6">
              {/* Icon with enhanced styling */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 mb-4 group-hover:bg-blue-100 transition-colors duration-300">
                <FaClipboardList size={22} className="text-blue-500" />
              </div>
              
              {/* Improved heading with better typography */}
              <h3 className="text-base font-semibold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                Request Organs
              </h3>
              
              {/* Description with better spacing */}
              <p className="text-sm text-gray-600 leading-relaxed">
                Complete your profile to request organ transplants and join the waiting list.
              </p>
              
              {/* Subtle card footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <span className="text-xs text-blue-500 font-medium flex items-center">
                  Learn more
                  <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              </div>
            </div>
          </div>          {/* Feature Card 2 - View Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            {/* Top colored accent bar */}
            <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
            
            <div className="p-6">
              {/* Icon with enhanced styling */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-50 mb-4 group-hover:bg-green-100 transition-colors duration-300">
                <FaCalendarAlt size={22} className="text-green-500" />
              </div>
              
              {/* Improved heading with better typography */}
              <h3 className="text-base font-semibold text-gray-800 mb-3 group-hover:text-green-600 transition-colors duration-300">
                My Appointments
              </h3>
              
              {/* Description with better spacing */}
              <p className="text-sm text-gray-600 leading-relaxed">
                View your medical appointments with specialists for evaluations and check-ups.
              </p>
              
              {/* Subtle card footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <span className="text-xs text-green-500 font-medium flex items-center">
                  Learn more
                  <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Feature Card 3 - Track Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            {/* Top colored accent bar */}
            <div className="h-2 bg-gradient-to-r from-purple-400 to-indigo-500"></div>
            
            <div className="p-6">
              {/* Icon with enhanced styling */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-50 mb-4 group-hover:bg-purple-100 transition-colors duration-300">
                <FaHeartbeat size={22} className="text-purple-500" />
              </div>
              
              {/* Improved heading with better typography */}
              <h3 className="text-base font-semibold text-gray-800 mb-3 group-hover:text-purple-600 transition-colors duration-300">
                Track Progress
              </h3>
              
              {/* Description with better spacing */}
              <p className="text-sm text-gray-600 leading-relaxed">
                Monitor your transplant journey with real-time updates and notifications.
              </p>
              
              {/* Subtle card footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <span className="text-xs text-purple-500 font-medium flex items-center">
                  Learn more
                  <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Completely redesigned DashboardCard component with better layout and typography
function DashboardCard({ title, icon, linkTo, status, statusColor, color, hoverColor }) {
  return (
    <Link
      to={linkTo}
      className="group block bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden"
    >
      {/* Subtle accent bar at the top */}
      <div className={`h-1 w-full bg-gradient-to-r ${color.replace('from-', 'from-').replace('to-', 'to-')}`}></div>
      
      <div className="p-4">
        {/* Icon with gentle background */}
        <div className="flex items-center mb-3">
          <div className={`p-2 rounded-md ${color.replace('from-', 'bg-').split(' ')[0]} bg-opacity-20`}>
            {/* Render icon directly with custom className */}
            <span className={`text-${color.split('-')[1]}-600 text-lg`}>
              {icon}
            </span>
          </div>
          
          {/* Title with appropriate size */}
          <h3 className="ml-3 font-medium text-gray-700 text-sm">
            {title}
          </h3>
          
          {/* Arrow icon positioned right */}
          <div className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
        
        {/* Status indicator with cleaner design */}
        <div className="flex items-center mt-1">
          <div className={`w-2 h-2 rounded-full ${statusColor.replace('text-', 'bg-')}`}></div>
          <p className={`text-xs ${statusColor} ml-2 font-medium tracking-wide`}>
            {status}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Beautiful TransplantProgressSection with enhanced UI
function TransplantProgressSection({ activeRequest, stats }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="bg-gradient-to-r from-red-50 to-white p-5 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[#973131] flex items-center">
            <FaHeartbeat className="mr-2" />
            Transplant Progress
          </h2>
          <Link
            to="/recipient/transplant-progress"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium flex items-center group"
          >
            Full Details
            <svg
              className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {activeRequest ? (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Wait Time Card */}
            <div className="bg-gradient-to-br from-white to-amber-50 p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="ml-2 text-lg font-medium text-gray-800">Wait Time</h3>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.waitTime}</p>
              <p className="text-sm text-gray-500 mt-1">Average for this organ type: 4-6 months</p>
            </div>

            {/* Match Progress Card */}
            <div className="bg-gradient-to-br from-white to-blue-50 p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="ml-2 text-lg font-medium text-gray-800">Match Progress</h3>
              </div>
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-blue-100">
                  <div
                    style={{ width: `${stats.matchProgress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                  ></div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-blue-600 font-medium">{stats.matchProgress}% Complete</span>
                  <span className="text-xs text-gray-500">Target: 100%</span>
                </div>
              </div>
            </div>

            {/* Health Score Card */}
            <div className="bg-gradient-to-br from-white to-green-50 p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="ml-2 text-lg font-medium text-gray-800">Health Score</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.healthScore}</p>
              <p className="text-sm text-gray-500 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            {/* Compatibility Card */}
            <div className="bg-gradient-to-br from-white to-purple-50 p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="ml-2 text-lg font-medium text-gray-800">Compatibility</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.compatibilityMatches}</p>
              <p className="text-sm text-gray-500 mt-1">Potential donor matches found</p>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Transplant Timeline</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-0 ml-6 w-0.5 h-full bg-gray-200"></div>

              {/* Timeline items */}
              <div className="space-y-8 relative">
                {/* First item */}
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 shadow-md z-10">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="w-0.5 h-full bg-gray-200"></div>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-base font-medium text-gray-900">Request Submitted</h4>
                      <span className="text-xs text-gray-500">
                        {activeRequest.createdAt?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Your request for {activeRequest.organType} transplant has been submitted and is being reviewed.
                    </p>
                  </div>
                </div>

                {/* Second item */}
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md z-10 ${
                        activeRequest.status === "Approved" ||
                        activeRequest.status === "In Progress" ||
                        activeRequest.status === "Matched"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="w-0.5 h-full bg-gray-200"></div>
                  </div>
                  <div
                    className={`rounded-lg border p-4 flex-1 ${
                      activeRequest.status === "Approved" ||
                      activeRequest.status === "In Progress" ||
                      activeRequest.status === "Matched"
                        ? "bg-white border-gray-100 shadow-sm"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-base font-medium text-gray-900">Medical Evaluation</h4>
                      <span className="text-xs text-gray-500">
                        {activeRequest.status === "Approved" ||
                        activeRequest.status === "In Progress" ||
                        activeRequest.status === "Matched"
                          ? new Date(
                              activeRequest.createdAt?.toDate().getTime() + 7 * 24 * 60 * 60 * 1000,
                            ).toLocaleDateString()
                          : "Pending"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Medical team evaluates your request and confirms eligibility.
                    </p>
                  </div>
                </div>

                {/* Third item */}
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md z-10 ${
                        activeRequest.status === "Matched" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                    </div>
                  </div>
                  <div
                    className={`rounded-lg border p-4 flex-1 ${
                      activeRequest.status === "Matched"
                        ? "bg-white border-gray-100 shadow-sm"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-base font-medium text-gray-900">Donor Match Found</h4>
                      <span className="text-xs text-gray-500">
                        {activeRequest.status === "Matched" ? "Complete" : "Pending"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">A compatible donor has been identified for your transplant.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 text-center">
            <Link
              to="/recipient/transplant-progress"
              className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-[#973131] to-red-600 text-white rounded-lg hover:from-[#7a2828] hover:to-red-700 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              <FaHeartbeat className="mr-2" />
              View Detailed Transplant Progress
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
            <FaHeartbeat size={28} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Transplant Process</h3>
          <p className="text-gray-600 mb-6">You need to submit an organ request to begin the transplant process.</p>
          <Link
            to="/recipient/request-organ"
            className="inline-flex items-center px-5 py-2.5 bg-[#973131] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start an Organ Request
          </Link>
        </div>
      )}
    </div>
  )
}

export default RecipientDashboard
