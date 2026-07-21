const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    phone: { type: String, required: true },
    name: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: { type: Date },
    error: { type: String },
    sessionId: { type: String }, // which WhatsApp account sent it
  },
  { _id: false }
);

const broadcastSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ['image', 'video', 'document', null], default: null },
    recipients: [recipientSchema],
    status: {
      type: String,
      enum: ['pending', 'running', 'paused', 'completed', 'failed', 'stopped'],
      default: 'pending',
    },
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    minDelay: { type: Number, default: 5000 },
    maxDelay: { type: Number, default: 15000 },
    useRoundRobin: { type: Boolean, default: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Broadcast', broadcastSchema);
