import React, { useContext, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";

interface PrivateRouteProps {
  children: React.ReactNode;
  role?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, role }) => {
  const { user, loading } = useContext(UserContext);
  const location = useLocation();

  // Add extensive logging
  useEffect(() => {
    console.log("PrivateRoute - User:", user);
    console.log("PrivateRoute - Loading:", loading);
    console.log("PrivateRoute - Required Role:", role);
    console.log("PrivateRoute - Current Location:", location.pathname);
  }, [user, loading, role, location]);

  // Loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Not authenticated
  if (!user) {
    console.log("Not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  const allowedRoles = ["donor", "doctor", "admin", "recipient"];

  // Check if the role is valid
  if (role && !allowedRoles.includes(role)) {
    console.error(`Invalid role specified: ${role}`);
    return <Navigate to="/" replace />;
  }

  // Check if user's role matches the required role
  if (role && user.role !== role) {
    console.log(`Role mismatch: User role is ${user.role}, required role is ${role}`);
    
    // Always redirect to the matching role's dashboard
    switch (user.role) {
      case "donor":
        return <Navigate to="/donor/dashboard" replace />;
      case "doctor":
        return <Navigate to="/doctor/dashboard" replace />;
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "recipient":
        return <Navigate to="/recipient/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;