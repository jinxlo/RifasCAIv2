// src/pages/PaymentMethodPage.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../assets/styles/PaymentMethodPage.css';

const PaymentMethodPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedNumbers } = location.state || { selectedNumbers: [] };

  const handlePaymentMethodSelect = (method) => {
    navigate('/payment-details', {
      state: { selectedNumbers, method },
    });
  };

  return (
    <div className="payment-method-page">
      <h2>Select Payment Method</h2>
      <div className="payment-methods">
        <button onClick={() => handlePaymentMethodSelect('Binance Pay')}>
          Binance Pay
        </button>
        <button onClick={() => handlePaymentMethodSelect('Pagomovil')}>
          Pagomovil
        </button>
        <button onClick={() => handlePaymentMethodSelect('Zelle')}>
          Zelle
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodPage;
