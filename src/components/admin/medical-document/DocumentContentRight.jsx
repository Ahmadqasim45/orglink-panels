import React from 'react';
import DocumentAttachmentSection from './DocumentAttachmentSection';
import DecisionGuideSection from './DecisionGuideSection';

const DocumentContentRight = ({ document, setShowImageModal }) => {
  return (
    <div className="space-y-6">
      {/* Attached Document */}
      <DocumentAttachmentSection document={document} setShowImageModal={setShowImageModal} />
      
      {/* Decision Helper */}
      <DecisionGuideSection document={document} />
    </div>
  );
};

export default DocumentContentRight;
