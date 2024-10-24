const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Raffle = require('../models/Raffle');
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');

// Get all raffles (admin only)
router.get('/all', auth.isAdmin, async (req, res) => {
  try {
    const raffles = await Raffle.find()
      .sort({ createdAt: -1 })
      .select('-__v');
    res.json(raffles);
  } catch (error) {
    console.error('Error fetching all raffles:', error);
    res.status(500).json({ message: 'Error fetching raffles' });
  }
});

// Get active raffle (public)
router.get('/', async (req, res) => {
  try {
    const raffle = await Raffle.findOne({ active: true })
      .sort({ createdAt: -1 })
      .select('-__v');

    if (!raffle) {
      return res.status(404).json({ 
        message: 'No active raffle found',
        code: 'NO_ACTIVE_RAFFLE'
      });
    }

    // Get ticket statistics
    const ticketStats = await Ticket.aggregate([
      { $match: { raffleId: raffle._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format response with ticket stats
    const response = {
      ...raffle.toObject(),
      ticketStats: ticketStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching active raffle:', error);
    res.status(500).json({ message: 'Error fetching raffle' });
  }
});

// Create new raffle (admin only)
router.post('/create', auth.isAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate required fields
    const requiredFields = ['productName', 'productImage', 'price', 'totalTickets', 'description'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS'
      });
    }

    // Validate numeric fields
    if (isNaN(req.body.price) || req.body.price <= 0) {
      return res.status(400).json({
        message: 'Price must be a positive number',
        code: 'INVALID_PRICE'
      });
    }

    if (isNaN(req.body.totalTickets) || req.body.totalTickets <= 0) {
      return res.status(400).json({
        message: 'Total tickets must be a positive number',
        code: 'INVALID_TICKET_COUNT'
      });
    }

    // Deactivate all other raffles
    await Raffle.updateMany({}, { active: false }, { session });

    // Create new raffle
    const raffle = new Raffle({
      productName: req.body.productName,
      description: req.body.description,
      productImage: req.body.productImage,
      price: parseFloat(req.body.price),
      totalTickets: parseInt(req.body.totalTickets),
      active: true,
      soldTickets: 0,
      reservedTickets: 0,
      createdBy: req.user._id // Assuming user ID is available from auth middleware
    });

    await raffle.save({ session });

    // Create tickets for the raffle
    const tickets = Array.from({ length: raffle.totalTickets }, (_, index) => ({
      raffleId: raffle._id,
      number: index + 1,
      status: 'available'
    }));

    await Ticket.insertMany(tickets, { session });

    await session.commitTransaction();

    // Emit socket event for real-time updates
    req.io.emit('raffle_created', raffle);

    res.status(201).json({
      message: 'Raffle created successfully',
      raffle
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating raffle:', error);
    res.status(500).json({ 
      message: 'Error creating raffle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});

// Update raffle (admin only)
router.put('/:id', auth.isAdmin, async (req, res) => {
  try {
    const allowedUpdates = ['productName', 'description', 'productImage', 'price', 'active'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const raffle = await Raffle.findById(req.params.id);
    
    if (!raffle) {
      return res.status(404).json({ 
        message: 'Raffle not found',
        code: 'RAFFLE_NOT_FOUND'
      });
    }

    // If activating this raffle, deactivate others
    if (updates.active) {
      await Raffle.updateMany(
        { _id: { $ne: raffle._id } },
        { active: false }
      );
    }

    Object.assign(raffle, updates);
    await raffle.save();

    // Emit socket event for real-time updates
    req.io.emit('raffle_updated', raffle);

    res.json({
      message: 'Raffle updated successfully',
      raffle
    });
  } catch (error) {
    console.error('Error updating raffle:', error);
    res.status(500).json({ message: 'Error updating raffle' });
  }
});

// Delete raffle (admin only)
router.delete('/:id', auth.isAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const raffle = await Raffle.findById(req.params.id);
    
    if (!raffle) {
      return res.status(404).json({ 
        message: 'Raffle not found',
        code: 'RAFFLE_NOT_FOUND'
      });
    }

    // Check if raffle has any sold tickets
    const soldTicketsCount = await Ticket.countDocuments({
      raffleId: raffle._id,
      status: 'sold'
    });

    if (soldTicketsCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete raffle with sold tickets',
        code: 'RAFFLE_HAS_SALES'
      });
    }

    // Delete associated tickets
    await Ticket.deleteMany({ raffleId: raffle._id }, { session });
    
    // Delete the raffle
    await Raffle.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();

    // Emit socket event for real-time updates
    req.io.emit('raffle_deleted', { raffleId: req.params.id });

    res.json({ 
      message: 'Raffle and associated tickets deleted successfully',
      raffleId: req.params.id
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting raffle:', error);
    res.status(500).json({ message: 'Error deleting raffle' });
  } finally {
    session.endSession();
  }
});

// Get raffle statistics (admin only)
router.get('/:id/stats', auth.isAdmin, async (req, res) => {
  try {
    const raffle = await Raffle.findById(req.params.id);
    
    if (!raffle) {
      return res.status(404).json({ 
        message: 'Raffle not found',
        code: 'RAFFLE_NOT_FOUND'
      });
    }

    // Get detailed ticket statistics
    const ticketStats = await Ticket.aggregate([
      { $match: { raffleId: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate revenue
    const revenue = raffle.price * (raffle.soldTickets || 0);

    res.json({
      raffleId: raffle._id,
      productName: raffle.productName,
      totalTickets: raffle.totalTickets,
      ticketStats: ticketStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      revenue,
      active: raffle.active,
      createdAt: raffle.createdAt
    });
  } catch (error) {
    console.error('Error fetching raffle statistics:', error);
    res.status(500).json({ message: 'Error fetching raffle statistics' });
  }
});

// Get active raffles
router.get('/active', auth.isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const activeRaffles = await Raffle.find({ active: true });
    const lastMonthRaffles = await Raffle.find({
      createdAt: { $gte: lastMonth }
    });

    // Calculate growth
    const growth = lastMonthRaffles.length === 0 ? 0 :
      ((activeRaffles.length - lastMonthRaffles.length) / lastMonthRaffles.length) * 100;

    res.json({
      raffles: activeRaffles,
      count: activeRaffles.length,
      growth
    });
  } catch (error) {
    console.error('Error getting active raffles:', error);
    res.status(500).json({ message: 'Error getting active raffles' });
  }
});

module.exports = router;
