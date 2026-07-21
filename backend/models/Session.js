const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
    label: { type: String, default: 'Account' },
    status: {
      type: String,
      enum: ['pending', 'qr_ready', 'connected', 'disconnected', 'banned', 'error'],
      default: 'pending',
    },
    qrCode: { type: String, default: null }, // base64 QR image
    lastSeen: { type: Date },
    messagesSent: { type: Number, default: 0 },
    messagesFailed: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
