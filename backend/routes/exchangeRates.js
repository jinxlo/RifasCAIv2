// routes/exchangeRates.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/exchange-rate', async (req, res) => {
  try {
    const response = await axios.get('https://bcv-exchange-rates.vercel.app/get_exchange_rates');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ message: 'Error fetching exchange rate' });
  }
});

module.exports = router;
