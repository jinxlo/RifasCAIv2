import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Users, Package } from 'lucide-react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext'; // Update the socket import
import '../../assets/styles/adminSections/DashboardOverview.css';

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    confirmedPayments: 0,
    activeRaffles: 0,
    salesGrowth: 0,
    paymentsGrowth: 0,
    rafflesGrowth: 0
  });
  const socket = useSocket(); // Directly access the socket from context

  // Safe number formatting functions
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatGrowth = (value) => {
    if (value === undefined || value === null) return '+0.0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${Number(value).toFixed(1)}%`;
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = { 
        Authorization: `Bearer ${token}`
      };

      // Fetch stats data
      const statsResponse = await axios.get('http://localhost:5000/api/payments/stats', { headers });
      console.log('Stats response:', statsResponse.data);

      // Fetch active raffles
      const rafflesResponse = await axios.get('http://localhost:5000/api/raffle/all', { headers });
      const activeRaffles = rafflesResponse.data.filter(raffle => raffle.active);
      console.log('Active raffles:', activeRaffles);

      // Calculate growth percentages
      const previousTotal = statsResponse.data.totalAmount - (statsResponse.data.growth * statsResponse.data.totalAmount / 100);
      const rafflesGrowth = activeRaffles.length > 0 ? 
        ((activeRaffles.length - rafflesResponse.data.lastMonthCount) / rafflesResponse.data.lastMonthCount) * 100 : 0;

      setDashboardData({
        totalSales: statsResponse.data.totalAmount || 0,
        confirmedPayments: statsResponse.data.count || 0,
        activeRaffles: activeRaffles.length,
        salesGrowth: ((statsResponse.data.totalAmount - previousTotal) / previousTotal) * 100,
        paymentsGrowth: statsResponse.data.growth || 0,
        rafflesGrowth: rafflesGrowth
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response) {
        console.error('API Error:', error.response.data);
      }
      setError('Error al cargar los datos del panel. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Set up socket listeners
    const setupSocketListeners = () => {
      if (!socket) return;

      const events = ['payment_confirmed', 'raffle_created', 'raffle_updated'];
      events.forEach(event => {
        socket.on(event, () => {
          console.log(`${event} received, refreshing dashboard data`);
          fetchDashboardData();
        });
      });

      return () => {
        events.forEach(event => socket.off(event));
      };
    };

    const cleanup = setupSocketListeners();
    return cleanup;
  }, [socket, fetchDashboardData]);

  const summaryData = [
    {
      title: 'Ventas Totales',
      value: formatCurrency(dashboardData.totalSales),
      change: `${formatGrowth(dashboardData.salesGrowth)} desde el mes pasado`,
      icon: <DollarSign className="summary-icon" />,
      color: 'blue'
    },
    {
      title: 'Pagos Confirmados',
      value: dashboardData.confirmedPayments.toString(),
      change: `${formatGrowth(dashboardData.paymentsGrowth)} desde la última hora`,
      icon: <Users className="summary-icon" />,
      color: 'green'
    },
    {
      title: 'Rifas Activas',
      value: dashboardData.activeRaffles.toString(),
      change: `${formatGrowth(dashboardData.rafflesGrowth)} desde el mes pasado`,
      icon: <Package className="summary-icon" />,
      color: 'purple'
    }
  ];

  if (loading) {
    return (
      <div className="dashboard-overview">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Cargando datos del panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-overview">
        <div className="error-state">
          <div className="error-message">{error}</div>
          <button 
            onClick={fetchDashboardData}
            className="retry-button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      <div className="dashboard-header">
        <h2 className="page-title">Panel de Control</h2>
        <button 
          onClick={fetchDashboardData} 
          className="refresh-button"
        >
          Actualizar
        </button>
      </div>

      <div className="summary-cards">
        {summaryData.map((item, index) => (
          <div key={index} className={`summary-card ${item.color}`}>
            <div className="card-header">
              <h3 className="card-title">{item.title}</h3>
              {item.icon}
            </div>
            <div className="card-value">{item.value}</div>
            <p className="card-change">{item.change}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardOverview;
