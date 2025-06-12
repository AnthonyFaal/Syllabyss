const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

router.post('/',  chatController.createChat);
// Get chat details by ID
router.get('/:id',  chatController.getChat);

// Send a message in a chat
router.post('/:chatId/messages', chatController.sendMessage);

// Get all messages from a chat
router.get('/:chatId/messages',  chatController.getMessages);

// Delete a chat
router.delete('/:id', authenticate, chatController.deleteChat);

module.exports = router;
