const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalsController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

// --- User Goals (specific routes first to avoid conflict with /:id) ---
router.get('/users', goalController.getUserGoals); // ✅ must come before /:id
router.post('/user', goalController.grantGoal);
router.patch('/user/:user_goal_id/seen', goalController.markAsSeen);

// --- Main Goals CRUD ---
router.post('/', goalController.createGoal);
router.get('/', goalController.getAllGoals);
router.get('/:id', goalController.getGoal); // ⛔ this should be last among GETs to avoid conflict
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
