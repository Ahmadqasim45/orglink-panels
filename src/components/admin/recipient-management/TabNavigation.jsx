import React from 'react';

const TabNavigation = ({ activeTab, setActiveTab, actionInProgress }) => {
  const tabs = [
    { id: "pending", label: "Pending Requests" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" }
  ];

  return (
    <div className="mb-6 border-b">
      <ul className="flex flex-wrap -mb-px">
        {tabs.map((tab) => (
          <li key={tab.id} className="mr-2">
            <button
              className={`inline-block p-4 ${
                activeTab === tab.id
                  ? "text-teal-600 border-b-2 border-teal-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab.id)}
              disabled={actionInProgress}
              type="button"
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TabNavigation;
