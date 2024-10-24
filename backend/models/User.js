// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true, // Ensure email is stored in lowercase
    trim: true      // Remove whitespace
  },
  password: { 
    type: String, 
    required: true,
    select: false,  // Password won't be returned in queries by default
    minlength: 6
  },
  fullName: { 
    type: String, 
    required: true,
    trim: true
  },
  idNumber: { 
    type: String, 
    required: true,
    trim: true
  },
  phoneNumber: { 
    type: String, 
    required: true,
    trim: true
  },
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
      return next();
    }

    // Log password hashing (remove in production)
    console.log('Hashing password for user:', this.email);

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Update passwordChangedAt timestamp
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token works

    console.log('Password hashed successfully for user:', this.email);
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Need to select password since it's not included by default
    if (!this.password) {
      const user = await this.constructor.findById(this._id).select('+password');
      if (!user) {
        throw new Error('User not found');
      }
      return bcrypt.compare(candidatePassword, user.password);
    }
    
    // Log password comparison (remove in production)
    console.log('Comparing password for user:', this.email);
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password match result:', isMatch);
    
    return isMatch;
  } catch (error) {
    console.error('Error comparing password:', error);
    throw error;
  }
};

// Method to update password securely
userSchema.methods.updatePassword = async function(newPassword) {
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(newPassword, salt);
    this.passwordChangedAt = Date.now() - 1000;
    await this.save();
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Method to check if password was changed after a given timestamp
userSchema.methods.changedPasswordAfter = function(timestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return timestamp < changedTimestamp;
  }
  return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  
  return resetToken;
};

// Static method to find admin users
userSchema.statics.findAdmins = function() {
  return this.find({ isAdmin: true });
};

// Virtual for user's full information
userSchema.virtual('fullInfo').get(function() {
  return {
    id: this._id,
    email: this.email,
    fullName: this.fullName,
    idNumber: this.idNumber,
    phoneNumber: this.phoneNumber,
    isAdmin: this.isAdmin,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
});

// Ensure virtuals are included when converting to JSON
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

// Add some model validations
User.schema.path('email').validate(function(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}, 'Invalid email format');

User.schema.path('password').validate(function(password) {
  return password && password.length >= 6;
}, 'Password must be at least 6 characters');

module.exports = User;