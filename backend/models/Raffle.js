const mongoose = require('mongoose');

const raffleSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: { type: String, required: true },
  productImage: { 
    type: String, 
    required: true,
    get: (imagePath) => {
      // Full URL for the image path
      return `${process.env.SERVER_URL || 'http://localhost:5000'}${imagePath}`;
    }
  },
  price: { type: Number, required: true },
  totalTickets: { type: Number, required: true },
  soldTickets: { type: Number, default: 0 },
  reservedTickets: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  drawDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, {
  toObject: { getters: true }, // Ensure getters are used when converting to objects
  toJSON: { getters: true }    // Ensure getters are used when converting to JSON
});

module.exports = mongoose.model('Raffle', raffleSchema);
