// routes/MessageRoutes.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authenticate } = require('../middleware/Auth');

router.get('/:userId',authenticate, async (req, res) => {
  const currentUserId = req.user.id; // assuming you have auth middleware
  const otherUserId = req.params.userId;

  const messages = await Message.find({
    $or: [
      { from: currentUserId, to: otherUserId },
      { from: otherUserId, to: currentUserId }
    ]
  }).sort({ timestamp: 1 });

  res.json({ messages });
});

module.exports = router;
