// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to extract token from header
const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

// Generic error handler
const handleError = (res, status, message, error = null) => {
  console.error(`Auth Error: ${message}`, error);
  return res.status(status).json({
    message,
    error: process.env.NODE_ENV === 'development' ? error?.message : undefined
  });
};

// Base authentication middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return handleError(res, 401, 'No token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database (excluding password)
    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();

    if (!user) {
      return handleError(res, 401, 'User not found');
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return handleError(res, 401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return handleError(res, 401, 'Token expired');
    }
    return handleError(res, 500, 'Authentication error', error);
  }
};

// Admin check middleware
const isAdmin = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return handleError(res, 401, 'No token provided');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('isAdmin').lean();

    if (!user) {
      return handleError(res, 401, 'User not found');
    }

    if (!user.isAdmin) {
      return handleError(res, 403, 'Admin access required');
    }

    req.user = user;
    next();
  } catch (error) {
    return handleError(res, 500, 'Admin authorization error', error);
  }
};

// Regular user check middleware
const isUser = async (req, res, next) => {
  try {
    await verifyToken(req, res, next);
  } catch (error) {
    return handleError(res, 500, 'User authorization error', error);
  }
};

// Resource ownership check middleware
const isOwner = (paramName = 'userId') => {
  return async (req, res, next) => {
    try {
      const token = getTokenFromHeader(req);

      if (!token) {
        return handleError(res, 401, 'No token provided');
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('isAdmin').lean();

      if (!user) {
        return handleError(res, 401, 'User not found');
      }

      const resourceId = req.params[paramName];

      // Allow if user is admin or resource owner
      if (user.isAdmin || decoded.userId === resourceId) {
        req.user = user;
        next();
      } else {
        return handleError(res, 403, 'Access denied');
      }
    } catch (error) {
      return handleError(res, 500, 'Authorization error', error);
    }
  };
};

module.exports = {
  verifyToken,
  isAdmin,
  isUser,
  isOwner
};