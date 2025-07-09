// utils/sendOtp.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
host:process.env.SMTP_HOST,
  auth: {
    user: process.env.SMTP_AUTH_USER,
    pass: process.env.SMTP_AUTH_PASS,
  },
});

const sendOtp = async (email, otp) => {
  const mailOptions = {
    from: 'samadhan',
    to: email,
    subject: 'Verify your email',
    text: `Your OTP for email verification is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    // console.log('OTP sent successfully');
  } catch (error) {
    console.error('Error sending OTP:', error);
  }
};

module.exports = sendOtp;
