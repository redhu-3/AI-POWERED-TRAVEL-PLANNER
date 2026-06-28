import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar glass">
      <div className="navbar-container">
        <Link to={user ? "/dashboard" : "/"} className="navbar-logo" onClick={closeMenu}>
          <span className="logo-spark">✦</span> TripCraft <span className="gradient-text">AI</span>
        </Link>

        {/* Desktop Menu */}
        <div className="navbar-menu">
          {!user && (
            <Link to="/" className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
          )}
          
          {user ? (
            <>
              <Link to="/dashboard" className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                My Trips
              </Link>
              <Link to="/plan" className={`navbar-link ${location.pathname === '/plan' ? 'active' : ''}`}>
                Plan New Trip
              </Link>
              <div className="navbar-user-section">
                <span className="user-greeting">Hi, {user.name}</span>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="navbar-auth-buttons">
              <Link to="/login" className={`navbar-link ${location.pathname === '/login' ? 'active' : ''}`}>
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Hamburger Button (mobile only) */}
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu-open' : ''}`}>
        {!user && (
          <Link
            to="/"
            className={`mobile-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Home
          </Link>
        )}

        {user ? (
          <>
            <Link
              to="/dashboard"
              className={`mobile-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              My Trips
            </Link>
            <Link
              to="/plan"
              className={`mobile-link ${location.pathname === '/plan' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Plan New Trip
            </Link>
            <div className="mobile-user-row">
              <span className="mobile-greeting">Hi, {user.name}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="mobile-auth-row">
            <Link to="/login" className="btn btn-secondary" onClick={closeMenu}>
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary" onClick={closeMenu}>
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
