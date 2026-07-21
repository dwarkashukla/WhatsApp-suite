const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ['image', 'video', 'document', null], default: null },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', templateSchema);
