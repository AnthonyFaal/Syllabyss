const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)

router.get('/public-chats', chatController.getPublicChats);

router.use(authenticate);

// Chat routes
router.post('/', chatController.createChat);
router.get('/:chat_id', chatController.getChat);
router.put('/:id', chatController.updateChat);
router.delete('/:id', chatController.deleteChat);
router.get('/user/:userId?', chatController.getUserChats); 
// Message routes 
router.post('/:chatId/messages', chatController.sendMessage);
router.get('/:chatId/messages', chatController.getMessages);
 
// Member routes
router.post('/:chatId/members', chatController.addMember);
router.delete('/:chatId/members/:userId', chatController.removeMember);

// Typing indicators
router.post('/:chatId/typing', chatController.setTyping);
router.get('/:chatId/typing', chatController.getTypingUsers);

module.exports = router;
