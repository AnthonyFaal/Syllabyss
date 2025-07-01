const { validateEntity, BaseRepository } = require('../utils/index');
const { getIO } = require('../config/socket'); 
const { miriamKnowledgeBot } = require('../Assitant/assistant');

class ChatController {
  constructor() {
    this.chatRepo = new BaseRepository('chats');
    this.chatMessageRepo = new BaseRepository('chat_messages');
    this.chatMemberRepo = new BaseRepository('chat_members');
    this.userRepo  = new BaseRepository('users');
    this.userTypingMap = new Map(); // Track typing status { chatId: Set(userIds) }

    // Bind all methods using arrow functions
    this.createChat = this.createChat.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.getChat = this.getChat.bind(this);
    this.updateChat = this.updateChat.bind(this);
    this.deleteChat = this.deleteChat.bind(this);
    this.getMessages = this.getMessages.bind(this);
    this.addMember = this.addMember.bind(this);
    this.removeMember = this.removeMember.bind(this);
    this.setTyping = this.setTyping.bind(this);
    this.clearTyping = this.clearTyping.bind(this);
    this.getTypingUsers = this.getTypingUsers.bind(this);
    this.getUserChats = this.getUserChats.bind(this);
    this.getPublicChats = this.getPublicChats.bind(this);
  }

  // Create a new chat
  createChat = async (req, res, next) => {
    try {
      const user_id = req.user.id;
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: "Missing user_id (authenticated user required)"
        });
      }

      // Normalize to array so we can handle both single and multiple
      const chatsInput = Array.isArray(req.body) ? req.body : [req.body];

      const createdChats = [];

      for (const input of chatsInput) {
        const { chat_name, profile_image, is_chatbot, is_private } = input;

        if (!chat_name || chat_name.trim() === "") {
          return res.status(400).json({
            success: false,
            error: "chat_name is required and cannot be empty"
          });
        }

        const chatData = {
          chat_name: chat_name.trim(),
          profile_image: profile_image || null,
          is_chatbot: typeof is_chatbot === 'boolean' ? is_chatbot : false,
          is_private: typeof is_private === 'boolean' ? is_private : true,
          user_id
        };

        // Validate using your utility
        validateEntity(chatData, 'chat', 'create');

        // Create chat
        const chat = await this.chatRepo.create({
          chat_name: chatData.chat_name,
          profile_image: chatData.profile_image,
          is_chatbot: chatData.is_chatbot,
          is_private: chatData.is_private,
          user_id: chatData.user_id
        });

        // Add creator as member/admin
        await this.chatMemberRepo.create({
          chat_id: chat.chat_id,
          user_id: chatData.user_id,
          is_admin: true,
          joined_at: new Date()
        });

        createdChats.push(chat);
      }

      res.status(201).json({
        success: true,
        data: createdChats.length === 1 ? createdChats[0] : createdChats
      });

    } catch (error) {
      console.error("Error creating chat(s):", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.details || error.message || "Failed to create chat(s)"
      });
    }
  }

sendMessage = async (req, res) => {
  try {
    const {
      user_id,         // Provided by user
      message_text,
      intent,
      confidence_score
    } = req.body;

    const chat_id = parseInt(req.params.chatId, 10);

    // Validate required fields
    if (!user_id || !chat_id) {
      return res.status(400).json({
        success: false,
        error: "Missing user_id or chat_id"
      });
    }

    if (!message_text || message_text.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "message_text is required"
      });
    }

    // Confirm membership + get chat_member_id
    const isMember = await this.chatMemberRepo.getOne({
      chat_id,
      user_id
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: "You are not a member of this chat"
      });
    }

    // Compose message data
    const messageData = {
      chat_id,
      chat_member_id: isMember. user_id,   // ✅ this is the key link
      message_text: message_text.trim(),
      is_from_user: true,
      intent: intent || "general",
      confidence_score: confidence_score !== undefined ? confidence_score : null
    };

    // Validate input
    validateEntity(messageData, 'chatMessage', 'create');

    // Save to DB (✅ no user_id here, use chat_member_id)
    const savedMessage = await this.chatMessageRepo.create({
      chat_id: messageData.chat_id,
      chat_member_id: messageData.chat_member_id,
      message_text: messageData.message_text,
      is_from_user: messageData.is_from_user,
      intent: messageData.intent,
      confidence_score: messageData.confidence_score
    }); 

    // Emit via socket
    getIO().to(`chat_${chat_id}`).emit('new_message', savedMessage);

    // Clear typing
    this.clearTyping(chat_id, user_id);

    res.status(201).json({
      success: true,
      data: savedMessage
    });

  } catch (error) {
    console.error("Error sending message:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.details || error.message || "Failed to send message"
    });
  }
};

  // Get chat by ID
 getChat = async (req, res) => {
  try {
    const chat = await this.chatRepo.getById(req.params.chat_id, 'chat_id'); // Specify the column name
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is a member of this chat
    const isMember = await this.chatMemberRepo.getOne({
      chat_id: chat.chat_id,
      user_id: req.user.user_id,
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Error getting chat:', error);
    res.status(500).json({ error: 'Failed to get chat' });
  }
}

// Update chat
updateChat = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin of this chat
    const isAdmin = await this.chatMemberRepo.getOne({
      chat_id: req.params.chat_id,
      user_id: req.user.user_id,
      is_admin: true,
    });

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can update chats' });
    }

    const updatedChat = await this.chatRepo.update(req.params.chat_id, req.body, 'chat_id');
    res.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
}

