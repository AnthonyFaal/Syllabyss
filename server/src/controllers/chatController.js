const { validateEntity, BaseRepository } = require('../utils/index');
const { detectIntent } = require('../services/chatbotService');

class ChatController {
  constructor() {
    this.chatRepo = new BaseRepository('chats');
    this.messageRepo = new BaseRepository('chat_messages');
  }

  // Create a new chat (individual or group)
  async createChat(req, res, next) {
    try {
      if (!req.user?.user_id) {
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized' 
        });
      }

      const chatData = {
        user_id: req.user.user_id,
        ...req.body
      };

      validateEntity(chatData, 'chat', 'create');

      const chat = await this.chatRepo.create(chatData);

      res.status(201).json({
        success: true,
        data: chat
      });
    } catch (error) {
      next(error);
    }
  }

  // Get chat details
  async getChat(req, res, next) {
    try {
      const chat = await this.chatRepo.getById(req.params.id);
      
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
        if (!req.user?.user_id) {
        return res.status(401).json({ 
            success: false,
            error: 'Unauthorized' 
        });
        }

        const messageData = {
        chat_id: req.params.chatId,
        user_id: req.user.user_id,
        ...req.body,
        is_from_user: true
        };

        validateEntity(messageData, 'chatMessage', 'create');

        // Save user message
        const message = await this.messageRepo.create(messageData);

        // Fetch chat to check if it's a bot chat or tagged bot in group
        const chat = await this.chatRepo.getById(req.params.chatId);

        let botResponse = null;

        const isBotChat = chat?.is_chatbot;
        const isBotTagged = req.body.message_text?.toLowerCase().includes('@bot');

        if (isBotChat || isBotTagged) {
        const sessionId = `${req.params.chatId}-${req.user.user_id}`;
        const botReply = await detectIntent(req.body.message_text, sessionId);

        // Save bot reply to messages table
        const botMessage = await this.messageRepo.create({
            chat_id: req.params.chatId,
            message_text: botReply.responseText,
            is_from_user: false,
            intent: botReply.intent,
            confidence_score: botReply.confidence,
        });

        botResponse = botMessage;
        }

        res.status(201).json({
        success: true,
        data: message,
        bot: botResponse
        });
    } catch (error) {
        next(error);
    }
}

  // Get chat messages
  async getMessages(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      
      const messages = await this.messageRepo.paginate({
        page: parseInt(page),
        limit: parseInt(limit),
        conditions: { chat_id: req.params.chatId },
        order: { timestamp: 'DESC' }
      });
      
      res.status(200).json({
        success: true,
        ...messages
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete chat
  async deleteChat(req, res, next) {
    try {
      const chat = await this.chatRepo.getById(req.params.id);
      
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }
      
      if (chat.user_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this chat'
        });
      }
      
      await this.chatRepo.delete(req.params.id);
      
      res.status(200).json({
        success: true,
        message: 'Chat deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

// Exporting an instance
module.exports = new ChatController();
