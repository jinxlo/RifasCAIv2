// src/components/adminSections/ConfirmedPayments.js
import React, { useState, useEffect } from 'react';
import { getConfirmedPayments } from '../../services/api';
import { Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import '../../assets/styles/adminSections/ConfirmedPayments.css';

const ConfirmedPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getConfirmedPayments();
      setPayments(response);
    } catch (error) {
      console.error('Error fetching confirmed payments:', error);
      setError('Error al cargar los pagos confirmados');
      toast.error('Error al cargar los pagos confirmados');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
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

  const filterPayments = () => {
    let filtered = [...payments];

    // Apply date filter
    const now = new Date();
    switch (filter) {
      case 'today':
        filtered = filtered.filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          return paymentDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          return paymentDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          return paymentDate >= monthAgo;
        });
        break;
      default:
        break;
    }

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.selectedNumbers.join(', ').includes(searchTerm)
      );
    }

    return filtered;
  };

  const PaymentDetailsModal = ({ payment, onClose }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Detalles del Pago Confirmado</h3>
        
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
            <label>Fecha de Confirmación:</label>
            <p>{formatDate(payment.updatedAt)}</p>
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
            className="close-button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="confirmed-payments">
      <h2 className="page-title">Pagos Confirmados</h2>
      <p className="page-description">Historial de todos los pagos confirmados</p>

      <div className="controls-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nombre, email o números..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button
            className={filter === 'today' ? 'active' : ''}
            onClick={() => setFilter('today')}
          >
            Hoy
          </button>
          <button
            className={filter === 'week' ? 'active' : ''}
            onClick={() => setFilter('week')}
          >
            Esta Semana
          </button>
          <button
            className={filter === 'month' ? 'active' : ''}
            onClick={() => setFilter('month')}
          >
            Este Mes
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Cargando pagos confirmados...</p>
        </div>
      ) : (
        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Números</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filterPayments().map((payment) => (
                <tr key={payment._id}>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>{payment.fullName}</td>
                  <td>{formatCurrency(payment.totalAmountUSD)}</td>
                  <td>{payment.method}</td>
                  <td>{payment.selectedNumbers.join(', ')}</td>
                  <td>
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

export default ConfirmedPayments;