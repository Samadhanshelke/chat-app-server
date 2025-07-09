const User = require('../models/User')

 const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -refreshToken");  
      res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

module.exports = {getAllUsers}