import React from "react";
import './Success-stories.css'
import Story1 from '../../assets/images/gallery-1.webp'
import Story2 from '../../assets/images/gallery-2.webp'
import Story3 from '../../assets/images/gallery-3.png'
import Story4 from '../../assets/images/gallery-4.png'
import Story5 from '../../assets/images/gallery-5.webp'
import Story6 from '../../assets/images/gallery-6.webp'

const SuccessStories =() => {
    return(
        <div className="set-alignment-container">
        <section className="gallery">
  <div className="container-fluid">
    <div className="gallery__header">
      <div className="gallery__subtitle">Our Success Stories</div>
      <h2 className="gallery__title">Lives Transformed Through Generosity</h2>
    </div>
    <div className="gallery__grid">
      <div className="gallery__item">
        <div className="gallery__image-wrapper">
          <img
            src={Story1}
            alt="Donor and Recipient Meeting"
            className="gallery__image"
          />
          <div className="gallery__overlay">
            <h3 className="gallery__caption">A New Beginning</h3>
            <p className="gallery__description">
              A young Pakistani patient celebrates recovery after a life-saving
              kidney transplant.
            </p>
          </div>
        </div>
      </div>
      <div className="gallery__item">
        <div className="gallery__image-wrapper">
          <img
            src={Story2}
            alt="Successful Organ Transplant"
            className="gallery__image"
          />
          <div className="gallery__overlay">
            <h3 className="gallery__caption">Hope Restored</h3>
            <p className="gallery__description">
              A mother regains her health after receiving a liver transplant.
            </p>
          </div>
        </div>
      </div>
      <div className="gallery__item">
        <div className="gallery__image-wrapper">
          <img
            src={Story3}
            alt="Donor's Legacy"
            className="gallery__image"
          />
          <div className="gallery__overlay">
            <h3 className="gallery__caption">Legacy of Love</h3>
            <p className="gallery__description">
              Honoring a donor whose organ gave the gift of life to others in
              Pakistan.
            </p>
          </div>
        </div>
      </div>
      <div className="gallery__item">
        <div className="gallery__image-wrapper">
          <img
            src={Story4}
            alt="Community Awareness Event"
            className="gallery__image"
          />
          <div className="gallery__overlay">
            <h3 className="gallery__caption">Raising Awareness</h3>
            <p className="gallery__description">
              A community event promoting organ donation in local areas.
            </p>
          </div>
        </div>
      </div>
      <div className="gallery__item">
        <div className="gallery__image-wrapper">
          <img
            src={Story5}
            alt="Child's Recovery Story"
            className="gallery__image"
          />
          <div className="gallery__overlay">
            <h3 className="gallery__caption">A Second Chance</h3>
            <p className="gallery__description">
              A child celebrates a successful kidney transplant, living a
              healthier life.
            </p>
          </div>
        </div>
      </div>
      <div className="gallery__item">
        <div className="gallery__image-wrapper">
          <img
            src={Story6}
            alt="Donor Celebration"
            className="gallery__image"
          />
          <div className="gallery__overlay">
            <h3 className="gallery__caption">Celebrating Heroes</h3>
            <p className="gallery__description">
              A gathering honoring the heroes who donated their organs to save
              lives.
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
export default SuccessStories;