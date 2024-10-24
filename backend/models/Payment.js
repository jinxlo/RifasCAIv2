const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raffle: { type: mongoose.Schema.Types.ObjectId, ref: 'Raffle', required: true },
  fullName: { type: String, required: true },
  idNumber: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  selectedNumbers: [{ type: Number, required: true }],
  method: { type: String, required: true },
  totalAmountUSD: { type: Number, required: true },
  proofOfPayment: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);