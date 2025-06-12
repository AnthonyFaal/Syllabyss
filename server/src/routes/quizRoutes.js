const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// Questions
router.post('/questions', quizController.createQuestion);
router.get('/quizzes/:quiz_id/questions', quizController.getQuestionsByQuiz);

// Question Options
router.post('/question-options', quizController.createOption);
router.get('/questions/:question_id/options', quizController.getOptionsByQuestion);

// Quiz Attempts
router.post('/attempts', quizController.createAttempt);
router.get('/users/:user_id/attempts', quizController.getAttemptsByUser);

// Answers
router.post('/answers', quizController.createAnswer);
router.get('/attempts/:attempt_id/answers', quizController.getAnswersByAttempt);

module.exports = router;
