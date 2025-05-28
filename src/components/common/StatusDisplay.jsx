import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { query, where, collection, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaCheckCircle, FaTimesCircle, FaClock, FaInfoCircle } from 'react-icons/fa';

const StatusDisplay = () => {
  const { user } = useContext(UserContext);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documentInfo, setDocumentInfo] = useState(null);

  useEffect(() => {
    if (user) {
      fetchDocumentStatus();
    }
  }, [user]);

  const fetchDocumentStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'donorUploadDocuments'),
        where('donorId', '==', user.uid),
        orderBy('uploadedAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        setDocumentInfo({ id: doc.id, ...data });
        
        if (data.adminStatus) {
          setStatus(data.adminStatus);
        } else {
          setStatus('pending');
        }
      } else {
        setStatus('no_documents');
      }
    } catch (error) {
      console.error('Error fetching document status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'approved':
        return {
          icon: <FaCheckCircle className="text-green-500" size={24} />,
          title: 'Documents Approved',
          message: 'Your medical documents have been approved. You are eligible to donate.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'rejected':
        return {
          icon: <FaTimesCircle className="text-red-500" size={24} />,
          title: 'Documents Rejected',
          message: documentInfo?.adminReason || 'Your documents need review. Please contact support.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'pending':
      case 'under_review':
        return {
          icon: <FaClock className="text-yellow-500" size={24} />,
          title: 'Under Review',
          message: 'Your medical documents are being reviewed by our medical team.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'no_documents':
        return {
          icon: <FaInfoCircle className="text-blue-500" size={24} />,
          title: 'No Documents Uploaded',
          message: 'Please upload your medical documents to begin the review process.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const statusDisplay = getStatusDisplay();
  if (!statusDisplay) return null;

  return (
    <div className={`p-4 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
      <div className="flex items-start space-x-3">
        {statusDisplay.icon}
        <div>
          <h3 className="font-semibold text-gray-900">{statusDisplay.title}</h3>
          <p className="text-sm text-gray-700 mt-1">{statusDisplay.message}</p>
          {documentInfo?.adminActionedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(documentInfo.adminActionedAt.toDate()).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusDisplay;
