const mongoose = require('mongoose');
const sendOtp = require('../utils/SendOtp');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // OTP expires in 5 minutes
  },
  attempts: {
    type: Number,
    default: 0,
  },
  nextAllowedTime: {
    type: Date,
    default: null,
  },
});

otpSchema.pre("save",async function(next){
// Only send an email when a new document is created
if (this.isNew) {
    await sendOtp(this.email, this.otp);
}
    next();
} )

const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp;
