import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext'; // Updated to use the correct context
import { Eye } from 'lucide-react';
import '../../assets/styles/adminSections/PendingPayments.css';

const PendingPayments = () => {
  const socket = useSocket(); // Get the socket from the context
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPayments();

    // Set up Socket.IO listeners
    socket.on('payment_confirmed', (data) => {
      setPayments(prev => prev.filter(p => p._id !== data.paymentId));
      setSuccess('Pago confirmado exitosamente');
    });

    socket.on('payment_rejected', (data) => {
      setPayments(prev => prev.filter(p => p._id !== data.paymentId));
      setSuccess('Pago rechazado exitosamente');
    });

    return () => {
      socket.off('payment_confirmed');
      socket.off('payment_rejected');
    };
  }, [socket]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/payments/pending', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Error al cargar los pagos pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId, action) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/payments/${paymentId}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Update will happen through socket events
      setShowModal(false);
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
      setError(`Error al ${action === 'confirm' ? 'confirmar' : 'rechazar'} el pago`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Payment details modal
  const PaymentDetailsModal = ({ payment, onClose }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Detalles del Pago</h3>
        
        <div className="payment-details">
          <div className="detail-group">
            <label>Cliente:</label>
            <p>{payment.fullName}</p>
          </div>
          
          <div className="detail-group">
            <label>Email:</label>
            <p>{payment.email}</p>
          </div>
          
          <div className="detail-group">
            <label>Teléfono:</label>
            <p>{payment.phoneNumber}</p>
          </div>
          
          <div className="detail-group">
            <label>Método de Pago:</label>
            <p>{payment.method}</p>
          </div>
          
          <div className="detail-group">
            <label>Monto:</label>
            <p>{formatCurrency(payment.totalAmountUSD)}</p>
          </div>
          
          <div className="detail-group">
            <label>Números Seleccionados:</label>
            <p>{payment.selectedNumbers.join(', ')}</p>
          </div>
          
          <div className="detail-group">
            <label>Comprobante de Pago:</label>
            {payment.proofOfPayment && (
              <img 
                src={`http://localhost:5000${payment.proofOfPayment}`}
                alt="Comprobante de pago"
                className="proof-image"
              />
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="confirm-button"
            onClick={() => handlePaymentAction(payment._id, 'confirm')}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Confirmar Pago'}
          </button>
          <button
            className="reject-button"
            onClick={() => handlePaymentAction(payment._id, 'reject')}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Rechazar Pago'}
          </button>
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  if (loading && payments.length === 0) {
    return (
      <div className="pending-payments">
        <h2 className="page-title">Pagos Pendientes</h2>
        <div className="loading-spinner">Cargando pagos...</div>
      </div>
    );
  }

  return (
    <div className="pending-payments">
      <h2 className="page-title">Pagos Pendientes</h2>
      <p className="page-description">Confirmar o rechazar pagos pendientes</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {payments.length === 0 ? (
        <div className="no-payments">
          <p>No hay pagos pendientes en este momento</p>
        </div>
      ) : (
        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Números</th>
                <th>Método</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{payment.fullName}</td>
                  <td>{formatCurrency(payment.totalAmountUSD)}</td>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>{payment.selectedNumbers.join(', ')}</td>
                  <td>{payment.method}</td>
                  <td className="action-buttons">
                    <button
                      className="view-button"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowModal(true);
                      }}
                      title="Ver detalles"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => {
            setShowModal(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
};

export default PendingPayments;
