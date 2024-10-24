const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  raffle: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Raffle', 
    required: true,
    immutable: true, // Ensures raffle cannot be changed after creation
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid raffle ID'
    }
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
  email: { 
    type: String, 
    required: true, 
    trim: true, 
    lowercase: true 
  },
  selectedNumbers: [{ 
    type: Number, 
    required: true,
    immutable: true // Ensures selectedNumbers cannot be modified after creation
  }],
  method: { 
    type: String, 
    required: true, 
    enum: ['Binance Pay', 'Pagomovil', 'Zelle'] 
  },
  totalAmountUSD: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  proofOfPayment: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected'],
    default: 'Pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Add indexes for performance
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ raffle: 1, status: 1 });

// Pre-save middleware to validate status changes
paymentSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'Rejected') {
    // Ensure the raffle field is not cleared during rejection
    if (!this.raffle) {
      next(new Error('Raffle reference is required'));
    }
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
