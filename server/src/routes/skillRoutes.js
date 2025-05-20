const express = require('express');
const router = express.Router();
const {
  createSkill,
  getUserSkills,
  updateSkill,
  deleteSkill
} = require('../controllers/skillsController');

// Middleware to protect routes
const authenticate = require('../middlewares/authenticate');

// All skill routes require authentication
router.use(authenticate);

// POST: Add one or multiple skills
router.post('/', createSkill);

// GET: Fetch all skills of the authenticated user
router.get('/', getUserSkills);

// PUT: Update a specific skill
router.put('/:id', updateSkill);

// DELETE: Delete a specific skill
router.delete('/:id', deleteSkill);

module.exports = router;
