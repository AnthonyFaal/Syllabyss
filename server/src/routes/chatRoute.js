const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const eventController = require('../controllers/eventsController');

const authenticate = require('../middlewares/authenticate');

// Public routes (no authentication required)
router.get('/chats/public-chats', chatController.getPublicChats);

router.use(authenticate);

// Chat CRUD operations
router.post('/chats', chatController.createChat);
router.get('/chats/:chat_id', chatController.getChat); 
router.put('/chats/:chat_id', chatController.updateChat);
router.delete('/chats/:chat_id', chatController.deleteChat);

// User-specific chat routes
router.get('/chats/user/:userId?', chatController.getUserChats);

// Chat Message routes
router.post('/chats/:chatId/messages', chatController.sendMessage);
router.get('/chats/:chatId/messages', chatController.getMessages);
 
// Chat Member routes
router.post('/chats/:chatId/members', chatController.addMember);
router.delete('/chats/:chatId/members/:userId', chatController.removeMember);
router.get('/chats/:chatId/members', chatController.getChatMembers);

// Typing indicators
router.post('/chats/:chatId/typing', chatController.setTyping);
router.get('/chats/:chatId/typing', chatController.getTypingUsers);

// ==============================================
// Event Routes (separate section)
// ============================================== 

// Event CRUD operations
router.post('/chats/:chat_id/events', eventController.createEvent);
router.get('/chats/:chat_id/events', eventController.getChatEvents);
router.put('/events/:event_id', eventController.updateEvent);
router.delete('/events/:event_id', eventController.deleteEvent);

// Event participation
router.post('/events/:event_id/participants', eventController.registerForEvent);
router.get('/events/:event_id/participants', eventController.getEventParticipants);
router.put('/events/:event_id/participants/:participant_id', eventController.updateParticipantStatus);

// Event messaging
router.post('/events/:event_id/messages', eventController.postEventMessage);
router.get('/events/:event_id/messages', eventController.getEventMessages);

module.exports = router;