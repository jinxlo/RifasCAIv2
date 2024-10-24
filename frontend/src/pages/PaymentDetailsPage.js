// frontend/src/pages/PaymentDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getExchangeRate } from '../services/api'; // Updated to use the correct exchange rate fetching function
import axios from 'axios';
import '../assets/styles/PaymentDetailsPage.css';

const PaymentDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedNumbers, method } = location.state || {
    selectedNumbers: [],
    method: '',
  };

  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false); // Loading state for exchange rate
  const [exchangeRateError, setExchangeRateError] = useState(null); // Error state for exchange rate
  const [loading, setLoading] = useState(false); // Loading state for form submission
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    proofOfPayment: null,
  });

  // Form validation state
  const [validation, setValidation] = useState({
    fullName: true,
    idNumber: true,
    phoneNumber: true,
    email: true,
    password: true,
    confirmPassword: true,
    proofOfPayment: true,
  });

  const ticketPrice = 10;
  const totalAmountUSD = selectedNumbers.length * ticketPrice;

  // Fetch exchange rate function
  const fetchExchangeRate = async () => {
    setExchangeRateLoading(true);
    setExchangeRateError(null);
    try {
      const result = await getExchangeRate();
      if (result.success && result.rate) {
        setExchangeRate(result.rate);
      } else {
        setExchangeRateError(result.error || 'Error fetching exchange rate.');
        setExchangeRate(35.0); // Default fallback rate
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setExchangeRate(35.0); // Default fallback rate
      setExchangeRateError('Error fetching exchange rate. Using default rate.');
    } finally {
      setExchangeRateLoading(false);
    }
  };

  useEffect(() => {
    // Redirect if no numbers selected
    if (!selectedNumbers.length) {
      navigate('/select-numbers');
      return;
    }

    fetchExchangeRate();

    // Fetch exchange rate every 5 minutes
    const exchangeRateInterval = setInterval(fetchExchangeRate, 5 * 60 * 1000);

    return () => {
      clearInterval(exchangeRateInterval);
    };
  }, [selectedNumbers, navigate]);

  const validateForm = () => {
    const newValidation = {
      fullName: formData.fullName.length >= 3,
      idNumber: formData.idNumber.length >= 5,
      phoneNumber: formData.phoneNumber.length >= 10,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      password: formData.password.length >= 6,
      confirmPassword: formData.password === formData.confirmPassword,
      proofOfPayment: formData.proofOfPayment !== null,
    };

    setValidation(newValidation);
    return Object.values(newValidation).every(Boolean);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validate form
    if (!validateForm()) {
      setError('Please fill in all required fields correctly');
      return;
    }

    setLoading(true);

    try {
      // First, verify ticket availability
      const checkResponse = await axios.post('http://localhost:5000/api/tickets/check-reserved', {
        tickets: selectedNumbers
      });

      if (!checkResponse.data.success) {
        setError(checkResponse.data.message);
        setLoading(false);
        return;
      }

      // Prepare form data
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'confirmPassword') {
          data.append(key, formData[key]);
        }
      });
      data.append('selectedNumbers', JSON.stringify(selectedNumbers));
      data.append('method', method);
      data.append('totalAmountUSD', totalAmountUSD);

      // Submit payment and create user
      const response = await axios.post('http://localhost:5000/api/payments/create-and-pay', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Store authentication data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('isAdmin', response.data.isAdmin);
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('userData', JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          idNumber: formData.idNumber,
          phoneNumber: formData.phoneNumber,
        }));

        // Navigate to verification page
        navigate('/payment-verification', {
          state: {
            paymentId: response.data.paymentId,
            selectedNumbers,
          }
        });
      } else {
        setError(response.data.message || 'Payment submission failed');
      }
    } catch (error) {
      console.error('Error in handleConfirmPayment:', error);
      setError(error.response?.data?.message || 'Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalAmountBS = exchangeRate
    ? (totalAmountUSD * exchangeRate).toFixed(2)
    : 'Loading...';

  const getPaymentInstructions = () => {
    const paymentDetails = {
      'Binance Pay': {
        details: 'Binance Pay ID: 35018921',
        qrCode: '/binancepayQR.png',
        amount: totalAmountUSD,
      },
      'Pagomovil': {
        details: 'Phone Number: 04122986051\nCedula: 19993150\nBanco: Banesco',
        amount: totalAmountBS,
      },
      'Zelle': {
        details: 'Email: payments@example.com',
        amount: totalAmountUSD,
      },
    };

    return paymentDetails[method] || null;
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="payment-details-page">
      <h2>Payment Details</h2>
      
      {/* Payment Method Information */}
      <div className="payment-method-info">
        <h3>Selected Payment Method: {method}</h3>
        {getPaymentInstructions() && (
          <div className="payment-instructions">
            <p>Amount to Pay: {method === 'Pagomovil' ? `${totalAmountBS} BS` : `$${totalAmountUSD}`}</p>
            <p>{`$1 = ${exchangeRateLoading ? 'Loading...' : exchangeRate ? `${exchangeRate} BS` : 'Error fetching rate'}`}</p> {/* Display exchange rate */}
            
            {/* Display exchange rate loading indicator */}
            {exchangeRateLoading && (
              <div className="exchange-rate-loading">
                Fetching latest exchange rate...
              </div>
            )}

            {/* Display exchange rate error message */}
            {exchangeRateError && (
              <div className="exchange-rate-error">
                {exchangeRateError}
              </div>
            )}

            <div className="payment-details">
              {method === 'Binance Pay' && (
                <>
                  <p>{getPaymentInstructions().details}</p>
                  <img 
                    src={getPaymentInstructions().qrCode} 
                    alt="Binance Pay QR Code" 
                    className="qr-code"
                  />
                </>
              )}
              
              {method === 'Pagomovil' && (
                <div className="pagomovil-details">
                  <p>Please transfer to:</p>
                  <button onClick={() => handleCopyToClipboard('04122986051')}>
                    📱 Copy Phone Number
                  </button>
                  <button onClick={() => handleCopyToClipboard('19993150')}>
                    🆔 Copy Cedula
                  </button>
                  <p>Bank: Banesco</p>
                </div>
              )}

              {method === 'Zelle' && (
                <div className="zelle-details">
                  <p>{getPaymentInstructions().details}</p>
                  <button onClick={() => handleCopyToClipboard('payments@example.com')}>
                    📧 Copy Email
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && <div className="error-message">{error}</div>}

      {/* User Registration and Payment Form */}
      <form className="payment-form" onSubmit={handleConfirmPayment}>
        <div className="form-group">
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
          {!validation.fullName && (
            <span className="validation-message">Full name must be at least 3 characters</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="text"
            name="idNumber"
            placeholder="ID Number"
            value={formData.idNumber}
            onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            required
          />
          {!validation.idNumber && (
            <span className="validation-message">Please enter a valid ID number</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            required
          />
          {!validation.phoneNumber && (
            <span className="validation-message">Please enter a valid phone number</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          {!validation.email && (
            <span className="validation-message">Please enter a valid email address</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Create Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          {!validation.password && (
            <span className="validation-message">Password must be at least 6 characters</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
          {!validation.confirmPassword && (
            <span className="validation-message">Passwords do not match</span>
          )}
        </div>

        <div className="form-group">
          <label className="file-input-label">
            Proof of Payment:
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, proofOfPayment: e.target.files[0] })}
              required
              className="file-input"
            />
          </label>
          {!validation.proofOfPayment && (
            <span className="validation-message">Please upload proof of payment</span>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className={`submit-button ${loading ? 'loading' : ''}`}
        >
          {loading ? 'Processing...' : 'Create Account and Confirm Payment'}
        </button>
      </form>

      {/* Selected Numbers Summary */}
      <div className="selected-numbers-summary">
        <h4>Selected Numbers:</h4>
        <p>{selectedNumbers.join(', ')}</p>
        <p>Total Amount: ${totalAmountUSD}</p>
        {method === 'Pagomovil' && <p>Total in BS: {totalAmountBS} BS</p>}
      </div>
    </div>
  );
};

export default PaymentDetailsPage;
