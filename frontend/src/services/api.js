// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Update if your backend URL is different

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Retrieve the token from localStorage

    // List of endpoints that require authentication
    const authRequiredEndpoints = [
      '/auth/protected-route', // Add your protected endpoints here
      '/payments/protected-route', // Example
      // Add more as needed
    ];

    // Check if the request URL requires authentication
    const requiresAuth = authRequiredEndpoints.some((endpoint) =>
      config.url.startsWith(endpoint)
    );

    if (token && requiresAuth) {
      config.headers['Authorization'] = `Bearer ${token}`; // Set the Authorization header
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Export API functions

//// AUTHENTICATION APIs ////

// Login with email and password
export const loginWithPassword = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Send login code to email
export const sendLoginCode = async (email) => {
  const response = await api.post('/auth/send-login-code', { email });
  return response.data;
};

// Verify login code and log in
export const verifyLoginCode = async (email, code) => {
  const response = await api.post('/auth/verify-login-code', { email, code });
  return response.data;
};

//// TICKETS APIs ////

// Get all tickets
export const getTickets = async () => {
  const response = await api.get('/tickets');
  return response.data;
};

// Reserve tickets
export const reserveTickets = async (userId, tickets) => {
  const response = await api.post('/tickets/reserve', { userId, tickets });
  return response.data;
};

// Confirm tickets
export const confirmTickets = async (userId, tickets) => {
  const response = await api.post('/tickets/confirm', { userId, tickets });
  return response.data;
};

//// PAYMENTS APIs ////

// Confirm payment
export const confirmPayment = async (formData) => {
  const response = await api.post('/payments/confirm', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Export the axios instance for direct use if needed
export default api;
