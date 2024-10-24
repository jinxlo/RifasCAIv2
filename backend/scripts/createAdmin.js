// scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log('Updating existing admin user');
      admin.password = process.env.ADMIN_PASSWORD;
      admin.isAdmin = true;
      await admin.save();
    } else {
      console.log('Creating new admin user');
      admin = new User({
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD,
        fullName: 'Admin User',
        idNumber: 'ADMIN123',
        phoneNumber: '1234567890',
        isAdmin: true
      });
      await admin.save();
    }

    // Verify admin was created/updated
    const verifyAdmin = await User.findOne({ email: adminEmail }).select('+password');
    const passwordMatch = await verifyAdmin.comparePassword(process.env.ADMIN_PASSWORD);

    console.log('\nAdmin user status:');
    console.log('Email:', verifyAdmin.email);
    console.log('Is Admin:', verifyAdmin.isAdmin);
    console.log('Password Match:', passwordMatch);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();