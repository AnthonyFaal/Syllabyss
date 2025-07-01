const express = require('express');
const router = express.Router();
const InsightsController = require('../controllers/insightsController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

router.get('/kpis/:userId', InsightsController.getUserKPIs);
router.get('/quiz-trends/:userId', InsightsController.getUserQuizTrends);
router.get('/goals/progress/:userId', InsightsController.getUserGoalProgress);
router.get('/activity/:userId', InsightsController.getUserRecentActivity);
router.get('/xp-breakdown/:userId', InsightsController.getUserXPBreakdown);

module.exports = router;
 