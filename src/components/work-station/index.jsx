import React from "react";
import './work-station.css';
 const WorkStation = () => {
    return(
        // <div className="set-alignment-container">
        <div className="parent-work-section">
        <section className="od-section " >

  <div className="container-fluid">
    {/* Navigation (Tabs) */}
    <ul className="od-nav__list" id="odTabs" role="tablist">
      <li className="od-nav__item" role="presentation">
        <a
          className="od-nav__link active"
          id="od-donor-tab"
          data-bs-toggle="pill"
          href="#od-donor"
          role="tab"
          aria-controls="od-donor"
          aria-selected="true"
        >
          <i className="fa-solid fa-heart-circle-plus" /> Become a Donor
        </a>
      </li>
      <li className="od-nav__item" role="presentation">
        <a
          className="od-nav__link"
          id="od-hospital-tab"
          data-bs-toggle="pill"
          href="#od-hospital"
          role="tab"
          aria-controls="od-hospital"
          aria-selected="false"
        >
          <i className="fa-solid fa-user-doctor" /> Become a Hospital
        </a>
      </li>
      <li className="od-nav__item" role="presentation">
        <a
          className="od-nav__link"
          id="od-recipient-tab"
          data-bs-toggle="pill"
          href="#od-recipient"
          role="tab"
          aria-controls="od-recipient"
          aria-selected="false"
        >
          <i className="fa-solid fa-heart-pulse" /> Become a Recipient
        </a>
      </li>
    </ul>
    {/* Tab Content */}
    <div className="tab-content" id="odTabContent">
      {/* Become a Donor Section */}
      <div
        className="tab-pane fade show active"
        id="od-donor"
        role="tabpanel"
        aria-labelledby="od-donor-tab"
      >
        {/* <h2 class="text-center mb-5">How to Become a Donor</h2> */}
        <div className="od-grid">
          {/* Step 1 */}
          <div className="od-card">
            <i className="fas fa-clipboard-list od-card__icon" />
            <h4 className="od-card__title">Step 1: Register</h4>
            <p className="od-card__text">
              Sign up to become a donor and help save lives.
            </p>
          </div>
          {/* Step 2 */}
          <div className="od-card">
            <i className="fas fa-search-plus od-card__icon" />
            <h4 className="od-card__title">Step 2: Match</h4>
            <p className="od-card__text">
              We match you with a recipient in need of your organ.
            </p>
          </div>
          {/* Step 3 */}
          <div className="od-card">
            <i className="fas fa-hand-holding-heart od-card__icon" />
            <h4 className="od-card__title">Step 3: Donation</h4>
            <p className="od-card__text">
              Your donation is processed to save lives.
            </p>
          </div>
        </div>
      </div>
      {/* Become a Recipient Section */}
      <div
        className="tab-pane fade"
        id="od-recipient"
        role="tabpanel"
        aria-labelledby="od-recipient-tab"
      >
        {/* <h2 class="text-center mb-5">How to Become a Recipient</h2> */}
        <div className="od-grid">
          {/* Step 1 */}
          <div className="od-card">
            <i className="fas fa-clipboard-list od-card__icon" />
            <h4 className="od-card__title">Step 1: Register</h4>
            <p className="od-card__text">
              Sign up to be a recipient and wait for the match.
            </p>
          </div>
          {/* Step 2 */}
          <div className="od-card">
            <i className="fas fa-heartbeat od-card__icon" />
            <h4 className="od-card__title">Step 2: Wait for a Match</h4>
            <p className="od-card__text">
              Our system will notify you when an organ match is found.
            </p>
          </div>
          {/* Step 3 */}
          <div className="od-card">
            <i className="fas fa-hand-holding-medical od-card__icon" />
            <h4 className="od-card__title">Step 3: Receive Organ</h4>
            <p className="od-card__text">
              The transplant procedure is performed to save your life.
            </p>
          </div>
        </div>
      </div>
      {/* Become a Hospital Section */}
      <div
        className="tab-pane fade"
        id="od-hospital"
        role="tabpanel"
        aria-labelledby="od-hospital-tab"
      >
        {/* <h2 class="text-center mb-5">How to Become a Hospital</h2> */}
        <div className="od-grid">
          {/* Step 1 */}
          <div className="od-card">
            <i className="fas fa-building od-card__icon" />
            <h4 className="od-card__title">Step 1: Apply</h4>
            <p className="od-card__text">
              Fill out an application to join our network of hospitals.
            </p>
          </div>
          {/* Step 2 */}
          <div className="od-card">
            <i className="fas fa-hospital od-card__icon" />
            <h4 className="od-card__title">Step 2: Verify</h4>
            <p className="od-card__text">
              Undergo a verification process to ensure you meet our standards.
            </p>
          </div>
          {/* Step 3 */}
          <div className="od-card">
            <i className="fas fa-hand-holding-medical od-card__icon" />
            <h4 className="od-card__title">Step 3: Start Transplants</h4>
            <p className="od-card__text">
              Begin performing organ transplants and save lives.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
</div> 
    )
 }

 export default WorkStation;