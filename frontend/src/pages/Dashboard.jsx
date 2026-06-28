import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // App states
  const [savedTrips, setSavedTrips] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  // Fetch saved itineraries
  const fetchSavedTrips = async () => {
    try {
      setLoadingList(true);
      const res = await api.get('/itinerary');
      setSavedTrips(res.data);
    } catch (err) {
      setListError('Failed to load saved trips.');
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSavedTrips();
  }, []);

  const handleDelete = async (e, tripId) => {
    e.stopPropagation(); // Prevent card click navigation
    if (!window.confirm('Are you sure you want to delete this saved itinerary?')) {
      return;
    }

    try {
      await api.delete(`/itinerary/${tripId}`);
      // Refresh list
      setSavedTrips(savedTrips.filter(trip => trip._id !== tripId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete itinerary.');
      console.error(err);
    }
  };

  const handleViewSaved = (trip) => {
    navigate('/itinerary-result', { 
      state: { 
        itinerary: trip,
        isSaved: true
      } 
    });
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <h1>Travel Planner Dashboard</h1>
        <p className="welcome-sub">Welcome back, {user?.name || 'Traveler'}. Access your saved plans or outline a new one below.</p>
      </header>

      {/* Hero Planner CTA Card */}
      <div className="dashboard-hero-card glass">
        <div className="hero-card-content">
          <h2>Embark on a New Journey</h2>
          <p>Outline your travel details and let our AI curate a personalized, context-aware itinerary with real-time weather forecasts and local currency converters.</p>
          <button onClick={() => navigate('/plan')} className="btn btn-primary">
            Plan a New Trip <span>✦</span>
          </button>
        </div>
        <div className="hero-card-decor">🗺️</div>
      </div>

      {/* Saved Itineraries Listing */}
      <section className="saved-trips-section">
        <h2>Your Saved Journeys</h2>
        <p className="saved-sub">Access your compiled itineraries and past routes</p>

        {listError && <div className="alert alert-danger">{listError}</div>}

        {loadingList ? (
          <div className="loading-grid">
            <div className="loading-card skeleton"></div>
            <div className="loading-card skeleton"></div>
          </div>
        ) : savedTrips.length === 0 ? (
          <div className="no-trips-card glass">
            <div className="no-trips-icon">🗺️</div>
            <h3>No saved trips yet</h3>
            <p>Your saved travel designs will appear here. Plan your first getaway to see it in your journal.</p>
            <button onClick={() => navigate('/plan')} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Plan Your First Trip
            </button>
          </div>
        ) : (
          <div className="trips-grid">
            {savedTrips.map((trip) => (
              <div 
                key={trip._id} 
                className="trip-item-card glass-interactive" 
                onClick={() => handleViewSaved(trip)}
              >
                <div className="trip-card-image-wrapper">
                  <img 
                    src={trip.images && trip.images[0] ? trip.images[0] : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'} 
                    alt={trip.destination} 
                    className="trip-card-image"
                    loading="lazy"
                  />
                  <div className="trip-card-overlay">
                    <span className="trip-card-duration">⏱️ {trip.duration} {trip.duration === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
                <div className="trip-card-body">
                  <h3>{trip.destination}</h3>
                  <div className="trip-meta-row">
                    <span className="trip-meta-budget">💵 {trip.budget} Budget</span>
                    <span className="trip-meta-date">{new Date(trip.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="trip-card-actions">
                    <button 
                      onClick={(e) => handleDelete(e, trip._id)} 
                      className="btn btn-danger btn-sm"
                      title="Delete this plan"
                    >
                      Delete 🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
