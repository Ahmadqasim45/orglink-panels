import React from 'react';
import { FaTimes } from 'react-icons/fa';

const DocumentHeader = ({ onClose }) => {
  return (
    <div className="flex justify-between items-center border-b px-6 py-4 bg-white">
      <h2 className="text-xl font-bold text-gray-800">Medical Document Details</h2>
      <button 
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Close modal"
      >
        <FaTimes size={20} />
      </button>
    </div>
  );
};

export default DocumentHeader;
