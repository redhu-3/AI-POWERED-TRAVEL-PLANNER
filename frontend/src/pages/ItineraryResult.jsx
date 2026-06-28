import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import BudgetTracker from '../components/BudgetTracker';
import './ItineraryResult.css';

const ItineraryResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shareId } = useParams();
  const { user } = useContext(AuthContext);

  // Retrieve itinerary and setup from router navigation state
  const stateData = location.state || {};
  const [itinerary, setItinerary] = useState(stateData.itinerary || null);
  const [originalPayload, setOriginalPayload] = useState(stateData.originalPayload || null);
  const [isSaved, setIsSaved] = useState(stateData.isSaved || false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary', 'lodging', 'tips'
  
  // Real-time state
  const [activeCollaborators, setActiveCollaborators] = useState('');
  const socketRef = useRef(null);

  // Specific day indices currently regenerating
  const [regeneratingDays, setRegeneratingDays] = useState([]);

  // Fetch shared itinerary if loaded directly via URL
  useEffect(() => {
    if (shareId && !itinerary) {
      const fetchShared = async () => {
        try {
          const res = await api.get(`/itinerary/shared/${shareId}`);
          setItinerary(res.data);
          setIsSaved(true);
        } catch (err) {
          setSaveError('Shared itinerary not found or unavailable.');
          console.error(err);
        }
      };
      fetchShared();
    }
  }, [shareId, itinerary]);

  // Setup Socket connection
  useEffect(() => {
    const tripId = itinerary?._id || shareId;
    if (tripId) {
      const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
      socketRef.current = io(socketUrl);
      
      socketRef.current.emit('join_trip', tripId);
      
      socketRef.current.on('itinerary_updated', (updatedItinerary) => {
        setItinerary(updatedItinerary);
      });
      
      socketRef.current.on('collaborator_active', (username) => {
        setActiveCollaborators(`${username} is updating the plan...`);
        setTimeout(() => setActiveCollaborators(''), 5000);
      });

      return () => socketRef.current.disconnect();
    }
  }, [itinerary?._id, shareId]);

  // Redirect if no itinerary data is available
  useEffect(() => {
    if (!itinerary && !shareId && !saveError) {
      navigate('/dashboard');
    }
  }, [itinerary, navigate, shareId, saveError]);

  if (!itinerary) {
    return saveError ? (
      <div className="result-page-container">
        <div className="alert alert-danger">{saveError}</div>
      </div>
    ) : null;
  }

  // Currency Converter Helper
  const formatCost = (costStr) => {
    if (!costStr) return '';
    // Extract numerical digits e.g. "$40" or "40" -> 40
    const match = costStr.match(/\d+/);
    if (!match) return costStr;
    const usdVal = parseFloat(match[0]);
    
    const { code, symbol, rate } = itinerary.currency || { code: 'USD', symbol: '$', rate: 1.0 };
    if (code === 'USD' || rate === 1.0) {
      return costStr;
    }

    const localVal = (usdVal * rate).toFixed(0);
    return `${costStr} (${symbol}${localVal} ${code})`;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveMessage('');

    try {
      const res = await api.post('/itinerary/save', itinerary);
      setIsSaved(true);
      setItinerary(res.data); // Update with database object (contains _id)
      setSaveMessage('Itinerary saved to your dashboard successfully!');
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save itinerary.');
      console.error(err);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExportingPdf(true);
    setSaveError('');
    setSaveMessage('');

    try {
      let currentItinerary = itinerary;
      
      // If it's not saved yet, we need to save it first to get an _id
      if (!isSaved || !currentItinerary._id) {
        setSaveMessage('Saving itinerary to dashboard before generating PDF...');
        const savedItinerary = await handleSave();
        if (!savedItinerary) {
          setExportingPdf(false);
          return;
        }
        currentItinerary = savedItinerary;
      }

      setSaveMessage('Generating PDF...');
      const response = await api.get(`/itinerary/${currentItinerary._id}/export-pdf`, {
        responseType: 'blob' // Important to handle the binary stream
      });

      // Create a Blob from the response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${currentItinerary.destination.replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSaveMessage('PDF downloaded successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveError('Failed to export PDF.');
      console.error('PDF export error:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    setSaveError('');
    try {
      let currentItinerary = itinerary;
      if (!isSaved || !currentItinerary._id) {
        currentItinerary = await handleSave();
        if (!currentItinerary) {
          setSharing(false);
          return;
        }
      }

      const res = await api.post(`/itinerary/${currentItinerary._id}/share`);
      const newShareId = res.data.shareId;
      const shareUrl = `${window.location.origin}/shared/${newShareId}`;
      
      await navigator.clipboard.writeText(shareUrl);
      setSaveMessage('Share link copied to clipboard! Share it with friends to collaborate.');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (err) {
      setSaveError('Failed to generate share link. Ensure you are the owner.');
      console.error(err);
    } finally {
      setSharing(false);
    }
  };

  const handleRegenerateDay = async (dayNumber) => {
    // Notify others that someone is actively editing
    if (socketRef.current) {
      socketRef.current.emit('user_active', {
        tripId: itinerary._id || shareId,
        username: user?.name || 'A collaborator'
      });
    }

    // Add dayNumber to regenerating list
    setRegeneratingDays([...regeneratingDays, dayNumber]);

    try {
      const payload = {
        destination: itinerary.destination,
        budget: itinerary.budget || originalPayload?.budget || 'Medium',
        interests: itinerary.interests || originalPayload?.interests || ['Food', 'Sightseeing'],
        weatherCondition: itinerary.weather?.condition || 'Mild',
        dayNumber
      };

      const res = await api.post('/itinerary/regenerate-day', payload);
      const regeneratedDay = res.data;

      // Update days array in state
      const updatedDays = itinerary.days.map(d => {
        if (d.day === dayNumber) {
          return {
            ...d,
            morning: regeneratedDay.morning,
            afternoon: regeneratedDay.afternoon,
            evening: regeneratedDay.evening,
            foodRecommendation: regeneratedDay.foodRecommendation,
            estimatedCost: regeneratedDay.estimatedCost
          };
        }
        return d;
      });

      const updatedItinerary = {
        ...itinerary,
        days: updatedDays
      };

      // Broadcast the update via socket
      if (socketRef.current) {
        socketRef.current.emit('edit_itinerary', {
          tripId: itinerary._id || shareId,
          itinerary: updatedItinerary
        });
      }

      // If accessed via a share link, save changes to the shared endpoint
      if (shareId) {
        await api.post(`/itinerary/shared/${shareId}/save`, updatedItinerary);
      } else if (isSaved && itinerary._id) {
        // If already saved in database and not a shared link, sync changes to DB via owner route
        await api.post('/itinerary/save', updatedItinerary); 
      }

      setItinerary(updatedItinerary);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to regenerate Day ${dayNumber}.`);
      console.error(err);
    } finally {
      // Remove dayNumber from regenerating list
      setRegeneratingDays(prev => prev.filter(d => d !== dayNumber));
    }
  };

  return (
    <div className="result-page-container animate-fade-in">
      {/* Top Banner Image Slider / Grid */}
      <div className="destination-hero">
        <div className="hero-images-grid">
          {itinerary.images && itinerary.images.slice(0, 3).map((img, idx) => (
            <div key={idx} className={`hero-image-wrapper img-idx-${idx}`}>
              <img src={img} alt={`${itinerary.destination} view ${idx + 1}`} loading="lazy" />
            </div>
          ))}
          <div className="hero-overlay-gradient"></div>
        </div>

        <div className="hero-text-overlay">
          <div className="hero-meta">
            <span className="dest-tag">📍 Destination</span>
            <h1>{itinerary.destination}</h1>
            <p className="trip-summary-line">
              ⏱️ {itinerary.duration} {itinerary.duration === 1 ? 'Day' : 'Days'} Trip &nbsp;|&nbsp; 💵 {itinerary.budget || originalPayload?.budget || 'Custom'} Budget
            </p>
          </div>

          {/* Weather Widget */}
          {itinerary.weather && (
            <div className="live-weather-widget glass">
              <div className="weather-header-row">
                <span className="weather-live-tag">LIVE WEATHER</span>
                <span className="weather-icon-indicator">
                  <img 
                    src={`https://openweathermap.org/img/wn/${itinerary.weather.icon}@2x.png`} 
                    alt={itinerary.weather.condition} 
                    className="weather-img-icon"
                  />
                </span>
              </div>
              <div className="weather-temp-row">
                <span className="weather-temp-number">{itinerary.weather.temp}°C</span>
                <span className="weather-condition-text">{itinerary.weather.condition}</span>
              </div>
              <p className="weather-forecast-line">{itinerary.weather.forecast}</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Collaborators Presence Indicator */}
      {activeCollaborators && (
        <div className="alert alert-info animate-fade-in" style={{ textAlign: 'center', marginBottom: '1rem', background: 'rgba(63, 167, 150, 0.15)', borderColor: 'rgba(63, 167, 150, 0.4)', color: '#EDE6F0' }}>
          ✨ {activeCollaborators}
        </div>
      )}

      {/* Save Status Banners */}
      <div className="action-status-section">
        {saveMessage && <div className="alert alert-success">{saveMessage}</div>}
        {saveError && <div className="alert alert-danger">{saveError}</div>}
        
        <div className="top-action-bar">
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            ◀ Back to Dashboard
          </button>
          
          <button 
            onClick={handleShare}
            disabled={sharing || saving}
            className="btn btn-secondary"
            title="Generate a real-time shareable link for this trip"
          >
            {sharing ? 'Generating...' : '🔗 Share Trip'}
          </button>

          <button 
            onClick={handleDownloadPDF} 
            disabled={exportingPdf || saving} 
            className="btn btn-secondary"
            title="Download this itinerary as a beautifully formatted PDF"
          >
            {exportingPdf ? '⏳ Generating PDF...' : '📄 Download PDF'}
          </button>
          
          {!isSaved ? (
            <button onClick={handleSave} disabled={saving || exportingPdf} className="btn btn-primary">
              {saving ? 'Saving...' : '💾 Save Itinerary'}
            </button>
          ) : (
            <span className="saved-badge">✓ Saved to History</span>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav glass">
        <button 
          className={`tab-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
          onClick={() => setActiveTab('itinerary')}
        >
          📅 Day-by-Day Plan
        </button>
        <button 
          className={`tab-btn ${activeTab === 'lodging' ? 'active' : ''}`}
          onClick={() => setActiveTab('lodging')}
        >
          🏨 Accommodation
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tips' ? 'active' : ''}`}
          onClick={() => setActiveTab('tips')}
        >
          💡 Travel Tips
        </button>
        <button 
          className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => setActiveTab('budget')}
        >
          💰 Budget Tracker
        </button>
      </div>

      {/* Tabs Content */}
      <div className="tabs-content-area">
        {activeTab === 'itinerary' && (
          <div className="itinerary-timeline">
            {itinerary.days.map((dayObj) => {
              const isRegenerating = regeneratingDays.includes(dayObj.day);
              
              return (
                <div key={dayObj.day} className={`timeline-day-card glass ${isRegenerating ? 'card-loading' : ''}`}>
                  <div className="day-card-header">
                    <div className="day-number-badge">Day {dayObj.day}</div>
                    
                    <button 
                      className="btn btn-secondary btn-sm regenerate-card-btn" 
                      onClick={() => handleRegenerateDay(dayObj.day)}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? 'Regenerating... 🔄' : 'Regenerate Day ✦'}
                    </button>
                  </div>

                  {isRegenerating ? (
                    <div className="card-regeneration-skeleton">
                      <div className="skeleton-line skeleton"></div>
                      <div className="skeleton-line skeleton"></div>
                      <div className="skeleton-line skeleton"></div>
                    </div>
                  ) : (
                    <div className="day-card-body-details">
                      <div className="day-schedule-item">
                        <span className="schedule-time morning-tag">🌅 Morning</span>
                        <p className="schedule-text">{dayObj.morning}</p>
                      </div>

                      <div className="day-schedule-item">
                        <span className="schedule-time afternoon-tag">☀️ Afternoon</span>
                        <p className="schedule-text">{dayObj.afternoon}</p>
                      </div>

                      <div className="day-schedule-item">
                        <span className="schedule-time evening-tag">🌙 Evening</span>
                        <p className="schedule-text">{dayObj.evening}</p>
                      </div>

                      <div className="day-card-footer-info">
                        <div className="footer-info-item">
                          <span className="footer-info-label">🍜 Culinary Pick</span>
                          <p className="footer-info-value">{dayObj.foodRecommendation}</p>
                        </div>
                        <div className="footer-info-item">
                          <span className="footer-info-label">💵 Activities Cost</span>
                          <p className="footer-info-value highlight-price">{formatCost(dayObj.estimatedCost)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'lodging' && (
          <div className="lodging-recommendations-list">
            <h2 className="tab-section-title">Recommended Accommodations</h2>
            <p className="tab-section-sub">Stays curated based on your budget and destination profile</p>
            <div className="lodging-grid">
              {itinerary.accommodationSuggestions && itinerary.accommodationSuggestions.map((hotel, idx) => (
                <div key={idx} className="lodging-card glass-interactive">
                  <div className="lodging-icon">🏨</div>
                  <p className="lodging-desc">{hotel}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="travel-tips-container">
            <h2 className="tab-section-title">Essential Destination Tips</h2>
            <p className="tab-section-sub">Important local rules, safety guidelines, and customs information</p>
            <ul className="tips-list">
              {itinerary.travelTips && itinerary.travelTips.map((tip, idx) => (
                <li key={idx} className="tip-item glass">
                  <span className="tip-bullet">✦</span>
                  <p>{tip}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'budget' && (
          <BudgetTracker 
            itinerary={itinerary} 
            isSharedView={!!shareId} 
            shareId={shareId} 
            saveItinerary={handleSave}
            onUpdate={(updated) => {
              setItinerary(updated);
              if (socketRef.current) {
                socketRef.current.emit('edit_itinerary', {
                  tripId: itinerary._id || shareId,
                  itinerary: updated
                });
              }
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default ItineraryResult;