// Delete chat
deleteChat = async (req, res) => {
  try {
    // Check if user is admin of this chat
    const isAdmin = await this.chatMemberRepo.getOne({
      chat_id: req.params.chat_id,
      user_id: req.user.user_id,
      is_admin: true,
    });

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete chats' });
    }

    // Delete all messages first
    await this.chatMessageRepo.deleteAll({ chat_id: req.params.chat_id });

    // Delete all members
    await this.chatMemberRepo.deleteAll({ chat_id: req.params.chat_id });

    // Finally delete the chat
    await this.chatRepo.delete(req.params.chat_id, 'chat_id');

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
}

  // Get chat messages
getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of this chat
    const isMember = await this.chatMemberRepo.getOne({
      chat_id: chatId,
      user_id: userId,
    });

    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    // First get all messages for the chat
    const messages = await this.chatMessageRepo.getAll(
      { chat_id: chatId },
      { orderBy: 'timestamp', order: 'ASC' }
    );

    // Then get user information for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const user = await this.userRepo.getOne({ user_id: message.chat_member_id });
        return {
          ...message,
          user_name: user.name,
          profile_image: user.profile_image,
          is_current_user: message.chat_member_id === userId
        };
      })
    );

    res.json(messagesWithUsers);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

  // Add member to chat
