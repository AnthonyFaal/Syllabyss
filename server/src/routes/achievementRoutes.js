const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');

// Achievements CRUD
router.post('/achievements', achievementController.createAchievement);
router.get('/achievements', achievementController.getAllAchievements);
router.get('/achievements/:id', achievementController.getAchievement);
router.put('/achievements/:id', achievementController.updateAchievement);
router.delete('/achievements/:id', achievementController.deleteAchievement);

// User Achievements
router.post('/user-achievements', achievementController.grantAchievement);
router.get('/users/:user_id/achievements', achievementController.getUserAchievements);
router.patch('/user-achievements/:user_achievement_id/seen', achievementController.markAsSeen);

// Leaderboard
router.get('/leaderboard', achievementController.getLeaderboard);
router.get('/users/:user_id/rank', achievementController.getUserRank);

module.exports = router;