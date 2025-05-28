import React from "react";
import './partner.css';
import partner1 from '../../assets/images/parner-1.png';
import partner2 from '../../assets/images/partner2.png';
import partner3 from '../../assets/images/partner3.png';
import partner4 from '../../assets/images/partner4.png';
import partner5 from '../../assets/images/partner5.png';

const PartnerSection = () => {
  return (
    
      <div className="container-fluid mb-0">
        <div className="row text-center d-flex align-items-center justify-content-center">
          {/* Partner 1 */}
          <div className="col-lg-2 col-md-3 col-sm-4 col-2">
            <div className="partner">
              <img src={partner1} alt="Partner 1" className="partner-img" />
            </div>
          </div>
          {/* Partner 2 */}
          <div className="col-lg-2 col-md-3 col-sm-4 col-2">
            <div className="partner">
              <img src={partner5} alt="Partner 2" className="partner-img" />
            </div>
          </div>
          {/* Partner 3 */}
          <div className="col-lg-3 col-md-3 col-sm-4 col-2 d-flex justify-content-center align-items-center">
            <div className="partner w-100">
              <img src={partner2} alt="Partner 3" className="partner-img" />
            </div>
          </div>
          {/* Partner 4 */}
          <div className="col-lg-2 col-md-3 col-sm-4 col-2">
            <div className="partner">
              <img src={partner4} alt="Partner 4" className="partner-img" />
            </div>
          </div>
          {/* Partner 5 */}
          <div className="col-lg-2 col-md-3 col-sm-4 col-2">
            <div className="partner">
              <img src={partner3} alt="Partner 5" className="partner-img" />
            </div>
          </div>
        </div>
      </div>
  
  );
};

export default PartnerSection;
