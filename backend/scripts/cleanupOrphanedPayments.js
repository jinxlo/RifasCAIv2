// scripts/cleanupOrphanedPayments.js
require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Raffle = require('../models/Raffle');

const cleanupOrphanedPayments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all payments
    const payments = await Payment.find();
    console.log(`Found ${payments.length} total payments`);

    // Check each payment for a valid raffle
    const orphanedPayments = [];
    for (const payment of payments) {
      const raffle = await Raffle.findById(payment.raffle);
      if (!raffle) {
        orphanedPayments.push(payment._id);
      }
    }

    if (orphanedPayments.length > 0) {
      console.log(`Found ${orphanedPayments.length} orphaned payments`);
      
      // Delete orphaned payments
      await Payment.deleteMany({ _id: { $in: orphanedPayments } });
      console.log('Orphaned payments deleted successfully');
    } else {
      console.log('No orphaned payments found');
    }

  } catch (error) {
    console.error('Error cleaning up orphaned payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Cleanup completed');
  }
};

cleanupOrphanedPayments();