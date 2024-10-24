const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: Number,
    required: true
  },
  raffleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Raffle',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'sold'],
    default: 'available',
  },
  reservedAt: {
    type: Date,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
});

// Drop any existing indexes
mongoose.model('Ticket', TicketSchema).collection.dropIndexes().catch(err => {
  console.log('No indexes to drop');
});

// Create compound index
TicketSchema.index({ raffleId: 1, ticketNumber: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', TicketSchema);