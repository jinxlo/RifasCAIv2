// scripts/resetAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const resetAdmin = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');

    // Delete existing admin
    const adminEmail = process.env.ADMIN_EMAIL;
    console.log('\nRemoving existing admin if any...');
    await User.deleteOne({ email: adminEmail });
    
    // Create new admin
    console.log('\nCreating new admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

    const admin = new User({
      email: adminEmail,
      password: hashedPassword,
      fullName: 'Admin User',
      idNumber: 'ADMIN123',
      phoneNumber: '1234567890',
      isAdmin: true
    });

    await admin.save();

    // Verify the new admin
    const verifyAdmin = await User.findOne({ email: adminEmail }).select('+password');
    const passwordMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, verifyAdmin.password);

    console.log('\nNew admin created:');
    console.log('Email:', adminEmail);
    console.log('Password:', process.env.ADMIN_PASSWORD);
    console.log('Password verification:', passwordMatch);
    
    if (!passwordMatch) {
      throw new Error('Password verification failed after creation');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
};

resetAdmin();