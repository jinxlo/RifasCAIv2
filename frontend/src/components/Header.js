// Header.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCircle } from 'lucide-react'; // Use an alternative icon library if needed
import { useNavigate } from 'react-router-dom';
import '../assets/styles/Header.css';

export default function Header() {
  const [isHovered, setIsHovered] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check authentication status on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    // Clear token and update authentication state
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    setIsAuthenticated(false);
    navigate('/');
  };

  return (
    <header className="header bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <a href="/" className="flex-shrink-0">
            <img
              className="h-6 w-auto max-w-[100px] object-contain" // Adjusted height and max width for smaller logo
              src="/cailogo.png"
              alt="Your Logo"
            />
          </a>

          {/* Login/Logout Button Section with Motion Effects */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            {isAuthenticated ? (
              <button
                className="logout-button flex items-center space-x-2"
                onClick={handleLogout}
              >
                <motion.div
                  animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <UserCircle className="h-5 w-5" />
                </motion.div>
                <span>Logout</span>
              </button>
            ) : (
              <button
                className="login-button flex items-center space-x-2"
                onClick={handleLogin}
              >
                <motion.div
                  animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <UserCircle className="h-5 w-5" />
                </motion.div>
                <span>Login</span>
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  );
}
