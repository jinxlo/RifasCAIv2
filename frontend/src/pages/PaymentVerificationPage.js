// src/pages/PaymentVerificationPage.js
import React from 'react';
import '../assets/styles/PaymentVerificationPage.css';

const PaymentVerificationPage = () => {
  return (
    <div className="payment-verification-page">
      <h2>Payment is Pending Verification</h2>
      <div className="animation">
        <div className="spinner"></div>
      </div>
      <p>Thank you for your purchase. We are verifying your payment.</p>
    </div>
  );
};

export default PaymentVerificationPage;
