// src/App.js
import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { jwtDecode } from "jwt-decode"; 

// Layouts
import AdminLayout from './components/layouts/AdminLayout';

// Admin Sections
import DashboardOverview from './components/adminSections/DashboardOverview';
import PendingPayments from './components/adminSections/PendingPayments';
import CreateRaffle from './components/adminSections/CreateRaffle';
import ActiveRaffles from './components/adminSections/ActiveRaffles';

// Pages
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import SelectNumbersPage from './pages/SelectNumbersPage';
import PaymentMethodPage from './pages/PaymentMethodPage';
import PaymentDetailsPage from './pages/PaymentDetailsPage';
import PaymentVerificationPage from './pages/PaymentVerificationPage';

// Socket Context
import { SocketProvider } from './contexts/SocketContext';

// Styles
import './assets/styles/App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  // Check authentication status
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          // Token expired, log out
          handleLogout();
          return;
        }

        // Set user state
        const isAdminValue = localStorage.getItem('isAdmin') === 'true';
        setIsAuthenticated(true);
        setIsAdmin(isAdminValue);
        setUser({
          id: decoded.userId,
          email: decoded.email,
          fullName: decoded.fullName,
          isAdmin: isAdminValue,
        });
      } catch (error) {
        console.error('Token validation error:', error);
        handleLogout();
      }
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
    }
    setLoading(false);
  }, [handleLogout]);

  // Check authentication status on initial render
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Protected route component for admin routes
  const ProtectedAdminRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  // Protected route component for user routes
  const ProtectedUserRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SocketProvider>
      <div className="app">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            success: {
              style: {
                background: '#10B981',
                color: 'white',
              },
            },
            error: {
              style: {
                background: '#EF4444',
                color: 'white',
              },
              duration: 5000,
            },
            loading: {
              style: {
                background: '#3B82F6',
                color: 'white',
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/select-numbers" element={<SelectNumbersPage />} />
          <Route path="/payment-method" element={<PaymentMethodPage />} />
          
          {/* Remove ProtectedUserRoute for payment-details */}
          <Route path="/payment-details" element={<PaymentDetailsPage />} />

          <Route 
            path="/payment-verification" 
            element={
              <ProtectedUserRoute>
                <PaymentVerificationPage />
              </ProtectedUserRoute>
            } 
          />

          {/* Login Route */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to={isAdmin ? "/admin" : "/"} replace />
              ) : (
                <Login />
              )
            } 
          />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedAdminRoute>
                <AdminLayout user={user} onLogout={handleLogout} />
              </ProtectedAdminRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="pending-payments" element={<PendingPayments />} />
            <Route path="create-raffle" element={<CreateRaffle />} />
            <Route path="active-raffles" element={<ActiveRaffles />} />
          </Route>

          {/* Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </SocketProvider>
  );
};

export default App;
