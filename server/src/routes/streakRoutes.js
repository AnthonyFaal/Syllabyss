const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streakController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);


// 📅 GET current user's streak
router.get('/:user_id', streakController.getUserStreak);

// 🔄 PATCH update or continue streak
router.patch('/:user_id/update', streakController.updateUserStreak);

module.exports = router;
