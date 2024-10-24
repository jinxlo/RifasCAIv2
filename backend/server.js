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
const uploadDir = path.join(__dirname, 'uploads');
const proofDir = path.join(uploadDir, 'proofs');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir);
}

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

// Updated CORS Configuration
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

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// -----------------------
// Initialize HTTP Server
// -----------------------
const server = http.createServer(app);

// -----------------------
// Socket.IO Configuration
// -----------------------
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

// Socket authentication middleware with more leniency in development
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization || 
                  socket.handshake.query.token;
    
    if (!token) {
      // Allow connections without tokens in development mode
      if (process.env.NODE_ENV === 'development') {
        return next();
      }
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      if (decoded.isAdmin) {
        socket.join('admin-room');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Invalid token, but allowing connection in development mode');
      } else {
        return next(new Error('Invalid token'));
      }
    }
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
});

// Debug logging for socket events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'User:', socket.user?.email);

  const originalEmit = socket.emit;
  socket.emit = function() {
    console.log('Socket Event Emitted:', arguments[0], JSON.stringify(Array.prototype.slice.call(arguments, 1)));
    originalEmit.apply(socket, arguments);
  };

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Add io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------
// Routes Configuration
// -----------------------
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes(upload, io));
app.use('/api/tickets', ticketsRoutes(io));

// Updated route configuration for raffle with error handling
app.use('/api/raffle', (req, res, next) => {
  console.log('Raffle route accessed:', req.method, req.path);
  next();
}, raffleRoutes);

app.use('/api/raffle/*', (err, req, res, next) => {
  console.error('Raffle route error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.use('/api/exchange-rates', exchangeRatesRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// -----------------------
// Error Handler Middleware
// -----------------------
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// -----------------------
// Scheduled Tasks
// -----------------------
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
      { 
        $unset: { 
          resetPasswordToken: 1, 
          resetPasswordExpires: 1 
        } 
      }
    );

    console.log('Daily cleanup completed');
  } catch (error) {
    console.error('Error in daily cleanup:', error);
  }
});

// -----------------------
// Database & Server
// -----------------------
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    const ticketCount = await Ticket.countDocuments();
    if (ticketCount === 0) {
      const tickets = Array.from({ length: 1000 }, (_, i) => ({
        ticketNumber: i + 1,
        status: 'available'
      }));
      await Ticket.insertMany(tickets);
      console.log('Initialized 1000 tickets');
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

startServer();

// Handle uncaught promises and exceptions
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
