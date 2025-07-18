const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const sendOtp = require("../utils/SendOtp");
const jwt = require('jsonwebtoken');
const generateTokens = require("../utils/generateTokens");
const cloudinary = require('../config/cloudinary')
const streamifier = require('streamifier');
const ValidateUserName = async (req, res) => {
  try {
    const { userName } = req.body;

    // Check if userName is provided
    if (!userName || userName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "username is required",
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ userName });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "username is already taken",
      });
    }

    return res.status(200).json({
      success: true,
      message: "username is available",
    });
  } catch (error) {
    console.error("Username validation error:", error);
    return res.status(500).json({
      success: false,
      message: "something went wrong while validating username",
    });
  }
};

const SendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user already exists
    const checkUserPresent = await User.findOne({ email });
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "User already exists",
      });
    }

    // Check if OTP attempts exceed the limit
    const existingOtp = await Otp.findOne({ email });
    const now = new Date();

    // if (existingOtp) {
    //   if (existingOtp.attempts >= 3 && existingOtp.nextAllowedTime > now) {
    //     const remainingTime = Math.ceil(
    //       (existingOtp.nextAllowedTime - now) / (60 * 1000)
    //     );
    //     return res.status(429).json({
    //       success: false,
    //       message: `Too many requests. Please try again in ${remainingTime} minutes.`,
    //     });
    //   }

    //   // Reset attempts if cooldown has passed
    //   if (existingOtp.nextAllowedTime <= now) {
    //     existingOtp.attempts = 0;
    //   }
    // }

    // Generate a unique 6-digit OTP
    let otp = Math.floor(100000 + Math.random() * 900000).toString();
    let result = await Otp.findOne({ otp });
    while (result) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      result = await Otp.findOne({ otp });
    }

    // Prepare data
    const nextAllowedTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour block

    if (existingOtp) {
      existingOtp.otp = otp;
      existingOtp.createdAt = now;
      existingOtp.attempts += 1;
      existingOtp.nextAllowedTime = nextAllowedTime;
      await existingOtp.save();
    } else {
      await Otp.create({
        email,
        otp,
        attempts: 1,
        nextAllowedTime,
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const SignUp = async (req, res) => {
  try {
    const { name,userName, password, email, otp } = req.body;
// console.log(req.body)
    // Check for missing fields
    if ( !name || !userName || !email || !password || !otp) {
      return res.status(422).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists.",
      });
    }

    // Get the most recent OTP
    const recentOtp = await Otp.find({ email }).sort({ createdAt: -1 }).limit(1);

    if (recentOtp.length === 0) {
      return res.status(404).json({
        success: false,
        message: "OTP not found. Please try again.",
      });
    }

    // Validate OTP and check expiration
    const otpExpired = (Date.now() - new Date(recentOtp[0].createdAt)) / 1000 > 300; // 5 min check
    if (otpExpired) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }
    if (otp !== recentOtp[0].otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await User.create({
      name,
      userName,
      email,
      password: hashedPassword,
      isVerified: true,
      profilePicture: ``,
    });

    // Generate Tokens
    const { accessToken, refreshToken } = generateTokens(newUser);
    // console.log('first',refreshToken,accessToken)
    // Store the refresh token
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // Set refresh token in HTTP-only cookies
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,         // ✅ Required for HTTPS
  sameSite: 'None',     // ✅ Allows cross-site cookies
});

    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      userName: newUser.userName,
      about:"Available",
      email: newUser.email,
      profilePicture: newUser.profilePicture,
    };
    
    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      accessToken,
      user: userResponse,
    });


  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while registering the user.",
    });
  }
};

const SignIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for missing fields
    if (!email || !password) {
      return res.status(422).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please try again.",
      });
    }

    // Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store the refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in HTTP-only cookies
  res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,         // ✅ Required for HTTPS
  sameSite: 'None',     // ✅ Allows cross-site cookies
});


    return res.status(200).json({
      success: true,
      message: "User signed in successfully!",
      accessToken,
      user: {
        id: user._id,
        about: user.about,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        userName: user.userName,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while signing in.",
    });
  }
};

const Logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
// console.log('refreshToken',refreshToken)
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token found. User not authenticated.",
      });
    }

    // Find user by refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    
    // Clear refresh token from database
    user.refreshToken = '';
    await user.save();
    // console.log('user',user)

    // Clear refresh token from cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'Strict',
    });

    return res.status(200).json({
      success: true,
      message: "User logged out successfully.",
    });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while logging out.",
    });
  }
};

const RefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies; // Read refreshToken from cookies
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    // Find user with matching refreshToken
    const user = await User.findOne({ refreshToken });
    // console.log(user)
    if (!user) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Verify the refresh token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_CODE, (err) => {
      if (err) return res.status(403).json({ message: 'Invalid or expired refresh token' });

       // Generate Tokens
    const { accessToken } = generateTokens(user);

      res.json({ accessToken });
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ResendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "User is already verified" });
    }

    // Generate and send new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.findOneAndUpdate(
      { email },
      { otp: otpCode, createdAt: Date.now() },
      { upsert: true }
    );

    await sendOtp(email, otpCode);
    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resend OTP" });
  }
};


const UpdateProfile = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user.id;
    const { name, about } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If new profile picture is uploaded
    if (file) {
      // Delete previous image from Cloudinary
      if (user.profilePicturePublicId) {
        await cloudinary.uploader.destroy(user.profilePicturePublicId);
      }

      // Upload new image
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'chat-app' },
            (error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            }
          );

          require('streamifier').createReadStream(file.buffer).pipe(stream);
        });
      };

      const result = await streamUpload(file.buffer);
      user.profilePicture = result.secure_url;
      user.profilePicturePublicId = result.public_id;
    }

    // Update name and about
    if (name) user.name = name;
    if (about) user.about = about;

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        about: user.about,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




module.exports = { SignUp,ValidateUserName,ResendOtp, SendOtp,RefreshToken,SignIn,Logout,UpdateProfile};
