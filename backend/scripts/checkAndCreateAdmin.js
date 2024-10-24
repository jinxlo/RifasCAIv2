// scripts/checkAndCreateAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const checkAndCreateAdmin = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    console.log('Using URI:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password in log
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB Atlas successfully');

    // Check if admin exists
    const adminEmail = process.env.ADMIN_EMAIL;
    console.log('\nChecking for admin with email:', adminEmail);
    
    let admin = await User.findOne({ email: adminEmail }).select('+password');
    
    if (admin) {
      console.log('\nExisting admin user found:');
      console.log('Email:', admin.email);
      console.log('Is Admin:', admin.isAdmin);
      console.log('Full Name:', admin.fullName);
      
      // Test password match
      const testPass = process.env.ADMIN_PASSWORD;
      const passwordMatch = await bcrypt.compare(testPass, admin.password);
      console.log('Current password matches env ADMIN_PASSWORD:', passwordMatch);
      
      if (!passwordMatch) {
        console.log('\nUpdating admin password to match ADMIN_PASSWORD...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
        admin.password = hashedPassword;
        await admin.save();
        console.log('Admin password updated successfully');
      }
    } else {
      console.log('\nNo admin found. Creating new admin user...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

      admin = new User({
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Admin User',
        idNumber: 'ADMIN123',
        phoneNumber: '1234567890',
        isAdmin: true,
      });

      await admin.save();
      console.log('\nAdmin created successfully:');
      console.log('Email:', adminEmail);
      console.log('Password:', process.env.ADMIN_PASSWORD);
    }

    // Verify admin can be found with password
    const verifyAdmin = await User.findOne({ email: adminEmail }).select('+password');
    if (verifyAdmin) {
      const passwordMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, verifyAdmin.password);
      console.log('\nFinal verification:');
      console.log('Admin exists in database:', !!verifyAdmin);
      console.log('Password verification:', passwordMatch);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
};

checkAndCreateAdmin();