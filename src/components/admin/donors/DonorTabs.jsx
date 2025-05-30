import React from 'react';

/**
 * Component for displaying tabs to filter donors by status
 */
const DonorTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="mb-6 border-b">
      <ul className="flex flex-wrap -mb-px">
        <li className="mr-2">
          <button
            className={`inline-block p-4 ${
              activeTab === 'pending'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Requests
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-4 ${
              activeTab === 'approved'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-4 ${
              activeTab === 'rejected'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected
          </button>
        </li>
      </ul>
    </div>
  );
};

export default DonorTabs;
