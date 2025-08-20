const express = require('express');
const router = express.Router();
const  UserQuizController = require('../controllers/quizController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

// ANSWER quiz (submit answers for a quiz)
router.post('/:quiz_id/answer', (req, res) => UserQuizController.answerQuiz(req, res));
router.get('/:quiz_id/attempt-status',  UserQuizController.getQuizAttemptStatus);

module.exports = router;