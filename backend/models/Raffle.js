const mongoose = require('mongoose');

const raffleSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: { type: String, required: true },
  productImage: { type: String, required: true },
  price: { type: Number, required: true },
  totalTickets: { type: Number, required: true },
  soldTickets: { type: Number, default: 0 },
  reservedTickets: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  drawDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Raffle', raffleSchema);