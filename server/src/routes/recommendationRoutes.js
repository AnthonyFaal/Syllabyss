const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

// Recommendation routes
router.get('/:userId', recommendationController.getRecommendations); // Get personalized recommendations
router.get('/history', recommendationController.getRecommendationHistory); // Get recommendation history
router.patch('/:recommendationId/accept', recommendationController.acceptRecommendation); // Accept a recommendation

module.exports = router;