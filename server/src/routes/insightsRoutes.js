const express = require('express');
const router = express.Router();
const InsightsController = require('../controllers/insightsController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

router.get('/kpis/', InsightsController.getUserKPIs);
router.get('/quiz-trends', InsightsController.getUserQuizTrends);
router.get('/goals/progress', InsightsController.getUserGoalProgress);
router.get('/activity', InsightsController.getUserRecentActivity);
router.get('/xp-breakdown', InsightsController.getUserXPBreakdown);
router.get('/user/activity-log', InsightsController.getUserActivityLog);
router.get('/user/best-course', InsightsController.getBestPerformingCourse);

module.exports = router;
 