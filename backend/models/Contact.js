const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: '' },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    isOptedOut: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index: unique phone per user
contactSchema.index({ userId: 1, phone: 1 }, { unique: true });
contactSchema.index({ userId: 1, tags: 1 });

module.exports = mongoose.model('Contact', contactSchema);
