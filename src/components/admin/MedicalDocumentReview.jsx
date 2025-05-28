import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaFileImage, 
  FaUser, 
  FaCalendar, 
  FaHeart,
  FaFilter,
  FaSearch
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import MedicalDocumentDetailModal from './MedicalDocumentDetailModal';

const MedicalDocumentReview = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch medical documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "donorUploadDocuments"),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const docsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDocuments(docsData);
      setFilteredDocuments(docsData);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load medical documents");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter documents based on search and status
  useEffect(() => {
    let filtered = documents;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.organToDonate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }    setFilteredDocuments(filtered);
  }, [documents, searchTerm, statusFilter]);

  // Handle document approval
  const handleApprove = async (documentId) => {
    try {
      setProcessing(prev => ({ ...prev, [documentId]: true }));
      
      // Find the document to get donor information
      const document = documents.find(doc => doc.id === documentId);
      if (!document) {
        toast.error("Document not found");
        return;
      }      // Update the medical document status
      const docRef = doc(db, "donorUploadDocuments", documentId);
      await updateDoc(docRef, {
        status: 'Final Admin Approved',
        adminAction: 'approved',
        adminActionDate: serverTimestamp(),
        finalDecision: 'donor_approved'
      });      // Update the main donor record with final approval
      if (document.donorId) {
        const donorRef = doc(db, "medicalRecords", document.donorId);
        await updateDoc(donorRef, {
          requestStatus: 'Final Admin Approved', // Use the correct final status
          status: 'Final Admin Approved',
          finalAdminDecision: 'approved',
          finalAdminDecisionDate: serverTimestamp(),
          finalAdminNotes: 'Medically fit - approved after medical evaluation',
          medicalEvaluationCompleted: true,
          finalApprovalCompleted: true,
          progressStage: 'final_approved',
          finalDecision: 'donor_approved'
        });
      }
      
      toast.success("Donor approved successfully! Final approval completed.");
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error("Error approving document:", error);
      toast.error("Failed to approve donor");
    } finally {
      setProcessing(prev => ({ ...prev, [documentId]: false }));
    }
  };  // Handle document rejection
  const handleReject = async (documentId, rejectionReason = '') => {
    try {
      setProcessing(prev => ({ ...prev, [documentId]: true }));
      
      // Find the document to get donor information
      const document = documents.find(doc => doc.id === documentId);
      if (!document) {
        toast.error("Document not found");
        return;
      }        // Update the medical document status
      const docRef = doc(db, "donorUploadDocuments", documentId);
      await updateDoc(docRef, {
        status: 'Final Admin Rejected',
        adminAction: 'rejected',
        adminActionDate: serverTimestamp(),
        finalDecision: 'donor_rejected',
        rejectionReason: rejectionReason || 'Medical unfitness confirmed by admin'
      });      // Update the main donor record with final rejection
      if (document.donorId) {
        const donorRef = doc(db, "medicalRecords", document.donorId);
        await updateDoc(donorRef, {
          requestStatus: 'Final Admin Rejected', // Use the correct final status
          status: 'Final Admin Rejected',
          finalAdminDecision: 'rejected',
          finalAdminDecisionDate: serverTimestamp(),
          finalAdminNotes: rejectionReason || 'Medically unfit - rejected after medical evaluation',
          medicalEvaluationCompleted: true,
          finalApprovalCompleted: true,
          rejectionReason: rejectionReason || 'Medical unfitness confirmed by admin',
          progressStage: 'final_rejected',
          finalDecision: 'donor_rejected'
        });
      }
      
      toast.success("Donor rejected permanently. Final decision completed.");
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast.error("Failed to reject donor");
    } finally {
      setProcessing(prev => ({ ...prev, [documentId]: false }));
    }
  };

  // View document details
  const handleViewDetails = (document) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();    } catch {
      return 'Invalid date';
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_admin_review: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review' },
      'Final Admin Approved': { color: 'bg-green-100 text-green-800', text: 'Final Admin Approved' },
      'Final Admin Rejected': { color: 'bg-red-100 text-red-800', text: 'Final Admin Rejected' },
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // Get medical status badge
  const getMedicalStatusBadge = (medicalStatus) => {
    return medicalStatus === 'medically_fit' ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Medically Fit
      </span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Medically Unfit
      </span>
    );
  };
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Medical Document Review</h1>
        <p className="text-gray-600">Review and take action on medical documents submitted by doctors</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by donor name, organ, or doctor..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:w-48">
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending_admin_review">Pending Review</option>
                <option value="Final Admin Approved">Final Admin Approved</option>
                <option value="Final Admin Rejected">Final Admin Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donor Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medical Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No medical documents found
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaUser className="text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {document.donorName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <FaHeart className="mr-1" />
                            {document.organToDonate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getMedicalStatusBadge(document.medicalStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{document.doctorName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FaCalendar className="mr-1" />
                        {formatDate(document.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(document.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(document)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition-colors"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        
                        {document.status === 'pending_admin_review' && (
                          <>
                            {document.medicalStatus === 'medically_fit' && (
                              <button
                                onClick={() => handleApprove(document.id)}
                                disabled={processing[document.id]}
                                className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
                                title="Approve Donor"
                              >
                                {processing[document.id] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-600"></div>
                                ) : (
                                  <FaCheck />
                                )}
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleReject(document.id)}
                              disabled={processing[document.id]}
                              className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                              title="Reject Donor"
                            >
                              {processing[document.id] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                              ) : (
                                <FaTimes />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FaFileImage className="text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-semibold text-gray-900">
                {documents.filter(d => d.status === 'pending_admin_review').length}
              </p>
            </div>
          </div>
        </div>
          <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCheck className="text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Final Admin Approved</p>
              <p className="text-2xl font-semibold text-gray-900">
                {documents.filter(d => d.status === 'Final Admin Approved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FaTimes className="text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Final Admin Rejected</p>
              <p className="text-2xl font-semibold text-gray-900">
                {documents.filter(d => d.status === 'Final Admin Rejected').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaUser className="text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{documents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for document details */}
      <MedicalDocumentDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={selectedDocument}
        onApprove={handleApprove}
        onReject={handleReject}
        processing={processing}
      />
    </div>
  );
};

export default MedicalDocumentReview;
