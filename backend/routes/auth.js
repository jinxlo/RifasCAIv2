// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to create JWT token and user response
const createTokenResponse = (user) => {
  const token = jwt.sign(
    {
      userId: user._id,
      isAdmin: user.isAdmin,
      email: user.email,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    isAdmin: user.isAdmin,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      idNumber: user.idNumber,
      phoneNumber: user.phoneNumber
    }
  };
};

// Login with password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Normalized email:', normalizedEmail);

    // Find user and explicitly select password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user) {
      console.log('User not found:', normalizedEmail);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', {
      email: user.email,
      isAdmin: user.isAdmin,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password verification result:', isMatch);

    if (!isMatch) {
      console.log('Invalid password for:', normalizedEmail);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token and response
    const response = createTokenResponse(user);
    console.log('Login successful for:', normalizedEmail);

    // Debug log the token
    console.log('Generated token:', {
      tokenLength: response.token.length,
      isAdmin: response.isAdmin,
      userId: response.user.id
    });

    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('Verifying token for /me endpoint');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', { userId: decoded.userId, isAdmin: decoded.isAdmin });

    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('User not found for token userId:', decoded.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found for /me endpoint:', {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin
    });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        idNumber: user.idNumber,
        phoneNumber: user.phoneNumber,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(401).json({ 
      message: 'Invalid or expired token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Password reset requested for:', email);

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log('User not found for password reset:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated reset token for:', email);
    
    // Save hashed token
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await user.save();
    console.log('Reset token saved for user:', email);

    res.json({ 
      message: 'Password reset initiated. Please contact admin to complete the process.',
      resetToken // In production, send this via email instead
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Error processing password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    console.log('Password reset attempt with token');

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('Invalid or expired reset token');
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    console.log('Valid reset token found for user:', user.email);

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    console.log('Password reset successful for user:', user.email);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;