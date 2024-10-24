// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom'; // Changed useLocation to Navigate
import axios from 'axios';
import '../assets/styles/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already authenticated
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // If already authenticated, redirect immediately
  if (token) {
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      
      if (response.data.token) {
        // Store token and admin status
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('isAdmin', response.data.isAdmin.toString()); // Ensure boolean is stored as string
        
        if (response.data.user) {
          localStorage.setItem('userData', JSON.stringify(response.data.user));
        }

        // Navigate based on admin status
        navigate(response.data.isAdmin ? '/admin' : '/', { replace: true });
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Iniciar Sesión</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={loading ? 'loading' : ''}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
