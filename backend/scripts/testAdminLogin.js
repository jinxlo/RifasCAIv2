// scripts/testAdminLogin.js
require('dotenv').config();
const axios = require('axios');

const testAdminLogin = async () => {
  try {
    console.log('Testing admin login...');
    console.log('Admin Email:', process.env.ADMIN_EMAIL);
    console.log('Admin Password:', process.env.ADMIN_PASSWORD);
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });

    console.log('\nLogin successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('\nLogin failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

testAdminLogin();