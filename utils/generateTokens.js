const jwt = require('jsonwebtoken');

const generateTokens = (user) => {
  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
   process.env.ACCESS_TOKEN_SECRET_CODE,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME }
  );

  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET_CODE,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME } 
  );

  return { accessToken, refreshToken };
};

module.exports = generateTokens;

