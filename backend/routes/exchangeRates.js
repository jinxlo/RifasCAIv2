// backend/routes/exchangeRates.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/exchange-rate', async (req, res) => {
  try {
    const response = await axios.get('https://pydolarve.org/api/v1/dollar?monitor=enparalelovzla');
    
    if (response.data && response.data.data) {
      // Extract the rate from the API response
      const rate = parseFloat(response.data.data.price);
      
      res.json({
        success: true,
        rate: rate,
        source: 'pydolarve.org',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Invalid response format from pydolarve:', response.data);
      res.status(500).json({ 
        success: false, 
        message: 'Invalid response from exchange rate service',
        error: 'DATA_FORMAT_ERROR'
      });
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching exchange rate',
      error: error.message
    });
  }
});

module.exports = router;