import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function Reports() {
  const [reportType, setReportType] = useState('donors');
  const [dateRange, setDateRange] = useState('week');
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    try {
      let reportQuery;
      const currentDate = new Date();
      let startDate = new Date();

      // Calculate date range
      switch (dateRange) {
        case 'week':
          startDate.setDate(currentDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(currentDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(currentDate.getFullYear() - 1);
          break;
        default:
          break;
      }

      // Create query based on report type
      switch (reportType) {
        case 'donors':
          reportQuery = query(
            collection(db, 'medicalRecords'),
            where('createdAt', '>=', startDate),
            where('createdAt', '<=', currentDate)
          );
          break;
        case 'matches':
          reportQuery = query(
            collection(db, 'matches'),
            where('createdAt', '>=', startDate),
            where('createdAt', '<=', currentDate)
          );
          break;
        default:
          break;
      }

      const querySnapshot = await getDocs(reportQuery);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data());
      });
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Reports</h2>

      {/* Report Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-4 mb-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="donors">Donors Report</option>
            <option value="matches">Matches Report</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>

          <button
            onClick={generateReport}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData ? (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Report Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">
                      {item.createdAt
                        ? new Date(item.createdAt.toDate()).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="p-2">{item.type || 'N/A'}</td>
                    <td className="p-2">{item.status || 'N/A'}</td>
                    <td className="p-2">{item.details || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">No report data available. Generate a report to see results.</p>
      )}
    </div>
  );
}

export default Reports;
