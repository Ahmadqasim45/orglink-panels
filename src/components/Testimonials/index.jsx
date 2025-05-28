import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css"; // Swiper styles
import "swiper/css/pagination";
import "swiper/css/autoplay";
import './testimonial.css';
// Import Swiper modules
import { Pagination, Autoplay } from "swiper/modules";

const TestimonialSection = () => {
  return (
    <div className="set-alignment-container">

    <div className="testimonial-section">
      <div className="container-fluid">
        <div className="gallery__header">
          <div className="gallery__subtitle">Voices of Hope</div>
          <h2 className="gallery__title">Orglink: Transforming Lives Through Organ Donation</h2>
        </div>
        <div className="row align-items-center">
          {/* Testimonial Swiper */}
          <div className="col-lg-6">
            <Swiper
              modules={[Pagination, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              pagination={{ clickable: true }}
              autoplay={{ delay: 5000 }}
              loop={true}
            >
              <SwiperSlide>
                <div className="quote-icon">"</div>
                <h2 className="testimonial-heading">
                  A Second Chance at Life
                </h2>
                <p className="testimonial-text">
                  Thanks to Orglink, I received a life-saving transplant. Their mission gives hope to countless individuals in need.
                </p>
                <div className="author-name">Michael Anderson</div>
                <div className="author-title">Recipient</div>
              </SwiperSlide>
              <SwiperSlide>
                <div className="quote-icon">"</div>
                <h2 className="testimonial-heading">
                  Giving the Gift of Life
                </h2>
                <p className="testimonial-text">
                  Becoming a donor through Orglink was the best decision I ever made. Knowing I could help someone live on is truly rewarding.
                </p>
                <div className="author-name">Linda Roberts</div>
                <div className="author-title">Donor</div>
              </SwiperSlide>
              <SwiperSlide>
                <div className="quote-icon">"</div>
                <h2 className="testimonial-heading">
                  Empowering Organ Donations
                </h2>
                <p className="testimonial-text">
                  Orglink connects donors and recipients seamlessly, making organ donation accessible and efficient.
                </p>
                <div className="author-name">Dr. Kevin Mitchell</div>
                <div className="author-title">Medical Professional</div>
              </SwiperSlide>
            </Swiper>
          </div>

          {/* Video Placeholder */}
          <div className="col-lg-6">
            <div className="video-placeholder">
              <a id="play-video" className="video-play-button" href="#">
                <span></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default TestimonialSection;
