const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');

// Goals CRUD
router.post('/goals', achievementController.createGoal);
router.get('/goals', achievementController.getAllGoals);
router.get('/goals/:id', achievementController.getGoal);
router.put('/goals/:id', achievementController.updateGoal);
router.delete('/goals/:id', achievementController.deleteGoal);

// User Goals
router.post('/user-goals', achievementController.grantGoal);
router.get('/users/:user_id/goals', achievementController.getUserGoals);
router.patch('/user-goals/:user_goal_id/seen', achievementController.markAsSeen);


module.exports = router;