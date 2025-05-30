import React from 'react';

const ErrorAlert = ({ error, clearError }) => {
  if (!error) return null;

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
      <span className="block sm:inline">{error}</span>
      <button
        className="absolute top-0 bottom-0 right-0 px-4 py-3"
        onClick={clearError}
        type="button"
        aria-label="Close error message"
      >
        <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );
};

export default ErrorAlert;
