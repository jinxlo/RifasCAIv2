// routes/tickets.js
const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

// Middleware to access Socket.io
module.exports = (ioInstance) => {
  // Attach io to requests
  router.use((req, res, next) => {
    req.io = ioInstance;
    next();
  });

  // @route   GET /api/tickets
  // @desc    Get all tickets
  // @access  Public
  router.get('/', async (req, res) => {
    try {
      const tickets = await Ticket.find().select('-__v').lean();
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
  });

  // @route   POST /api/tickets/release
  // @desc    Release a reserved ticket
  // @access  Public
  router.post('/release', async (req, res) => {
    const { ticketNumber } = req.body;

    if (!ticketNumber) {
      return res.status(400).json({ success: false, message: 'Ticket number is required' });
    }

    try {
      const ticket = await Ticket.findOneAndUpdate(
        { ticketNumber, status: 'reserved' },
        { $set: { status: 'available', reservedAt: null, userId: null } },
        { new: true }
      );

      if (!ticket) {
        return res.status(400).json({ success: false, message: 'Ticket is not reserved or does not exist' });
      }

      // Emit event to inform all clients about the released ticket
      req.io.emit('ticketsReleased', { tickets: [ticketNumber] });

      res.json({ success: true, message: 'Ticket released successfully' });
    } catch (error) {
      console.error('Error releasing ticket:', error);
      res.status(500).json({ success: false, message: 'Failed to release ticket' });
    }
  });

  // @route   POST /api/tickets/check-reserved
  // @desc    Check if selected tickets are still available
  // @access  Public
  router.post('/check-reserved', async (req, res) => {
    const { tickets } = req.body;

    if (!tickets || !Array.isArray(tickets)) {
      return res.status(400).json({ success: false, message: 'Tickets array is required' });
    }

    try {
      const unavailableTickets = await Ticket.find({
        ticketNumber: { $in: tickets },
        status: { $ne: 'available' },
      }).select('ticketNumber status').lean();

      if (unavailableTickets.length > 0) {
        const message = unavailableTickets.map(t => `Ticket ${t.ticketNumber} is ${t.status}`).join(', ');
        return res.status(200).json({ success: false, message });
      }

      res.json({ success: true, message: 'All selected tickets are available' });
    } catch (error) {
      console.error('Error checking reserved tickets:', error);
      res.status(500).json({ success: false, message: 'Failed to check ticket availability' });
    }
  });

  return router;
};
