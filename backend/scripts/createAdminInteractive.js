// scripts/createAdminInteractive.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    console.log('\nCreate New Admin User\n');

    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const fullName = await question('Enter full name: ');
    const idNumber = await question('Enter ID number: ');
    const phoneNumber = await question('Enter phone number: ');

    // Check if admin exists
    const adminExists = await User.findOne({ email });
    if (adminExists) {
      console.log('\nAdmin with this email already exists');
      return false;
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new User({
      email,
      password: hashedPassword,
      fullName,
      idNumber,
      phoneNumber,
      isAdmin: true,
    });

    await admin.save();
    console.log('\nAdmin account created successfully!');
    console.log('Email:', email);
    console.log('Full Name:', fullName);

    const createAnother = await question('\nCreate another admin? (y/n): ');
    return createAnother.toLowerCase() === 'y';

  } catch (error) {
    console.error('\nError creating admin:', error);
    return false;
  }
};

const start = async () => {
  try {
    let continueCreating = true;
    
    while (continueCreating) {
      continueCreating = await createAdmin();
    }
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

start();