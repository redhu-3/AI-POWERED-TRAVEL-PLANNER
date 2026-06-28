import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Login.css'; // Reuse auth stylesheet

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else {
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!hasLetter || !hasNumber) {
        errors.password = 'Password must contain at least one letter and one number';
      }
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
      } else {
        setLocalError(err.message || 'Signup failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      <div className="auth-card glass">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Discover tailor-made routes with Gemini AI</p>

        {localError && <div className="alert alert-danger">{localError}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
              placeholder="Alex Mercer"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors(prev => ({ ...prev, name: '' }));
              }}
              disabled={submitting}
              required
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors(prev => ({ ...prev, email: '' }));
              }}
              disabled={submitting}
              required
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="At least 8 characters with letter & number"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors(prev => ({ ...prev, password: '' }));
              }}
              disabled={submitting}
              required
            />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
              }}
              disabled={submitting}
              required
            />
            {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
      <div className="auth-bg-glow"></div>
    </div>
  );
};

export default Signup;
