const WebSocket = require('ws');

class RealtimeService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> WebSocket connection
  }

  init(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      // Extract user ID from query params or headers
      const userId = req.url.split('userId=')[1];
      
      if (userId) {
        this.clients.set(userId, ws);
      }

      ws.on('close', () => {
        if (userId) {
          this.clients.delete(userId);
        }
      });
    });
  }

  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcastToChat(chatId, message) {
    // In a real app, you would look up which users are in this chat
    // and send the message to all of them
    // This is a simplified version
    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ chatId, ...message }));
      }
    });
  }
}

module.exports = new RealtimeService();