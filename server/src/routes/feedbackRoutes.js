
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

// Create feedback
router.post('/', feedbackController.create);

// Get all feedback (with user name + profile_image)
router.get('/', feedbackController.getAll);

// Get feedback by feedback_id
router.get('/:id', feedbackController.getById);

// Get feedbacks by course_id
router.get('/by-course/:id', feedbackController.getByCourse);

// Get feedbacks by user_id
router.get('/user', feedbackController.getByUser);

// Update feedback by ID
router.put('/:id', feedbackController.update);

// Delete feedback by ID
router.delete('/:id', feedbackController.delete);

module.exports = router;
