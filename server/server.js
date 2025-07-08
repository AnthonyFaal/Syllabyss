require("dotenv").config();
const http = require('http');
const app = require("./api");
const { initializeSocket } = require('./src/config/socket');
const { HOST, PORT } = require('./port'); // Import host and port

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
