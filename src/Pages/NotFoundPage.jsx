// src/pages/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom'; // for routing to the homepage
 // Ensure Bootstrap is imported

const NotFoundPage = () => {
  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: '100vh',
        backgroundColor: '#292929', // Light background color
        backgroundImage: 'url(https://via.placeholder.com/1200x800?text=404+Image)', // Optional background image
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="text-center text-light p-4 rounded d-flex flex-column gap-4">
        <h1 className="display-3 fw-bold mb-0">404</h1>
        <p className="lead">Oops! The page you’re looking for doesn’t exist.</p>
        <p>
          <Link
            to="/"
            className="btn btn-primary btn-lg"
          >
            Go Back Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
