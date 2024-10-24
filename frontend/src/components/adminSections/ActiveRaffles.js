import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext'; // Updated to use the correct context
import '../../assets/styles/adminSections/ActiveRaffles.css';

const ActiveRaffles = () => {
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket(); // Get the socket from the context

  useEffect(() => {
    const fetchRaffles = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/raffle/active', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setRaffles(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching active raffles:', error);
        setError('Error loading active raffles');
        setLoading(false);
      }
    };

    fetchRaffles();

    // Set up socket listeners for real-time raffle updates
    socket.on('raffle_created', (data) => {
      setRaffles((prevRaffles) => [...prevRaffles, data]);
    });

    socket.on('raffle_updated', (data) => {
      setRaffles((prevRaffles) => 
        prevRaffles.map(raffle => raffle._id === data._id ? data : raffle)
      );
    });

    // Cleanup on component unmount
    return () => {
      socket.off('raffle_created');
      socket.off('raffle_updated');
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading active raffles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="active-raffles">
      <h2 className="page-title">Active Raffles</h2>
      <div className="raffles-grid">
        {raffles.length === 0 ? (
          <p className="no-raffles">No active raffles found</p>
        ) : (
          raffles.map((raffle) => (
            <div key={raffle._id} className="raffle-card">
              <img
                src={raffle.productImage}
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
                    <span className="value">${raffle.price}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Total Tickets:</span>
                    <span className="value">{raffle.totalTickets}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Sold:</span>
                    <span className="value">{raffle.soldTickets}</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress"
                    style={{ 
                      width: `${(raffle.soldTickets / raffle.totalTickets) * 100}%` 
                    }}
                  />
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
