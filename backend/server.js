const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Frontend URL
    methods: ["GET", "POST"],
  },
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data); // Broadcast offer to other peers
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data); // Broadcast answer
  });

  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data); // Broadcast ICE candidates
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Signaling server is running on port ${PORT}`));
