import React, { useContext, useEffect, useState } from 'react';
import { SocketContext } from '../index';
import axios from 'axios';
import '../assets/styles/RaffleSection.css';

const RaffleSection = () => {
  const socket = useContext(SocketContext);
  const [raffleData, setRaffleData] = useState(null);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    // Fetch initial raffle data
    const fetchRaffleData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/raffle');
        setRaffleData(response.data);
      } catch (error) {
        console.error('Error fetching raffle data:', error);
      }
    };

    fetchRaffleData();

    // Fetch all tickets
    const fetchTickets = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/tickets');
        setTickets(response.data);
      } catch (error) {
        console.error('Error fetching tickets:', error);
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

    socket.on('ticketsReleased', (data) => {
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          data.tickets.includes(ticket.ticketNumber)
            ? { ...ticket, status: 'available' }
            : ticket
        )
      );
    });

    // Cleanup on unmount
    return () => {
      socket.off('ticketsReserved');
      socket.off('ticketsReleased');
    };
  }, [socket]);

  // Calculate ticket statistics
  const ticketStats = React.useMemo(() => {
    const soldCount = tickets.filter(t => t.status === 'sold').length;
    const reservedCount = tickets.filter(t => t.status === 'reserved').length;
    const availableCount = tickets.filter(t => t.status === 'available').length;
    return { soldCount, reservedCount, availableCount };
  }, [tickets]);

  return (
    <div className="raffle-section">
      {raffleData ? (
        <>
          <h2>{raffleData.productName}</h2>
          <img src={raffleData.productImage} alt={raffleData.productName} />
          <p>Price: ${raffleData.price}</p>
          <p>Total Tickets: {raffleData.totalTickets}</p>
          <p>Sold Tickets: {ticketStats.soldCount}</p>
          <p>Reserved Tickets: {ticketStats.reservedCount}</p>
          <p>Available Tickets: {ticketStats.availableCount}</p>
        </>
      ) : (
        <p>Loading raffle data...</p>
      )}

      {/* You can add more UI elements here to display or interact with tickets */}
    </div>
  );
};

export default RaffleSection;
