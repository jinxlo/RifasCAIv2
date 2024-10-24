import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import '../../assets/styles/adminSections/ActiveRaffles.css';

const ActiveRaffles = () => {
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    const fetchRaffles = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/raffle/active', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Ensure we're setting an array of raffles
        if (response.data && response.data.raffles) {
          setRaffles(Array.isArray(response.data.raffles) ? response.data.raffles : []);
        } else {
          setRaffles([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching active raffles:', error);
        setError(error.response?.data?.message || 'Error loading active raffles');
        setLoading(false);
      }
    };

    fetchRaffles();

    // Socket event handlers
    const handleRaffleCreated = (data) => {
      console.log('New raffle created:', data);
      setRaffles((prevRaffles) => {
        // Ensure prevRaffles is an array
        const currentRaffles = Array.isArray(prevRaffles) ? prevRaffles : [];
        return [...currentRaffles, data];
      });
    };

    const handleRaffleUpdated = (data) => {
      console.log('Raffle updated:', data);
      setRaffles((prevRaffles) => {
        // Ensure prevRaffles is an array
        const currentRaffles = Array.isArray(prevRaffles) ? prevRaffles : [];
        return currentRaffles.map(raffle => 
          raffle._id === data._id ? data : raffle
        );
      });
    };

    // Set up socket listeners
    socket.on('raffle_created', handleRaffleCreated);
    socket.on('raffle_updated', handleRaffleUpdated);

    // Cleanup
    return () => {
      socket.off('raffle_created', handleRaffleCreated);
      socket.off('raffle_updated', handleRaffleUpdated);
    };
  }, [socket]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="active-raffles">
        <h2 className="page-title">Active Raffles</h2>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading active raffles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="active-raffles">
        <h2 className="page-title">Active Raffles</h2>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="active-raffles">
      <h2 className="page-title">Active Raffles</h2>
      <div className="raffles-grid">
        {!Array.isArray(raffles) || raffles.length === 0 ? (
          <div className="no-raffles">
            <p>No active raffles found</p>
          </div>
        ) : (
          raffles.map((raffle) => (
            <div key={raffle._id} className="raffle-card">
              <img
                src={`http://localhost:5000${raffle.productImage}`}
                alt={raffle.productName}
                className="raffle-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-image.jpg';
                }}
              />
              <div className="raffle-details">
                <h3>{raffle.productName}</h3>
                <p className="description">{raffle.description}</p>
                <div className="stats">
                  <div className="stat-item">
                    <span className="label">Price:</span>
                    <span className="value">{formatCurrency(raffle.price)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Total Tickets:</span>
                    <span className="value">{raffle.totalTickets}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Sold:</span>
                    <span className="value">{raffle.soldTickets || 0}</span>
                  </div>
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress"
                      style={{ 
                        width: `${((raffle.soldTickets || 0) / raffle.totalTickets) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {Math.round(((raffle.soldTickets || 0) / raffle.totalTickets) * 100)}% Sold
                  </span>
                </div>
                <div className="raffle-status">
                  <span className={`status-badge ${raffle.active ? 'active' : 'inactive'}`}>
                    {raffle.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveRaffles;