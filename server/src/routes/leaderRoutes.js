const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderBoardController');

// Get leaderboard (all/weekly/monthly)
router.get('/',  leaderboardController.getLeaderboard);

// Get specific user's rank
router.get('/users/:user_id/rank',  leaderboardController.getUserRank);

// Update XP - Proper RESTful design
router.patch('/users/:user_id/xp',  leaderboardController.updateLeaderboardXP);

module.exports = router;
module.exports = router;