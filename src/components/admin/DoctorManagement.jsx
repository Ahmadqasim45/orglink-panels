import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import HospitalList from './HopitalList';

function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const doctorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'doctor')
      );
      const querySnapshot = await getDocs(doctorsQuery);
      const doctorsData = [];
      querySnapshot.forEach((doc) => {
        doctorsData.push({ id: doc.id, ...doc.data() });
      });
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const addDoctor = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users'), {
        ...newDoctor,
        role: 'doctor',
        createdAt: new Date()
      });
      setNewDoctor({ name: '', specialization: '', email: '', phone: '' });
      fetchDoctors();
    } catch (error) {
      console.error('Error adding doctor:', error);
    }
  };

  const updateDoctorStatus = async (doctorId, isActive) => {
    try {
      await updateDoc(doc(db, 'users', doctorId), {
        status: isActive ? 'active' : 'inactive',
        updatedAt: new Date()
      });
      fetchDoctors();
    } catch (error) {
      console.error('Error updating doctor status:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Doctor Management</h2>
    <HospitalList />
    </div>
  );
}


export default DoctorManagement;