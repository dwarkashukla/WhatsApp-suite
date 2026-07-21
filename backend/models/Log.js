const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    event: { type: String, required: true }, // e.g. 'QR_GENERATED', 'MESSAGE_SENT'
    level: { type: String, enum: ['info', 'warn', 'error', 'success'], default: 'info' },
    details: { type: String, default: '' },
    sessionId: { type: String, default: null },
    broadcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast', default: null },
    phone: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// TTL index: auto-delete logs older than 30 days
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Log', logSchema);
