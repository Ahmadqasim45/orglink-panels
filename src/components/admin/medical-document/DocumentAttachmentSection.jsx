import React from 'react';
import { FaFileImage, FaEye } from 'react-icons/fa';

const DocumentAttachmentSection = ({ document, setShowImageModal }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
        <FaFileImage className="mr-2 text-purple-600" />
        Attached Medical Document
      </h3>
      
      {document.hasAttachment && document.fileUrl ? (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900">{document.fileName}</p>
                <p className="text-sm text-gray-500">Medical Document Image</p>
              </div>
              <button
                onClick={() => setShowImageModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center text-sm"
              >
                <FaEye className="mr-1" />
                View Full Size
              </button>
            </div>
            
            {/* Image Preview */}
            <div className="relative">
              <img
                src={document.fileUrl}
                alt="Medical Document"
                className="w-full h-64 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowImageModal(true)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-20 rounded transition-opacity">
                <span className="text-white text-sm font-medium">Click to enlarge</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FaFileImage className="mx-auto text-gray-400 text-3xl mb-2" />
          <p className="text-gray-500">No document was attached</p>
        </div>
      )}
    </div>
  );
};

export default DocumentAttachmentSection;
