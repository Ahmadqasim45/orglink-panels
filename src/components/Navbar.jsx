import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { FaUserDoctor } from "react-icons/fa6";

import logo from "../assets/images/Green Natural Organic Logo.png";

function Navbar() {
  const { user } = useContext(UserContext);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserName(userData.email || "User");
          setUserRole(userData.role || "donor");
        } else {
          console.warn("No user profile found.");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsMenuOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const MenuLinks = () => (
    <>
      {user ? (
        <>
          {userRole === "donor" && (
            <>
              <Link
                to="/donor/dashboard"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/donor/profile"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>              <Link
                to="/donor/appointments"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Appointments
              </Link>
            </>
          )}
          {userRole === "doctor" && (
            <>
              <Link
                to="/doctor/dashboard"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/doctor/applications"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Application Status
              </Link>              <Link
                to="/doctor/appointments"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Appointments
              </Link>
            </>
          )}          {userRole === "admin" && (
            <>              <Link
                to="/admin/dashboard"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/donor-management"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Donor Management
              </Link>
              <Link
                to="/admin/recipient-management"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Recipient Management
              </Link>              <Link
                to="/admin/doctor-management"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Doctor Management
              </Link>
           
            </>
          )}
          {userRole === "recipient" && (
            <>
              <Link
                to="/recipient/dashboard"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/recipient/profile"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Medical Form
              </Link>              <Link
                to="/recipient/appointments"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Appointments
              </Link>
              <Link
                to="/recipient/test-results"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Test Results
              </Link>
              <Link
                to="/recipient/waiting-list"
                className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Waiting List
              </Link>
            </>
          )}
          <button
            onClick={handleLogout}
            className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors text-light"
          >
            Logout
          </button>
          <div className="flex items-center space-x-2 text-[#973131] py-2">
            {userRole === "doctor" ? (
              <FaUserDoctor
                size={24}
                style={{
                  background: "#973131",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px",
                }}
              />
            ) : (
              <FaUserCircle size={24} />
            )}
            <span className="font-medium">
              {userName.split("@")[0]} ({userRole})
            </span>
          </div>
        </>
      ) : (
        <>
          <Link
            to="/login"
            className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Login
          </Link>
          <Link
            to="/register"
            className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Register
          </Link>
          <Link
            to="/register-as-hospital"
            className="text-[#973131] block py-2 hover:text-opacity-80 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Register as a Hospital
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className="bg-transparent p-3 px-0 border-b relative">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white font-bold text-xl">
          <img src={logo} alt="Logo" width={120} />
        </Link>

        {/* Mobile Menu Button - Hidden on Desktop */}
        <button
          className="block md:hidden bg-transparent border-0 text-[#973131] focus:outline-none"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <FaBars size={24} />
        </button>

        {/* Mobile Menu Overlay - Hidden on Desktop */}
        {isMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={toggleMenu}
          />
        )}

        {/* Mobile Menu - Hidden on Desktop */}
        <div
          className={`
          md:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-lg
          transform transition-transform duration-300 ease-in-out z-40
          ${isMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
        >
          <button
            className="absolute top-4 right-4 bg-transparent border-0 text-[#973131] focus:outline-none"
            onClick={toggleMenu}
            aria-label="Close menu"
          >
            <FaTimes size={24} />
          </button>
          <div className="mt-16 px-4">
            <MenuLinks />
          </div>
        </div>        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          <MenuLinks />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;