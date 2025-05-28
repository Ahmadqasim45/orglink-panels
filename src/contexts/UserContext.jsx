import React, { createContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hospitalStatus, setHospitalStatus] = useState(null); // Track hospital verification status
  const [error, setError] = useState(null); // Add error state

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        setError(null); // Clear any previous errors
        setLoading(true);
        
        if (user) {
          console.log("🔐 User authenticated:", user.uid);
          
          // Fetch user data from Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log("📋 User data loaded:", userData.role);
            setUser({ ...user, ...userData });

            // If user is a doctor, check if they are linked to a hospital
            if (userData.role === "doctor") {
              try {
                const hospitalsRef = collection(db, "hospitals");
                const q = query(hospitalsRef, where("userId", "==", user.uid));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                  const hospitalData = querySnapshot.docs[0].data();
                  setHospitalStatus(hospitalData.verificationStatus);
                  console.log("🏥 Hospital status:", hospitalData.verificationStatus);
                } else {
                  console.log("⚠️ No hospital found for doctor");
                  setHospitalStatus(null);
                }
              } catch (hospitalError) {
                console.warn("⚠️ Error fetching hospital data:", hospitalError);
                setHospitalStatus(null);
              }
            }
          } else {
            console.warn("⚠️ User document not found in Firestore");
            setError("User profile not found. Please contact support.");
            setUser(null);
          }
        } else {
          console.log("🚪 User signed out");
          setUser(null);
          setHospitalStatus(null);
        }
      } catch (error) {
        console.error("❌ Authentication error:", error);
        setError(`Authentication failed: ${error.message}`);
        setUser(null);
        setHospitalStatus(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);
  return (
    <UserContext.Provider value={{ user, loading, hospitalStatus, error }}>
      {!loading && children}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
          <div className="flex items-center">
            <div className="mr-2">⚠️</div>
            <div>
              <strong>Authentication Error:</strong>
              <br />
              {error}
            </div>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};