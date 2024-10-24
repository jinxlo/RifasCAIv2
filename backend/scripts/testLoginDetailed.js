// scripts/testLoginDetailed.js
require('dotenv').config();
const axios = require('axios');

const testLogin = async () => {
  try {
    // First test server connection
    console.log('Testing server connection...');
    try {
      await axios.get('http://localhost:5000/api/auth/me');
    } catch (error) {
      // 401 error is expected for this endpoint when not authenticated
      if (error.response && error.response.status === 401) {
        console.log('Server is running and responding');
      } else {
        throw new Error('Server connection failed. Make sure your server is running on port 5000');
      }
    }

    console.log('\nAttempting admin login...');
    console.log('URL:', 'http://localhost:5000/api/auth/login');
    console.log('Payload:', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });

    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\nLogin successful!');
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\nLogin failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Server might not be running.');
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
};

testLogin();