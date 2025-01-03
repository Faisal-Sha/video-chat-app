// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store active rooms
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} joining room ${roomId}`);
    
    // Leave previous rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join new room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    // Add user to room
    const room = rooms.get(roomId);
    room.add(socket.id);

    // Notify others in room
    socket.to(roomId).emit('user-joined', socket.id);
    
    // Log room status
    console.log(`Room ${roomId} users:`, Array.from(room));
  });

  socket.on('offer', ({ offer, roomId }) => {
    console.log(`Offer received from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ answer, roomId }) => {
    console.log(`Answer received from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    console.log(`ICE candidate received from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        // Notify others in room
        io.to(roomId).emit('user-left', socket.id);
        
        // Clean up empty rooms
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});