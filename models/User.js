// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength:25,
  },
  userName: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    // trim: true,
    // lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  about: {
    type: String,
    required: true,
  },
  profilePicture:{
    type: String,
    default: '', 
  },
  profilePicturePublicId:{
    type: String,
    default: '',
  },
  refreshToken: {
    type: String,
    // required:true
  },
  isVerified:{
    type:Boolean,
    required:true,
    default:false
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },


}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User; // Exporting correctly
