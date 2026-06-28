import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PlanTrip from './pages/PlanTrip';
import ItineraryResult from './pages/ItineraryResult';
import './App.css';

// Protected Route Wrapper for logged in users only
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="session-loading">
        <div className="spinner">
          <div className="spinner-inner"></div>
        </div>
        <p>Verifying secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/plan" 
              element={
                <ProtectedRoute>
                  <PlanTrip />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/itinerary-result" 
              element={
                <ProtectedRoute>
                  <ItineraryResult />
                </ProtectedRoute>
              } 
            />
            
            {/* Shared Route */}
            <Route path="/shared/:shareId" element={<ItineraryResult />} />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
