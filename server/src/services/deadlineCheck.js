const BaseRepository = require('../repositories/BaseRepository');
const { getBotResponse } = require('../utils/chatbot');

const chatsRepo = new BaseRepository('chats');
const messagesRepo = new BaseRepository('chat_messages');

async function createMessage({ chat_id, message_text, is_from_user }) {
  const message = await messagesRepo.create({
    chat_id,
    message_text,
    is_from_user,
    timestamp: new Date()
  });

  // Check if bot is tagged
  if (is_from_user && message_text.includes('@bot')) {
    const botReply = getBotResponse(message_text);
    await messagesRepo.create({
      chat_id,
      message_text: botReply,
      is_from_user: false,
      timestamp: new Date()
    });
  }

  return message;
}

async function createPrivateChatWithBot(user_id) {
  const existing = await chatsRepo.getAll({ user_id, is_chatbot: true });
  if (existing.length > 0) return existing[0];

  return chatsRepo.create({
    user_id,
    is_chatbot: true,
    chat_name: 'Chat with Bot',
    profile_image: null
  });
}

module.exports = {
  createMessage,
  createPrivateChatWithBot
};
