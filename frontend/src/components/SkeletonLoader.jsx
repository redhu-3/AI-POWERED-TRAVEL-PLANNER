import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ message }) => {
  return (
    <div className="skeleton-container glass animate-fade-in">
      <div className="skeleton-spinner-container">
        <div className="spinner">
          <div className="spinner-inner"></div>
        </div>
      </div>
      <h3 className="skeleton-loading-title">{message || 'Crafting your personalized itinerary...'}</h3>
      <p className="skeleton-loading-subtitle">Querying weather forecasts, local exchange rates, and generating activities with Gemini AI. This may take a few seconds.</p>
      
      <div className="skeleton-mock-page">
        <div className="skeleton-mock-header skeleton"></div>
        <div className="skeleton-mock-grid">
          <div className="skeleton-mock-card skeleton"></div>
          <div className="skeleton-mock-card skeleton"></div>
          <div className="skeleton-mock-card skeleton"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
