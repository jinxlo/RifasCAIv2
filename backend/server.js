require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Import models
const Ticket = require('./models/Ticket');
const User = require('./models/User');
const Raffle = require('./models/Raffle');
const Payment = require('./models/Payment');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const ticketsRoutes = require('./routes/tickets');
const raffleRoutes = require('./routes/raffle');
const exchangeRatesRoutes = require('./routes/exchangeRates');

const app = express();

// -----------------------
// File Upload Configuration
// -----------------------
// Create upload directories if they don't exist
const uploadDir = path.join(__dirname, 'uploads');
const proofDir = path.join(uploadDir, 'proofs');
const raffleImagesDir = path.join(uploadDir, 'raffles');

[uploadDir, proofDir, raffleImagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for proof of payment uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, proofDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image file.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// -----------------------
// Middleware Configuration
// -----------------------
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------
// Initialize HTTP Server & Socket.IO
// -----------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization || 
                  socket.handshake.query.token;
    
    if (!token && process.env.NODE_ENV !== 'development') {
      return next(new Error('Authentication error'));
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        if (decoded.isAdmin) {
          socket.join('admin-room');
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'development') {
          return next(new Error('Invalid token'));
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'User:', socket.user?.email);

  if (socket.user) {
    socket.join(`user-${socket.user.userId}`);
  }

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Add io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// -----------------------
// Routes Configuration
// -----------------------
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes(upload, io));
app.use('/api/tickets', ticketsRoutes(io));
app.use('/api/raffle', raffleRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);

// Add test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is running correctly',
    timestamp: new Date(),
    env: process.env.NODE_ENV
  });
});

// -----------------------
// Cleanup Function
// -----------------------
const cleanupDatabase = async () => {
  try {
    console.log('Cleaning up database...');
    
    // Drop collections in the correct order
    await Payment.collection.drop().catch(err => {
      if (err.code !== 26) console.error('Error dropping payments:', err);
    });
    
    await Ticket.collection.drop().catch(err => {
      if (err.code !== 26) console.error('Error dropping tickets:', err);
    });
    
    await Raffle.collection.drop().catch(err => {
      if (err.code !== 26) console.error('Error dropping raffles:', err);
    });

    // Drop indexes
    await Ticket.collection.dropIndexes();
    await Payment.collection.dropIndexes();
    await Raffle.collection.dropIndexes();

    console.log('Database cleanup completed');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  }
};

// -----------------------
// Server Startup
// -----------------------
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    // Cleanup database in development
    if (process.env.NODE_ENV === 'development') {
      await cleanupDatabase();
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// -----------------------
// Scheduled Tasks
// -----------------------
// Task to release expired tickets
cron.schedule('*/5 * * * *', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const expiredTickets = await Ticket.find({
      status: 'reserved',
      reservedAt: { $lt: cutoff }
    });

    if (expiredTickets.length > 0) {
      const ticketNumbers = expiredTickets.map(ticket => ticket.ticketNumber);
      const userIds = [...new Set(expiredTickets.map(ticket => ticket.userId))];

      await Ticket.updateMany(
        { ticketNumber: { $in: ticketNumbers } },
        { 
          $set: { 
            status: 'available', 
            reservedAt: null, 
            userId: null 
          } 
        }
      );

      io.emit('ticketsReleased', { tickets: ticketNumbers });
      
      userIds.forEach(userId => {
        if (userId) {
          const userTickets = expiredTickets
            .filter(ticket => ticket.userId.toString() === userId.toString())
            .map(ticket => ticket.ticketNumber);
          
          io.to(`user-${userId}`).emit('your_tickets_released', {
            tickets: userTickets,
            message: 'Your ticket reservation has expired'
          });
        }
      });

      console.log(`Released ${ticketNumbers.length} expired tickets`);
    }
  } catch (error) {
    console.error('Error in ticket release job:', error);
  }
});

// Daily cleanup task
cron.schedule('0 0 * * *', async () => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await User.updateMany(
      { resetPasswordExpires: { $lt: yesterday } },
      { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
    );
    console.log('Daily cleanup completed');
  } catch (error) {
    console.error('Error in daily cleanup:', error);
  }
});

// -----------------------
// Error Handling
// -----------------------
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});
