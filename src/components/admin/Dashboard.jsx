import React from 'react';
import { Link } from 'react-router-dom';
import HospitalList from './HopitalList';

function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Hospital Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Statistics</h2>
          <div className="space-y-2">
            <p>Pending Donors: <span className="font-bold text-blue-600">12</span></p>
            <p>Pending Recipients: <span className="font-bold text-green-600">8</span></p>
            <p>Active Cases: <span className="font-bold text-purple-600">15</span></p>
          </div>
        </div>        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/admin/medical-documents" className="block text-purple-600 hover:underline font-medium">
              Review Medical Documents
            </Link>
            <Link to="/admin/verify-donors" className="block text-blue-600 hover:underline">
              Verify Donors
            </Link>
            <Link to="/admin/verify-recipients" className="block text-blue-600 hover:underline">
              Verify Recipients
            </Link>
            <Link to="/admin/manage-doctors" className="block text-blue-600 hover:underline">
              Manage Doctors
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-2 text-sm">
            <p>New donor registration - 2 hours ago</p>
            <p>Recipient verified - 3 hours ago</p>
            <p>Match found - 5 hours ago</p>
          </div>
        </div>
      </div>


      <h2>Hopitals Lists</h2>

      {/* <HospitalList /> */}
    </div>
  );
}

export default AdminDashboard;