require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const AuthRoutes = require('./routes/AuthRoutes');
const UserRoutes = require('./routes/UserRoutes');

const app = express();
const server = http.createServer(app); // Create HTTP server

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
app.use('/api/v1/auth', AuthRoutes);
app.use('/api/v1', UserRoutes);

// Socket.IO setup
const io = new Server(server, {
  cors: {
      origin: process.env.BASE_URL,
    credentials: true,
  },
});

let onlineUsers = new Map();

// Authenticate socket connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) return next(new Error('No token provided'));

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_CODE, (err, decoded) => {
    if (err) return next(new Error('Token invalid'));
    socket.userId = decoded.id;
    console.log('Socket connected:', decoded.id);
    console.log('Socket ID:', socket.id);
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);

  // Broadcast updated online users
  const online = Array.from(onlineUsers.keys());
  io.emit('online-users', online);
  console.log('Emitting online users:', online);
  
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('online-users', Array.from(onlineUsers.keys()));
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running`);
});
