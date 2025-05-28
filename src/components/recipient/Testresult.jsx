import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const TestResults = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    const fetchTestResults = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        // In a real app, you would query test results from Firestore
        // For this example, we'll use placeholder data
        const mockTestResults = [
          {
            id: "test1",
            date: "2025-03-15",
            testType: "Blood Test",
            doctor: "Dr. Smith",
            hospital: "General Hospital",
            status: "completed",
            results: "Normal",
            notes: "All values within normal range"
          },
          {
            id: "test2",
            date: "2025-03-22",
            testType: "Kidney Function",
            doctor: "Dr. Johnson",
            hospital: "Medical Center",
            status: "pending_review",
            results: null,
            notes: "Results pending doctor review"
          },
          {
            id: "test3",
            date: "2025-02-10",
            testType: "Liver Function",
            doctor: "Dr. Williams",
            hospital: "City Hospital",
            status: "completed",
            results: "Abnormal",
            notes: "Some values outside normal range, follow-up recommended"
          }
        ];

        setTestResults(mockTestResults);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching test results:", error);
        setLoading(false);
      }
    };

    fetchTestResults();
  }, [navigate]);

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { color: "bg-green-200 text-green-800", label: "Completed" },
      pending_review: { color: "bg-yellow-200 text-yellow-800", label: "Pending Review" },
      scheduled: { color: "bg-blue-200 text-blue-800", label: "Scheduled" },
      cancelled: { color: "bg-red-200 text-red-800", label: "Cancelled" }
    };

    const statusInfo = statusMap[status] || { color: "bg-gray-200 text-gray-800", label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getResultBadge = (result) => {
    if (!result) return null;
    
    const resultMap = {
      "Normal": { color: "bg-green-200 text-green-800" },
      "Abnormal": { color: "bg-red-200 text-red-800" },
      "Inconclusive": { color: "bg-yellow-200 text-yellow-800" }
    };

    const resultInfo = resultMap[result] || { color: "bg-gray-200 text-gray-800" };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${resultInfo.color}`}>
        {result}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Test Results</h2>
      
      {testResults.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testResults.map((test) => (
                <tr key={test.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(test.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{test.testType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{test.doctor}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(test.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {test.results ? getResultBadge(test.results) : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/recipient/test-results/${test.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No test results found.</p>
        </div>
      )}
      
      <div className="mt-6">
        <button
          onClick={() => navigate("/recipient/dashboard")}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default TestResults;