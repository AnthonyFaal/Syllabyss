const express = require('express');
const router = express.Router();
const {
  getProfile,
  getProfileById,
  createUserProfile,
  updateUserProfile
} = require('../controllers/profilesController');
const authenticate = require('../middlewares/authenticate');

// Get current authenticated user's profile
router.get('/profile', authenticate, getProfile);

// Get any user's profile by ID (admin or public use case)
router.get('/profile/:id', authenticate, getProfileById);

// Create a new profile
router.post('/profile', authenticate, createUserProfile);

// Update existing profile
router.put('/profile', authenticate, updateUserProfile);

module.exports = router;
