import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../services/socket';
import '../assets/styles/SelectNumbersPage.css';

const SelectNumbersPage = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [error, setError] = useState(null); // Error state to handle warnings and issues
  const navigate = useNavigate();
  const ticketPrice = 10; // Price per ticket

  useEffect(() => {
    // Fetch initial ticket data
    const fetchTickets = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/tickets');
        setTickets(response.data);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('Error fetching tickets, please try again later.');
      }
    };

    fetchTickets();

    // Set up Socket.io listeners for real-time updates
    socket.on('ticketsReserved', (data) => {
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          data.tickets.includes(ticket.ticketNumber)
            ? { ...ticket, status: 'reserved' }
            : ticket
        )
      );
    });

    // Cleanup on unmount
    return () => {
      socket.off('ticketsReserved');
    };
  }, []); // UseEffect now runs only once after the component mounts

  const handleNumberClick = (number) => {
    setError(null);

    if (selectedNumbers.includes(number)) {
      // Remove from selected tickets
      setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
    } else {
      setSelectedNumbers([...selectedNumbers, number]);
    }
  };

  const handleContinue = async () => {
    setError(null);

    if (selectedNumbers.length === 0) {
      setError("Please select at least one ticket to continue.");
      return;
    }

    try {
      // Proceed to payment method page without reserving tickets
      navigate('/payment-method', { state: { selectedNumbers } });
    } catch (error) {
      console.error('Error proceeding to payment:', error);
      setError('Error proceeding to payment, please try again later.');
    }
  };

  return (
    <div className="select-numbers-page">
      {error && <div className="error-message">{error}</div>} {/* Display error message if any */}
      
      <div className="numbers-grid">
        {tickets.map((ticket) => (
          <button
            key={ticket.ticketNumber}
            className={`number-button ${
              selectedNumbers.includes(ticket.ticketNumber) ? 'selected' : ''
            } ${
              ticket.status === 'reserved' || ticket.status === 'sold' ? 'unavailable' : ''
            }`}
            onClick={() => handleNumberClick(ticket.ticketNumber)}
            disabled={ticket.status === 'reserved' || ticket.status === 'sold'}
          >
            {ticket.ticketNumber}
          </button>
        ))}
      </div>

      {/* Sticky Summary */}
      <div className="sticky-summary">
        <p>Total Amount: ${selectedNumbers.length * ticketPrice}</p>
        <p>Selected Numbers: {selectedNumbers.join(', ') || 'None'}</p>
        <button onClick={handleContinue} disabled={selectedNumbers.length === 0}>
          Continue to Payment
        </button>
      </div>
    </div>
  );
};

export default SelectNumbersPage;
