// src/components/RaffleCard.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { SocketContext } from '../index';
import { toast } from 'react-hot-toast';
import '../assets/styles/RaffleCard.css';

const RaffleCard = ({ onBuyTickets }) => {
  const { socket } = useContext(SocketContext);
  
  const [raffleItem, setRaffleItem] = useState({
    _id: '',
    productName: 'Loading...',
    description: '',
    productImage: '',
    price: 0,
    totalTickets: 0,
    soldTickets: 0,
    reservedTickets: 0,
    ticketStats: {}
  });

  const [ticketsAvailable, setTicketsAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Calculate available tickets and update statistics
  const updateAvailableTickets = useCallback((data) => {
    const available = data.totalTickets - (data.soldTickets + data.reservedTickets);
    setTicketsAvailable(available);
    setLastUpdate(new Date());
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Fetch raffle data
  const fetchRaffleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching raffle data...');
      
      const response = await axios.get('http://localhost:5000/api/raffle');
      console.log('Raffle data received:', response.data);
      
      if (response.data) {
        setRaffleItem(response.data);
        updateAvailableTickets(response.data);
        toast.success('Rifa cargada exitosamente');
      } else {
        const errorMsg = 'No hay rifas activas';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al cargar la rifa';
      console.error('Error fetching raffle:', error);
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [updateAvailableTickets]);

  useEffect(() => {
    fetchRaffleData();

    // Definir los manejadores de eventos
    const handleRaffleCreated = (newRaffle) => {
      console.log('New raffle created:', newRaffle);
      setRaffleItem(newRaffle);
      updateAvailableTickets(newRaffle);
      toast.success('¡Nueva rifa creada!');
    };

    const handleRaffleUpdated = (updatedRaffle) => {
      console.log('Raffle updated:', updatedRaffle);
      if (updatedRaffle._id === raffleItem._id) {
        setRaffleItem(updatedRaffle);
        updateAvailableTickets(updatedRaffle);
        toast.success('Rifa actualizada');
      }
    };

    // Registrar los eventos
    socket.on('raffle_created', handleRaffleCreated);
    socket.on('raffle_updated', handleRaffleUpdated);

    // Cleanup al desmontar el componente
    return () => {
      socket.off('raffle_created', handleRaffleCreated);
      socket.off('raffle_updated', handleRaffleUpdated);
    };
  }, [socket, raffleItem._id, updateAvailableTickets, fetchRaffleData]);

  // Handle buy tickets click
  const handleBuyClick = () => {
    if (ticketsAvailable > 0) {
      onBuyTickets(1);
    } else {
      toast.error('No hay tickets disponibles');
    }
  };

  // Calculate progress percentage
  const progress = Math.min(
    ((raffleItem.totalTickets - ticketsAvailable) / raffleItem.totalTickets) * 100,
    100
  );

  if (loading) {
    return (
      <div className="raffle-card loading">
        <div className="loading-spinner"></div>
        <p>Cargando rifa...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="raffle-card error">
        <p className="error-message">{error}</p>
        <button 
          className="retry-button"
          onClick={fetchRaffleData}
        >
          Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className="raffle-card">
      <img
        src={raffleItem.productImage}
        alt={raffleItem.productName}
        className="raffle-image"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/placeholder-image.jpg';
          toast.error('Error al cargar la imagen');
        }}
      />

      <h2 className="raffle-name">{raffleItem.productName}</h2>
      
      {raffleItem.description && (
        <p className="raffle-description">{raffleItem.description}</p>
      )}

      <div className="raffle-info">
        <p className="raffle-price">
          Precio por Ticket: <span>{formatCurrency(raffleItem.price)}</span>
        </p>
        <p className="raffle-tickets">
          Tickets Disponibles: <span>{ticketsAvailable}</span>
        </p>
        <p className="raffle-total-tickets">
          Tickets Total: <span>{raffleItem.totalTickets}</span>
        </p>
      </div>

      <div className="ticket-stats">
        <div className="stat-item">
          <span className="stat-label">Vendidos</span>
          <span className="stat-value sold">{raffleItem.soldTickets}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Reservados</span>
          <span className="stat-value reserved">{raffleItem.reservedTickets}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Disponibles</span>
          <span className="stat-value available">{ticketsAvailable}</span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div
            className="progress"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="progress-text">
          {`${Math.floor(progress)}% Vendido`}
        </p>
      </div>

      <button
        className="buy-ticket-button"
        onClick={handleBuyClick}
        disabled={ticketsAvailable === 0}
      >
        {ticketsAvailable > 0 ? 'Comprar Tickets' : 'Agotado'}
      </button>

      {lastUpdate && (
        <p className="last-updated">
          Última actualización: {new Date(lastUpdate).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default RaffleCard;
