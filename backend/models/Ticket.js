// models/Ticket.js
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: Number,
    required: true,
    unique: true,
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
  },
});

module.exports = mongoose.model('Ticket', TicketSchema);
