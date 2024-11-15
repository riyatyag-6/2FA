const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  failedAttempts: { type: Number, default: 0 },
  twoFactorSecret: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  emailService: { type: String, default: 'Gmail' }, // New field
  emailPassword: { type: String }, // New field
});

module.exports = mongoose.model('User', userSchema);
