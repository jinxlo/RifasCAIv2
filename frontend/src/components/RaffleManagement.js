// src/components/RaffleManagement.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../assets/styles/RaffleManagement.css';

const RaffleManagement = () => {
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    productImage: '',
    price: '',
    totalTickets: '1000'
  });

  // Fetch existing raffles
  const fetchRaffles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/raffle/all');
      setRaffles(response.data);
    } catch (error) {
      console.error('Error fetching raffles:', error);
      setError('Failed to fetch raffles');
    }
  };

  useEffect(() => {
    fetchRaffles();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/raffle/create',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Clear form and refresh raffle list
      setFormData({
        productName: '',
        productImage: '',
        price: '',
        totalTickets: '1000'
      });
      await fetchRaffles();
      alert('Raffle created successfully!');
    } catch (error) {
      console.error('Error creating raffle:', error);
      setError(error.response?.data?.message || 'Failed to create raffle');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (raffleId) => {
    if (!window.confirm('Are you sure you want to delete this raffle?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/raffle/${raffleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchRaffles();
    } catch (error) {
      console.error('Error deleting raffle:', error);
      setError('Failed to delete raffle');
    }
  };

  return (
    <div className="raffle-management">
      <h2>Raffle Management</h2>

      {/* Create Raffle Form */}
      <div className="create-raffle-section">
        <h3>Create New Raffle</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="productName">Product Name</label>
            <input
              type="text"
              id="productName"
              name="productName"
              value={formData.productName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="productImage">Product Image URL</label>
            <input
              type="text"
              id="productImage"
              name="productImage"
              value={formData.productImage}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Ticket Price (USD)</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="totalTickets">Total Tickets</label>
            <input
              type="number"
              id="totalTickets"
              name="totalTickets"
              value={formData.totalTickets}
              onChange={handleInputChange}
              min="1"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Creating...' : 'Create Raffle'}
          </button>
        </form>
      </div>

      {/* Existing Raffles */}
      <div className="existing-raffles">
        <h3>Existing Raffles</h3>
        {raffles.length === 0 ? (
          <p>No raffles created yet.</p>
        ) : (
          <div className="raffles-grid">
            {raffles.map(raffle => (
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
                <div className="raffle-info">
                  <h4>{raffle.productName}</h4>
                  <p>Price: ${raffle.price}</p>
                  <p>Total Tickets: {raffle.totalTickets}</p>
                  <p>Status: {raffle.active ? 'Active' : 'Inactive'}</p>
                  <div className="raffle-stats">
                    <p>Sold: {raffle.soldTickets}</p>
                    <p>Reserved: {raffle.reservedTickets}</p>
                  </div>
                </div>
                <div className="raffle-actions">
                  <button
                    onClick={() => handleDelete(raffle._id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RaffleManagement;