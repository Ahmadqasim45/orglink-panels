import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import './Donation-system.css';
import DonationImage from '../../assets/images/heart-6873709_1280.jpg'

const DonationSystem = () => {
  useEffect(() => {
    AOS.init({
      duration: 400, // Duration for animations
      easing: "ease-in-out",
      once: true, // Animates only once when the element appears
      offset: 100, // Adds a slight offset before the animation triggers
    });
  }, []);

  return (
    <div className="set-alignment-container">
      <div className="parent-organ-donation-section">
        <section className="transform-section">
          <div className="container-fluid">
            <div className="equal-columns">
              {/* Image Column */}
              <div className="equal-column" data-aos="fade-right" data-aos-duration="1000">
                <div className="img-container">
                  <img src={DonationImage} alt="Organ Donation Image" />
                </div>
              </div>
              {/* Content Column */}
              <div className="equal-column" data-aos="fade-left" data-aos-duration="1000">
                <div className="content-wrapper">
                  <h3 className="section-title" data-aos="zoom-in-up" data-aos-duration="900">
                    Transform Lives Through Organ Donation
                  </h3>
                  <p className="section-text" data-aos="fade-up" data-aos-duration="1000">
                    Every organ donation is a powerful act of kindness that can save
                    multiple lives. By pledging to become a donor, you ensure a second
                    chance at life for those who need it most. Together, we can create
                    a future where no one has to wait for the gift of life.
                  </p>
                  <ul className="steps-list">
                    <li className="step-item" data-aos="fade-up" data-aos-delay="200">
                      <span className="step-number">1</span>
                      <span className="step-text">Sign up to become a donor</span>
                    </li>
                    <li className="step-item" data-aos="fade-up" data-aos-delay="400">
                      <span className="step-number">2</span>
                      <span className="step-text">Learn about the process</span>
                    </li>
                    <li className="step-item" data-aos="fade-up" data-aos-delay="600">
                      <span className="step-number">3</span>
                      <span className="step-text">Make an informed decision</span>
                    </li>
                    <li className="step-item" data-aos="fade-up" data-aos-delay="800">
                      <span className="step-number">4</span>
                      <span className="step-text">Stay connected</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DonationSystem;
