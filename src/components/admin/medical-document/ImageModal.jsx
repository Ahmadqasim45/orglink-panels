import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ImageModal = ({ showImageModal, fileUrl, setShowImageModal }) => {
  if (!showImageModal || !fileUrl) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-60 flex justify-center items-center p-4">
      <div className="relative max-w-4xl max-h-full">
        <button
          onClick={() => setShowImageModal(false)}
          className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors z-10"
        >
          <FaTimes size={20} />
        </button>
        <img
          src={fileUrl}
          alt="Medical Document Full Size"
          className="max-w-full max-h-full object-contain rounded"
        />
      </div>
    </div>
  );
};

export default ImageModal;
