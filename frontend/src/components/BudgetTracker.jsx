import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './BudgetTracker.css';

const BudgetTracker = ({ itinerary, onUpdate, isSharedView, shareId, saveItinerary }) => {
  const rate = itinerary.currency?.rate || 1.0;
  const symbol = itinerary.currency?.symbol || '$';
  const code = itinerary.currency?.code || 'USD';

  const initialActual = itinerary.budgetTracker?.actual || {
    food: 0,
    accommodation: 0,
    transport: 0,
    activities: 0
  };

  const initialEstimated = itinerary.budgetTracker?.estimated || {
    food: 0,
    accommodation: 0,
    transport: 0,
    activities: 0
  };

  const [actual, setActual] = useState({
    food: Math.round(initialActual.food * rate),
    accommodation: Math.round(initialActual.accommodation * rate),
    transport: Math.round(initialActual.transport * rate),
    activities: Math.round(initialActual.activities * rate)
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Sync state if budget values are updated externally (e.g. via websockets)
  useEffect(() => {
    if (itinerary.budgetTracker?.actual) {
      setActual({
        food: Math.round(itinerary.budgetTracker.actual.food * rate),
        accommodation: Math.round(itinerary.budgetTracker.actual.accommodation * rate),
        transport: Math.round(itinerary.budgetTracker.actual.transport * rate),
        activities: Math.round(itinerary.budgetTracker.actual.activities * rate)
      });
    }
  }, [itinerary.budgetTracker?.actual, rate]);

  const estimated = {
    food: Math.round(initialEstimated.food * rate),
    accommodation: Math.round(initialEstimated.accommodation * rate),
    transport: Math.round(initialEstimated.transport * rate),
    activities: Math.round(initialEstimated.activities * rate)
  };

  const handleChange = (category, value) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setActual(prev => ({
      ...prev,
      [category]: numValue
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    // Convert local currency input back to USD for database persistence
    const actualUSD = {
      food: actual.food / rate,
      accommodation: actual.accommodation / rate,
      transport: actual.transport / rate,
      activities: actual.activities / rate
    };

    try {
      let currentItinerary = itinerary;
      
      // Auto-save the itinerary first if it doesn't exist in the database yet
      if (!currentItinerary._id && !isSharedView) {
        if (saveItinerary) {
          setMessage('Saving itinerary first...');
          const savedResult = await saveItinerary();
          if (!savedResult || !savedResult._id) {
            setError('Failed to save itinerary to dashboard.');
            setSaving(false);
            return;
          }
          currentItinerary = savedResult;
        } else {
          setError('Please save the itinerary using the button at the top first.');
          setSaving(false);
          return;
        }
      }

      let updatedItinerary;
      if (isSharedView && shareId) {
        const res = await api.post(`/itinerary/shared/${shareId}/save`, {
          budgetTracker: {
            ...currentItinerary.budgetTracker,
            actual: actualUSD
          }
        });
        updatedItinerary = res.data;
      } else {
        const res = await api.put(`/itinerary/${currentItinerary._id}/budget`, {
          actual: actualUSD
        });
        updatedItinerary = res.data;
      }

      setMessage('Spend logs saved successfully!');
      if (onUpdate) {
        onUpdate(updatedItinerary);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update budget.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { key: 'food', label: 'Food & Drinks 🍜', est: estimated.food, act: actual.food },
    { key: 'accommodation', label: 'Accommodation 🏨', est: estimated.accommodation, act: actual.accommodation },
    { key: 'transport', label: 'Local Transport 🚌', est: estimated.transport, act: actual.transport },
    { key: 'activities', label: 'Activities & Sightseeing 🎟️', est: estimated.activities, act: actual.activities }
  ];

  const totalEstimated = estimated.food + estimated.accommodation + estimated.transport + estimated.activities;
  const totalActual = actual.food + actual.accommodation + actual.transport + actual.activities;
  const totalPercent = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;
  const isOverBudget = totalActual > totalEstimated;

  const isOldItinerary = !itinerary.budgetTracker?.estimated;

  return (
    <div className="budget-tracker-container glass animate-fade-in">
      <div className="budget-header">
        <h2>💰 Budget Tracking ({code})</h2>
        <p className="budget-desc">
          Compare the AI-estimated costs against your logged actual spending.
        </p>
      </div>

      {isOldItinerary && (
        <div className="alert alert-info">
          ℹ️ This is an older trip without pre-generated AI budget estimates. You can still log and track your actual spend!
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Summary Card */}
      <div className={`budget-summary-card glass ${isOverBudget ? 'over-budget' : ''}`}>
        <div className="summary-col">
          <span className="summary-label">Estimated Total</span>
          <span className="summary-value est">{symbol}{totalEstimated.toLocaleString()}</span>
        </div>
        <div className="summary-col">
          <span className="summary-label">Actual Total</span>
          <span className="summary-value act">{symbol}{totalActual.toLocaleString()}</span>
        </div>
        <div className="summary-col">
          <span className="summary-label">Remaining</span>
          <span className={`summary-value diff ${isOverBudget ? 'negative' : 'positive'}`}>
            {isOverBudget ? '-' : ''}{symbol}{Math.abs(totalEstimated - totalActual).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main progress bar */}
      {totalEstimated > 0 && (
        <div className="total-progress-section">
          <div className="progress-labels">
            <span>Overall Budget Status</span>
            <span>{totalPercent.toFixed(0)}% Used</span>
          </div>
          <div className="progress-track">
            <div 
              className={`progress-fill ${isOverBudget ? 'overflow' : ''}`}
              style={{ width: `${Math.min(100, totalPercent)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Category Breakdown Table/Rows */}
      <div className="budget-rows-container">
        {categories.map((cat) => {
          const percent = cat.est > 0 ? (cat.act / cat.est) * 100 : 0;
          const overCatLimit = cat.act > cat.est && cat.est > 0;
          
          return (
            <div key={cat.key} className="budget-category-row glass">
              <div className="row-info-col">
                <span className="cat-label">{cat.label}</span>
                <div className="cat-values">
                  <span className="cat-est-val">Estimate: {symbol}{cat.est.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="row-input-col">
                <label className="input-label">Actual Spend</label>
                <div className="input-with-symbol">
                  <span className="currency-prefix">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={cat.act || ''}
                    onChange={(e) => handleChange(cat.key, e.target.value)}
                    placeholder="0"
                    className="spend-input"
                  />
                </div>
              </div>

              {cat.est > 0 && (
                <div className="row-progress-col">
                  <div className="cat-progress-meta">
                    <span>{percent.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track sm">
                    <div 
                      className={`progress-fill ${overCatLimit ? 'overflow' : ''}`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="budget-actions">
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="btn btn-primary btn-save-budget"
        >
          {saving ? 'Saving Budget Spend...' : '💾 Save Actual Spend'}
        </button>
      </div>
    </div>
  );
};

export default BudgetTracker;
