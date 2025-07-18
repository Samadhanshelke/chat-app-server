require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const cookie = require('cookie');
const WebSocket = require('ws');

// Create app and HTTP server
const app = express();
const server = http.createServer(app);

// Create WebSocket server AFTER creating the HTTP server
const wss = new WebSocket.Server({ server });

// ✅ Log the refresh token from cookies when a WebSocket connects
wss.on('connection', (ws, req) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const refreshToken = cookies.refreshToken;

  console.log('Received refreshToken:', refreshToken);

  ws.send('Token received and logged!');
});

// Middleware
app.use(cors({
  origin: process.env.BASE_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use('/api/v1/auth', require('./routes/AuthRoutes'));
app.use('/api/v1', require('./routes/UserRoutes'));
app.use('/api/v1/message', require('./routes/MessageRoutes'));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
