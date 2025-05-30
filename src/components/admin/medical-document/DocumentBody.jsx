import React from 'react';
import DocumentContentLeft from './DocumentContentLeft';
import DocumentContentRight from './DocumentContentRight';

const DocumentBody = ({ document, formatDate, getStatusColor, setShowImageModal }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Document Info */}
        <DocumentContentLeft 
          document={document} 
          formatDate={formatDate} 
          getStatusColor={getStatusColor} 
        />
        
        {/* Right Column - Attached Document */}
        <DocumentContentRight 
          document={document} 
          setShowImageModal={setShowImageModal} 
        />
      </div>
    </div>
  );
};

export default DocumentBody;
