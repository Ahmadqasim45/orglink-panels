import React, { useEffect, useRef } from "react";
import  "./statistics.css";

const Statistic = () => {
  const counters = useRef([]);

  useEffect(() => {
    counters.current.forEach((counter) => {
      const updateCounter = () => {
        const target = +counter.getAttribute("data-target");
        const count = +counter.innerText;
        const increment = target / 200; // Adjust for speed

        if (count < target) {
          counter.innerText = Math.ceil(count + increment);
          setTimeout(updateCounter, 10); // Adjust interval for smoothness
        } else {
          counter.innerText = target;
        }
      };

      updateCounter();
    });
  }, []);

  return (
    <section id="statistic" className="statistic-section one-page-section">
      <div className="container-fluid">
        <div className="row text-center d-flex justify-content-between align-items-center">
          {/* Donor Count */}
          <div className="col-xs-12 col-md-3">
            <div className="counter">
              <i className="fa fa-heartbeat fa-2x stats-icon" />
              <h2
                className="timer count-title count-number"
                data-target="5000"
                ref={(el) => (counters.current[0] = el)}
              >
                0
              </h2>
              <div className="stats-line-black" />
              <p className="stats-text">Donors Registered</p>
            </div>
          </div>
          {/* Recipient Count */}
          <div className="col-xs-12 col-md-3">
            <div className="counter">
              <i className="fa fa-users fa-2x stats-icon" />
              <h2
                className="timer count-title count-number"
                data-target="2500"
                ref={(el) => (counters.current[1] = el)}
              >
                0
              </h2>
              <div className="stats-line-black" />
              <p className="stats-text">Recipients Waiting</p>
            </div>
          </div>
          {/* Successful Transplants */}
          <div className="col-xs-12 col-md-3">
            <div className="counter">
              <i className="fa fa-check-circle fa-2x stats-icon" />
              <h2
                className="timer count-title count-number"
                data-target="1500"
                ref={(el) => (counters.current[2] = el)}
              >
                0
              </h2>
              <div className="stats-line-black" />
              <p className="stats-text">Successful Transplants</p>
            </div>
          </div>
          {/* Hospitals Partnered */}
          <div className="col-xs-12 col-md-3">
            <div className="counter">
              <i className="fa fa-hospital fa-2x stats-icon" />
              <h2
                className="timer count-title count-number"
                data-target="50"
                ref={(el) => (counters.current[3] = el)}
              >
                0
              </h2>
              <div className="stats-line-black" />
              <p className="stats-text">Hospitals Partnered</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Statistic;
