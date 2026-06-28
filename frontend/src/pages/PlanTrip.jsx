import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SkeletonLoader from '../components/SkeletonLoader';
import './PlanTrip.css';

const PlanTrip = () => {
  const navigate = useNavigate();

  // Form states
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('Medium');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const interestOptions = [
    { name: 'Nature', emoji: '🌿' },
    { name: 'Food', emoji: '🍜' },
    { name: 'History', emoji: '🏛️' },
    { name: 'Adventure', emoji: '🧗' },
    { name: 'Nightlife', emoji: '🌙' },
    { name: 'Shopping', emoji: '🛍️' },
    { name: 'Relaxation', emoji: '💆' }
  ];

  const handleInterestChange = (interestName) => {
    if (selectedInterests.includes(interestName)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interestName));
    } else {
      setSelectedInterests([...selectedInterests, interestName]);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    // Per-field inline validation
    const errors = {};
    if (!destination.trim()) {
      errors.destination = 'Please enter a destination.';
    }
    const parsedDays = parseInt(days, 10);
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 30) {
      errors.days = 'Duration must be an integer between 1 and 30.';
    }
    if (selectedInterests.length === 0) {
      errors.interests = 'Please select at least one interest.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setGenerating(true);

    try {
      const payload = {
        destination: destination.trim(),
        days: parsedDays,
        budget,
        interests: selectedInterests
      };

      const res = await api.post('/itinerary/generate', payload);
      
      navigate('/itinerary-result', { 
        state: { 
          itinerary: res.data,
          originalPayload: payload 
        } 
      });
    } catch (err) {
      setFieldErrors({ api: err.response?.data?.message || 'Error generating itinerary. Please try again.' });
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return <SkeletonLoader message={`Crafting your custom trip to ${destination}...`} />;
  }

  return (
    <div className="plan-container animate-fade-in">
      <header className="plan-header">
        <h1>Plan a New Journey</h1>
        <p className="plan-sub">Tell us your preferences and let our AI curate the perfect itinerary for you.</p>
      </header>

      <div className="plan-form-wrapper">
        <section className="planner-form-section glass">
          <h2>Outline Your Trip</h2>
          <p className="form-sub">Enter destination, length, budget, and styles</p>

          {fieldErrors.api && <div className="alert alert-danger">{fieldErrors.api}</div>}

          <form onSubmit={handleGenerate} className="planner-form">
            <div className="form-group">
              <label className="form-label" htmlFor="destination">Where to?</label>
              <input
                type="text"
                id="destination"
                className={`form-input ${fieldErrors.destination ? 'input-error' : ''}`}
                placeholder="e.g. Kyoto, Paris, Rome"
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setFieldErrors(prev => ({ ...prev, destination: '' })); }}
                disabled={generating}
              />
              {fieldErrors.destination && <span className="field-error">{fieldErrors.destination}</span>}
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="days">Duration (Days)</label>
                <input
                  type="number"
                  id="days"
                  className={`form-input ${fieldErrors.days ? 'input-error' : ''}`}
                  min="1"
                  max="30"
                  value={days}
                  onChange={(e) => { setDays(e.target.value); setFieldErrors(prev => ({ ...prev, days: '' })); }}
                  disabled={generating}
                />
                {fieldErrors.days && <span className="field-error">{fieldErrors.days}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="budget">Budget Level</label>
                <select
                  id="budget"
                  className="form-input select-input"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  disabled={generating}
                >
                  <option value="Low">Low (Backpacker)</option>
                  <option value="Medium">Medium (Balanced)</option>
                  <option value="High">High (Luxury)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Interests (Select at least one)</label>
              <div className={`interests-grid ${fieldErrors.interests ? 'interests-error' : ''}`}>
                {interestOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.name}
                    className={`interest-chip ${selectedInterests.includes(opt.name) ? 'active' : ''}`}
                    onClick={() => { handleInterestChange(opt.name); setFieldErrors(prev => ({ ...prev, interests: '' })); }}
                    disabled={generating}
                  >
                    <span className="chip-emoji">{opt.emoji}</span>
                    <span className="chip-name">{opt.name}</span>
                  </button>
                ))}
              </div>
              {fieldErrors.interests && <span className="field-error">{fieldErrors.interests}</span>}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary generate-btn" disabled={generating}>
                {generating ? 'Generating...' : 'Generate Custom Itinerary ✦'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary cancel-btn" 
                onClick={() => navigate('/dashboard')}
                disabled={generating}
              >
                Back to Dashboard
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default PlanTrip;