addMember = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userIdToAdd = req.body.user_id;
    const requesterId = req.user.id;

    // Get chat info
    const chat = await this.chatRepo.getById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // If chat is private, ensure requester is admin
    if (chat.is_private) {
      const isAdmin = await this.chatMemberRepo.getOne({
        chat_id: chatId,
        user_id: requesterId,
        is_admin: true,
      });

      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can add members to private chats' });
      }
    }

    // Check if user is already a member
    const existingMember = await this.chatMemberRepo.getOne({
      chat_id: chatId,
      user_id: userIdToAdd,
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this chat' });
    }

    // Add member
    const member = await this.chatMemberRepo.create({
      chat_id: chatId,
      user_id: userIdToAdd,
      is_admin: req.body.is_admin || false,
      joined_at: new Date(),
    });

  getIO.to(`chat_${chatId}`).emit('new_member', member);

    res.status(201).json(member);

  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};


  // Remove member from chat
  removeMember = async (req, res) => {
    try {
      // Check if requesting user is admin of this chat
      const isAdmin = await this.chatMemberRepo.getOne({
        chat_id: req.params.chatId,
        user_id: req.user.id,
        is_admin: true,
      });

      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can remove members' });
      }

      // Can't remove yourself
      if (req.user.id === req.params.userId) {
        return res.status(400).json({ error: 'You cannot remove yourself from the chat' });
      }

      const result = await this.chatMemberRepo.deleteWhere('user_id', [req.params.userId], {
        chat_id: req.params.chatId,
      });

      if (result.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Notify chat about removed member
      getIO.to(`chat_${req.params.chatId}`).emit('member_removed', {
        chat_id: req.params.chatId,
        user_id: req.params.userId,
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  // Set typing indicator
setTyping = async (req, res) => {
  try {
    const { chatId } = req.params;

    const isMember = await this.chatMemberRepo.getOne({
      chat_id: chatId,
      user_id: req.user.id,
    });

    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    if (!this.userTypingMap.has(chatId)) {
      this.userTypingMap.set(chatId, new Set());
    }
    this.userTypingMap.get(chatId).add(req.user.id);

    // 💡 Now safely get io because server is started
    const io = getIO();
    io.to(`chat_${chatId}`).emit('typing', {
      chatId,
      userId: req.user.id,
      isTyping: true,
    });

    setTimeout(() => {
      this.clearTyping(chatId, req.user.id);
    }, 3000);

    res.json({ message: 'Typing indicator set' });
  } catch (error) {
    console.error('Error setting typing indicator:', error);
    res.status(500).json({ error: 'Failed to set typing indicator' });
  }
}

  clearTyping = (chatId, userId) => {
  if (this.userTypingMap.has(chatId)) {
    const typingUsers = this.userTypingMap.get(chatId);
    if (typingUsers.has(userId)) {
      typingUsers.delete(userId);

      // Broadcast typing status to other chat members
      getIO().to(`chat_${chatId}`).emit('typing', {
        chatId,
        userId,
        isTyping: false,
      });
    }
  }
}


  // Get typing users for a chat
  getTypingUsers = async (req, res) => {
    try {
      const { chatId } = req.params;

      // Check if user is a member of this chat
      const isMember = await this.chatMemberRepo.getOne({
        chat_id: chatId,
        user_id: req.user.id,
      });

      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this chat' });
      }

      const typingUsers = this.userTypingMap.get(chatId) || new Set();
      res.json({
        chatId,
        typingUsers: Array.from(typingUsers),
      });
    } catch (error) {
      console.error('Error getting typing users:', error);
      res.status(500).json({ error: 'Failed to get typing users' });
    }
  }

  // Get all chats for a user
getUserChats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    // Get all bot chats (user doesn't need to be a member)
    const botChats = await this.chatRepo.getWhere({
      is_chatbot: true,
    });

    // Get memberships for this user
    const memberships = await this.chatMemberRepo.getWhere({
      user_id: userId,
    });

    const chatIds = memberships.map(m => m.chat_id);

    // Get non-bot chats the user is a member of
    const userChats = chatIds.length
      ? await this.chatRepo.getWhere({
          chat_id: { $in: chatIds },
          is_chatbot: false,
        })
      : [];

    // Combine bot and user chats (remove duplicates just in case)
    const combinedChats = [...botChats, ...userChats].reduce((acc, chat) => {
      if (!acc.some(c => c.chat_id === chat.chat_id)) acc.push(chat);
      return acc;
    }, []);

    const allChatIds = combinedChats.map(chat => chat.chat_id);

    // Get all members for those chats
    const allMembers = await this.chatMemberRepo.getWhere({
      chat_id: { $in: allChatIds },
    });

    // Fetch last messages for each chat
    const enhancedChats = await Promise.all(
      combinedChats.map(async (chat) => {
        const members = allMembers.filter(m => m.chat_id === chat.chat_id);

       
        const lastMessage =( await this.chatMessageRepo.getAll(
          { chat_id: chat.chat_id },
          {
            orderBy: 'timestamp',
            order: 'DESC',
            limit: 1,
            joins: [
              {
                table: 'chat_members',
                on: 'chat_messages.chat_member_id = chat_members.chat_member_id',
                type: 'inner'
              },
              {
                table: 'users',
                on: 'chat_members.user_id = users.user_id',
                type: 'inner',
                select: ['name as username']
              }
            ],
            select: ['message_text', 'timestamp']
          }
        )).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  .slice(0, 1);

        return {
          ...chat,
          members,
          last_message: lastMessage[0] || null,
        };
      })
    );

    // Sort: Bots pinned to top, then by last_message timestamp descending
    const sortedChats = enhancedChats.sort((a, b) => {
      if (a.is_chatbot && !b.is_chatbot) return -1;
      if (!a.is_chatbot && b.is_chatbot) return 1;

      const aTime = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
      const bTime = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
      return bTime - aTime;
    });

    res.json({
      success: true,
      data: sortedChats,
    });

  } catch (error) {
    console.error('Error getting user chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user chats',
    });
  }
};

  // Get all public chats (is_chatbot = false and is_private = false)
getPublicChats = async (req, res) => {
  try {
    // Get all public chats
    const publicChats = await this.chatRepo.getAll(
      { is_private: false,
        is_chatbot: false
       },
      {
        joins: [
          {
            table: 'chat_members',
            on: 'chats.chat_id = chat_members.chat_id',
            type: 'left',
            where: { user_id: req.user?.user_id || null },
            select: ['user_id'] // To determine membership
          }
        ]
      }
    );

    // Enhance each chat with last message and membership status
    const enhancedChats = await Promise.all(
      publicChats.map(async (chat) => {
        const lastMessage = (await this.chatMessageRepo.getAll(
          { chat_id: chat.chat_id },
          {
            orderBy: 'timestamp',
            order: 'DESC',
            limit: 1,
            joins: [
              {
                table: 'chat_members',
                on: 'chat_messages.chat_member_id = chat_members.chat_member_id',
                type: 'inner'
              },
              {
                table: 'users',
                on: 'chat_members.user_id = users.user_id',
                type: 'inner',
                select: ['name as username']
              }
            ],
            select: ['message_text', 'timestamp']
          }
        )).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  .slice(0, 1);
        
        return {
          ...chat,
          last_message: lastMessage[0] || null,
          is_member: !!chat.user_id // If user_id exists in join, they're a member
        };
      })
    );

    res.json({ success: true, data: enhancedChats });
  } catch (error) {
    console.error('Error getting public chats:', error);
    res.status(500).json({ error: 'Failed to get public chats' });
  }
} 

}

module.exports = new ChatController();