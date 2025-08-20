require("dotenv").config();
const http = require('http');
const app = require("./api");
const { initializeSocket } = require('./src/config/socket');

// Determine port
const PORT = process.env.PORT || 4000;

// Determine host dynamically
const HOST = process.env.RENDER_EXTERNAL_URL
  ? `https://${process.env.RENDER_EXTERNAL_URL}` // Render deployment URL
  : `http://localhost:${PORT}`; // Local development

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running at ${HOST}`);
});

// Global error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
