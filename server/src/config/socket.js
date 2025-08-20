// config/socket.js
const socketio = require('socket.io');

let io = null;

function initializeSocket(server) {
  io = socketio(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // In socket.js connection handler:
  socket.on('join_chats', (chatIds) => {
    if (Array.isArray(chatIds)) {
      chatIds.forEach(chatId => {
        socket.join(`chat_${chatId}`);
        console.log(`User joined chat_${chatId}`); // Debug log
      });
    }
  });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

module.exports = {
  initializeSocket,
  getIO
};