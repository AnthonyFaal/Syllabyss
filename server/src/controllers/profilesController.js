const { createProfile } = require('../models/profilesModel');
const pool = require('../config/db');

// Get the current authenticated user's profile
const getProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile has not been set yet.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get any user's profile by ID
const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found for the given user ID.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper validation function
const validateProfileInput = ({ selected_field, selected_specialization, experience_level }) => {
    const errors = [];
  
    if (!selected_field || typeof selected_field !== 'string') {
      errors.push('Selected field is required and must be a string.');
    }
    if (!selected_specialization || typeof selected_specialization !== 'string') {
      errors.push('Selected specialization is required and must be a string.');
    }
    if (!experience_level || typeof experience_level !== 'string') {
      errors.push('Experience level is required and must be a string.');
    }
  
    return errors;
  };
  
  // Create a profile
  const createUserProfile = async (req, res) => {
    try {
      const user_id = req.user.user_id;
      const { selected_field, selected_specialization, experience_level } = req.body;
  
      const errors = validateProfileInput({ selected_field, selected_specialization, experience_level });
      if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }
  
      // Check if profile already exists
      const check = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [user_id]);
      if (check.rows.length > 0) {
        return res.status(400).json({ message: 'Profile already exists.' });
      }
  
      const profile = await createProfile({
        user_id,
        selected_field,
        selected_specialization,
        experience_level
      });
  
      res.status(201).json({ message: 'Profile created successfully.', profile });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  
  // Update profile
  const updateUserProfile = async (req, res) => {
    try {
      const user_id = req.user.user_id;
      const { selected_field, selected_specialization, experience_level } = req.body;
  
      const errors = validateProfileInput({ selected_field, selected_specialization, experience_level });
      if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }
  
      const result = await pool.query(
        `UPDATE user_profiles
         SET selected_field = $1,
             selected_specialization = $2,
             experience_level = $3
         WHERE user_id = $4
         RETURNING *`,
        [selected_field, selected_specialization, experience_level, user_id]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Profile not found. Cannot update non-existing profile.' });
      }
  
      res.json({ message: 'Profile updated successfully.', profile: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  

module.exports = {
  getProfile,
  getProfileById,
  createUserProfile,
  updateUserProfile
};
