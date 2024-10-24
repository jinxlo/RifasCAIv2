const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Raffle = require('../models/Raffle');
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');

// Configure multer for raffle image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'raffles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'raffle-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
router.post('/create', auth.isAdmin, upload.single('productImage'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate input
    const { productName, description, price, totalTickets } = req.body;
    
    if (!productName || !description || !price || !totalTickets || !req.file) {
      throw new Error('All fields including image are required');
    }

    // Validate numeric fields
    const parsedPrice = parseFloat(price);
    const parsedTotalTickets = parseInt(totalTickets);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      throw new Error('Price must be a positive number');
    }

    if (isNaN(parsedTotalTickets) || parsedTotalTickets <= 0) {
      throw new Error('Total tickets must be a positive number');
    }

    // Deactivate existing raffles
    await Raffle.updateMany({}, { active: false }, { session });

    // Create new raffle
    const raffle = new Raffle({
      productName,
      description,
      productImage: `/uploads/raffles/${req.file.filename}`,
      price: parsedPrice,
      totalTickets: parsedTotalTickets,
      active: true,
      soldTickets: 0,
      reservedTickets: 0,
      createdBy: req.user._id
    });

    await raffle.save({ session });

    // Create tickets with proper error handling
    const ticketBulkOps = Array.from({ length: parsedTotalTickets }, (_, index) => ({
      insertOne: {
        document: {
          raffleId: raffle._id,
          ticketNumber: index + 1,
          status: 'available'
        }
      }
    }));

    await Ticket.bulkWrite(ticketBulkOps, { session });

    await session.commitTransaction();

    // Emit socket event
    if (req.io) {
      req.io.emit('raffle_created', raffle);
    }

    res.status(201).json({
      message: 'Raffle created successfully',
      raffle
    });

  } catch (error) {
    await session.abortTransaction();

    // Clean up uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    console.error('Error creating raffle:', error);
    res.status(500).json({
      message: 'Error creating raffle',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// Update raffle (admin only)
router.put('/:id', auth.isAdmin, upload.single('productImage'), async (req, res) => {
  try {
    const raffle = await Raffle.findById(req.params.id);
    
    if (!raffle) {
      return res.status(404).json({ 
        message: 'Raffle not found',
        code: 'RAFFLE_NOT_FOUND'
      });
    }

    const updates = {};
    const allowedUpdates = ['productName', 'description', 'price', 'active'];
    
    // Handle regular fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle image update
    if (req.file) {
      // Delete old image if it exists
      if (raffle.productImage) {
        const oldImagePath = path.join(__dirname, '..', 'public', raffle.productImage);
        fs.unlink(oldImagePath, err => {
          if (err && err.code !== 'ENOENT') console.error('Error deleting old image:', err);
        });
      }
      updates.productImage = `/uploads/raffles/${req.file.filename}`;
    }

    // If activating this raffle, deactivate others
    if (updates.active) {
      await Raffle.updateMany(
        { _id: { $ne: raffle._id } },
        { active: false }
      );
    }

    // Update the raffle
    Object.assign(raffle, updates);
    await raffle.save();

    // Emit socket event
    if (req.io) {
      req.io.emit('raffle_updated', raffle);
    }

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
    
    // Delete the raffle image
    if (raffle.productImage) {
      const imagePath = path.join(__dirname, '..', raffle.productImage);
      fs.unlink(imagePath, err => {
        if (err && err.code !== 'ENOENT') console.error('Error deleting raffle image:', err);
      });
    }

    // Delete the raffle
    await Raffle.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();

    // Emit socket event
    if (req.io) {
      req.io.emit('raffle_deleted', { raffleId: req.params.id });
    }

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