// frontend/src/pages/PaymentDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
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
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    // Redirect if no numbers selected
    if (!selectedNumbers.length) {
      navigate('/select-numbers');
      return;
    }

    const fetchExchangeRate = async () => {
      try {
        const response = await api.get('/api/v3/ticker/price?symbol=USDTVES');
        if (response.data && response.data.price) {
          const usdRate = parseFloat(response.data.price);
          setExchangeRate(usdRate);
        } else {
          console.error('Unexpected exchange rate response:', response.data);
          setError('Error fetching exchange rate. Using default rate.');
          setExchangeRate(35.0); // Default fallback rate
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        setError('Error fetching exchange rate. Using default rate.');
        setExchangeRate(35.0); // Default fallback rate
      }
    };

    fetchExchangeRate();
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    setError(null);
  };

  const handleProofOfPaymentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setError('File must be an image (JPEG, PNG, or GIF)');
        return;
      }
      setFormData({ ...formData, proofOfPayment: file });
      setError(null);
    }
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

  const getValidationClass = (fieldName) => {
    if (formData[fieldName] === '') return '';
    return validation[fieldName] ? 'valid' : 'invalid';
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
            onChange={handleInputChange}
            className={getValidationClass('fullName')}
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
            onChange={handleInputChange}
            className={getValidationClass('idNumber')}
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
            onChange={handleInputChange}
            className={getValidationClass('phoneNumber')}
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
            onChange={handleInputChange}
            className={getValidationClass('email')}
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
            onChange={handleInputChange}
            className={getValidationClass('password')}
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
            onChange={handleInputChange}
            className={getValidationClass('confirmPassword')}
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
              onChange={handleProofOfPaymentChange}
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
