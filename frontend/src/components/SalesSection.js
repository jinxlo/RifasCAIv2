import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import '../assets/styles/SalesSection.css';

const socket = io.connect('http://localhost:5000');

const SalesSection = () => {
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial sales data
    const fetchSales = async () => {
      try {
        const response = await axios.get('/api/sales');
        setSales(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching sales:', error);
        setMessage({ 
          text: 'Error fetching sales data.', 
          type: 'error' 
        });
        setLoading(false);
      }
    };

    fetchSales();

    // Set up real-time sales updates
    socket.on('sales_update', (data) => {
      setSales(data);
    });

    return () => {
      socket.off('sales_update');
    };
  }, []);

  const handleConfirm = async (saleId) => {
    try {
      await axios.post(`/api/sales/${saleId}/confirm`);
      
      setSales((prevSales) => 
        prevSales.map((sale) =>
          sale.id === saleId ? { ...sale, status: 'Confirmed' } : sale
        )
      );

      setMessage({ 
        text: 'Sale confirmed successfully!', 
        type: 'success' 
      });
      
      socket.emit('sale_confirmed', saleId);
    } catch (error) {
      console.error('Error confirming sale:', error);
      setMessage({ 
        text: 'Error confirming sale.', 
        type: 'error' 
      });
    }
  };

  const handleReject = async (saleId) => {
    try {
      await axios.post(`/api/sales/${saleId}/reject`);

      setSales((prevSales) => 
        prevSales.map((sale) =>
          sale.id === saleId ? { ...sale, status: 'Rejected' } : sale
        )
      );

      setMessage({ 
        text: 'Sale rejected.', 
        type: 'success' 
      });
      
      socket.emit('sale_rejected', saleId);
    } catch (error) {
      console.error('Error rejecting sale:', error);
      setMessage({ 
        text: 'Error rejecting sale.', 
        type: 'error' 
      });
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'status-badge status-confirmed';
      case 'rejected':
        return 'status-badge status-rejected';
      default:
        return 'status-badge status-pending';
    }
  };

  if (loading) {
    return (
      <div className="sales-section">
        <h2>Sales</h2>
        <div className="loading">Loading sales data...</div>
      </div>
    );
  }

  return (
    <div className="sales-section">
      <h2>Sales</h2>
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Purchase ID</th>
              <th>User</th>
              <th>Raffle</th>
              <th>Numbers</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length > 0 ? (
              sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
                  <td>{sale.user_full_name}</td>
                  <td>{sale.raffle_name}</td>
                  <td>{sale.numbers_selected}</td>
                  <td>
                    <span className={getStatusBadgeClass(sale.status)}>
                      {sale.status}
                    </span>
                  </td>
                  <td>{sale.payment_method}</td>
                  <td>
                    <button
                      className="btn btn-success"
                      onClick={() => handleConfirm(sale.id)}
                      disabled={sale.status === 'Confirmed'}
                    >
                      Confirm
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReject(sale.id)}
                      disabled={sale.status === 'Rejected'}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>
                  No sales found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesSection;