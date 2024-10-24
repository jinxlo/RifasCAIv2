const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Raffle = require('../models/Raffle');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (upload, io) => {
  // Get all payments (admin only)
  router.get('/all', auth.isAdmin, async (req, res) => {
    try {
      const payments = await Payment.find()
        .populate('user', 'fullName email')
        .sort('-createdAt');
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ message: 'Error fetching payments' });
    }
  });

  // Get pending payments (admin only)
  router.get('/pending', auth.isAdmin, async (req, res) => {
    try {
      const payments = await Payment.find({ status: 'Pending' })
        .populate('user', 'fullName email')
        .sort('-createdAt');
      res.json(payments);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      res.status(500).json({ message: 'Error fetching pending payments' });
    }
  });

  // Get user's payments
  router.get('/my-payments', auth.isUser, async (req, res) => {
    try {
      const payments = await Payment.find({ user: req.user._id })
        .sort('-createdAt');
      res.json(payments);
    } catch (error) {
      console.error('Error fetching user payments:', error);
      res.status(500).json({ message: 'Error fetching your payments' });
    }
  });

  // Create payment and user account
  router.post(
    '/create-and-pay',
    upload.single('proofOfPayment'),
    [
      body('fullName').notEmpty().withMessage('Full Name is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('idNumber').notEmpty().withMessage('ID Number is required'),
      body('phoneNumber').notEmpty().withMessage('Phone Number is required'),
      body('selectedNumbers').notEmpty().withMessage('Selected ticket numbers are required'),
      body('method').notEmpty().withMessage('Payment method is required'),
      body('totalAmountUSD').isFloat({ gt: 0 }).withMessage('Total Amount USD must be a positive number'),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ errors: errors.array() });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const {
          fullName,
          idNumber,
          phoneNumber,
          email,
          password,
          selectedNumbers,
          method,
          totalAmountUSD,
        } = req.body;

        // Check if user exists
        let user = await User.findOne({ email }).session(session);
        if (user) {
          throw new Error('User with this email already exists');
        }

        // Get active raffle
        const activeRaffle = await Raffle.findOne({ active: true }).session(session);
        if (!activeRaffle) {
          throw new Error('No active raffle found');
        }

        // Hash password and create user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({
          fullName,
          email,
          password: hashedPassword,
          idNumber,
          phoneNumber,
        });
        await user.save({ session });

        // Parse and validate selected numbers
        let tickets = [];
        try {
          tickets = JSON.parse(selectedNumbers);
          if (!Array.isArray(tickets)) throw new Error();
        } catch (err) {
          throw new Error('Invalid selectedNumbers format');
        }

        // Reserve tickets
        const unavailableTickets = [];
        for (const ticketNumber of tickets) {
          const ticket = await Ticket.findOneAndUpdate(
            { 
              ticketNumber,
              status: 'available',
              raffleId: activeRaffle._id
            },
            { 
              $set: { 
                status: 'reserved',
                reservedAt: new Date(),
                userId: user._id 
              } 
            },
            { session, new: true }
          );

          if (!ticket) {
            unavailableTickets.push(ticketNumber);
          }
        }

        if (unavailableTickets.length > 0) {
          throw new Error(`Tickets not available: ${unavailableTickets.join(', ')}`);
        }

        // Create payment record
        const payment = new Payment({
          user: user._id,
          raffle: activeRaffle._id,
          fullName,
          idNumber,
          phoneNumber,
          email,
          selectedNumbers: tickets,
          method,
          totalAmountUSD: parseFloat(totalAmountUSD),
          proofOfPayment: req.file ? `/uploads/proofs/${req.file.filename}` : '',
          status: 'Pending',
        });
        await payment.save({ session });

        // Update raffle statistics
        activeRaffle.reservedTickets += tickets.length;
        await activeRaffle.save({ session });

        await session.commitTransaction();

        // Emit socket events
        io.emit('ticketsReserved', { 
          tickets,
          raffleId: activeRaffle._id
        });
        io.emit('payment_created', payment);

        // Generate token
        const token = jwt.sign(
          { userId: user._id, isAdmin: user.isAdmin },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          success: true,
          message: 'Account created and payment submitted successfully',
          token,
          paymentId: payment._id,
          isAdmin: user.isAdmin,
        });
      } catch (error) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        console.error('Error in create-and-pay:', error);
        res.status(400).json({ 
          success: false,
          message: error.message || 'Server error'
        });
      } finally {
        session.endSession();
      }
    }
  );

  // Confirm payment (admin only)
  router.post('/:id/confirm', auth.isAdmin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findById(req.params.id)
        .session(session);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'Pending') {
        throw new Error('Payment is not in pending status');
      }

      // Update payment status
      payment.status = 'Confirmed';
      await payment.save({ session });

      // Update tickets status
      await Ticket.updateMany(
        { 
          ticketNumber: { $in: payment.selectedNumbers },
          status: 'reserved'
        },
        { 
          $set: { 
            status: 'sold',
            soldAt: new Date()
          } 
        },
        { session }
      );

      // Update raffle statistics
      const raffle = await Raffle.findById(payment.raffle).session(session);
      if (raffle) {
        raffle.soldTickets += payment.selectedNumbers.length;
        raffle.reservedTickets -= payment.selectedNumbers.length;
        await raffle.save({ session });
      }

      await session.commitTransaction();

      // Emit socket events
      io.emit('payment_confirmed', {
        paymentId: payment._id,
        tickets: payment.selectedNumbers,
        raffleId: payment.raffle
      });

      res.json({
        success: true,
        message: 'Payment confirmed successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error confirming payment:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error confirming payment'
      });
    } finally {
      session.endSession();
    }
  });

  // Reject payment (admin only)
  router.post('/:id/reject', auth.isAdmin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the payment and populate the raffle field
      const payment = await Payment.findById(req.params.id)
        .session(session);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'Pending') {
        throw new Error('Payment is not in pending status');
      }

      // Store the raffle reference before updating
      const raffleId = payment.raffle;

      // Update payment status
      payment.status = 'Rejected';
      await payment.save({ session });

      // Release tickets
      await Ticket.updateMany(
        { 
          ticketNumber: { $in: payment.selectedNumbers },
          status: 'reserved'
        },
        { 
          $set: { 
            status: 'available',
            userId: null,
            reservedAt: null
          } 
        },
        { session }
      );

      // Update raffle statistics
      const raffle = await Raffle.findById(raffleId).session(session);
      if (raffle) {
        raffle.reservedTickets = Math.max(0, raffle.reservedTickets - payment.selectedNumbers.length);
        await raffle.save({ session });
      }

      await session.commitTransaction();

      // Emit socket events
      io.emit('payment_rejected', {
        paymentId: payment._id,
        tickets: payment.selectedNumbers,
        raffleId: payment.raffle
      });

      // Send success response
      res.json({
        success: true,
        message: 'Payment rejected successfully',
        payment: {
          id: payment._id,
          status: payment.status,
          selectedNumbers: payment.selectedNumbers
        }
      });

    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      
      console.error('Error rejecting payment:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error rejecting payment'
      });
    } finally {
      session.endSession();
    }
  });

  // New Routes as per Developer Notes

  // Get payment statistics
  router.get('/stats', auth.isAdmin, async (req, res) => {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      // Get all confirmed payments
      const payments = await Payment.find({ 
        status: 'Confirmed'
      });

      // Calculate total sales
      const totalAmount = payments.reduce((sum, payment) => sum + payment.totalAmountUSD, 0);

      // Get last month's payments
      const lastMonthPayments = await Payment.find({
        status: 'Confirmed',
        createdAt: { $gte: lastMonth }
      });

      const lastMonthAmount = lastMonthPayments.reduce((sum, payment) => sum + payment.totalAmountUSD, 0);

      // Calculate growth (avoid division by zero)
      const growth = lastMonthAmount === 0 ? 0 : 
        ((totalAmount - lastMonthAmount) / lastMonthAmount) * 100;

      res.json({
        totalAmount,
        growth,
        count: payments.length,
        lastMonthCount: lastMonthPayments.length
      });
    } catch (error) {
      console.error('Error getting payment stats:', error);
      res.status(500).json({ message: 'Error getting payment statistics' });
    }
  });

  // Get confirmed payments
  router.get('/confirmed', auth.isAdmin, async (req, res) => {
    try {
      const payments = await Payment.find({ status: 'Confirmed' })
        .sort('-createdAt')
        .populate('user', 'fullName email')
        .limit(100);

      res.json(payments);
    } catch (error) {
      console.error('Error getting confirmed payments:', error);
      res.status(500).json({ message: 'Error getting confirmed payments' });
    }
  });

  return router;
};
