import React from "react";
import "./footer.css";
import Story1 from '../../assets/images/gallery-1.webp'
import Story2 from '../../assets/images/gallery-2.webp'
import Story3 from '../../assets/images/gallery-3.png'
import Story4 from '../../assets/images/gallery-4.png'
import Story5 from '../../assets/images/gallery-5.webp'
import Story6 from '../../assets/images/gallery-6.webp'


const Footer = () => {
  return (
    <div className="set-alignment-container">
    <footer className="container-fluid px-5 py-0">
      <div className="row g-5">
        {/* Organization Info Section */}
        <div className="col-lg-3 col-md-6">
          <div className="d-flex align-items-center mb-3">
            <i className="fas fa-heart-pulse me-2"></i>
            <span className="logo-text">Organ Donation</span>
          </div>
          <p className="description">
            Connecting donors with recipients, saving lives through organ donation. 
            Join us in our mission to give the gift of life and create hope for those in need.
          </p>
          <div className="contact-info">
            <p className="mb-1">
              <span className="contact-label">Emergency Hotline: </span>
              <a href="tel:1-800-555-0123" className="contact-link">
                1-800-555-0123
              </a>
            </p>
            <p className="mb-1">
              <span className="contact-label">Address: </span> 123 Life Care Avenue
            </p>
            <p className="contact-label mb-0">Medical District, NY 10001</p>
          </div>
        </div>

        {/* About Us Section */}
        <div className="col-lg-3 col-md-6">
          <h3 className="section-title-footer">About Us</h3>
          <ul className="footer-links">
            <li><a href="#">Our Mission</a></li>
            <li><a href="#">Donation Process</a></li>
            {/* <li><a href="#">Medical Team</a></li> */}
            {/* <li><a href="#">Partner Hospitals</a></li> */}
            <li><a href="#">Contact Us</a></li>
          </ul>
        </div>

        {/* Useful Links Section */}
        <div className="col-lg-3 col-md-6 ">
          <h3 className="section-title-footer">Useful Links</h3>
          <ul className="footer-links">
            <li><a href="#">Donor Registration</a></li>
            <li><a href="#">Success Stories</a></li>
            {/* <li><a href="#">Medical Resources</a></li> */}
            {/* <li><a href="#">Legal Guidelines</a></li> 
            */}
            <li><a href="#">Support Services</a></li>
          </ul>
        </div>

        {/* Impact Section */}
        <div className="col-lg-3 col-md-6">
          <h3 className="section-title-footer">Success Stories</h3>
          <div className="footer-causes-grid">
            <img
              className="img-fluid footer-cause-image"
              src={Story1}
              alt="Impact Gallery 1"
            />
            <img
              className="img-fluid footer-cause-image"
              src={Story2}
              alt="Impact Gallery 2"
            />
            <img
              className="img-fluid footer-cause-image"
              src={Story3}
              alt="Impact Gallery 3"
            />
            <img
              className="img-fluid footer-cause-image"
              src={Story4}
              alt="Impact Gallery 4"
            />
            <img
              className="img-fluid footer-cause-image"
              src={Story5}
              alt="Impact Gallery 5"
            />
            <img
              className="img-fluid footer-cause-image"
              src={Story6}
              alt="Impact Gallery 6"
            />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-section d-flex justify-content-between align-items-center mt-4">
        <div className="social-icons">
          <a href="#" className="social-icon">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="#" className="social-icon">
            <i className="fab fa-twitter"></i>
          </a>
          <a href="#" className="social-icon">
            <i className="fab fa-instagram"></i>
          </a>
        </div>
        <div className="copyright">
          © Copyright Organ Donation 2024. Saving Lives Through Organ Donation.
        </div>
      </div>
    </footer>
    </div>
  );
};

export default Footer;
