import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-2 text-gray-600">Loading...</p>
    </div>
  );
};

export default LoadingSpinner;
