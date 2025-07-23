const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderBoardController');

// Get leaderboard (all/weekly/monthly)
router.get('/',  leaderboardController.getLeaderboard);

// Get specific user's rank
router.get('/users/:user_id/rank',  leaderboardController.getUserRank);

module.exports = router;