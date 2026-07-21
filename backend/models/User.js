const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    settings: {
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      defaultMinDelay: { type: Number, default: 5000 },
      defaultMaxDelay: { type: Number, default: 15000 },
      autoRetry: { type: Boolean, default: true },
      maxRetries: { type: Number, default: 3 },
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Never return password
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
