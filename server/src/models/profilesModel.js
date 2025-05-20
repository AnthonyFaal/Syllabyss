const pool = require('../config/db');

const createProfile = async ({ user_id, selected_field, selected_specialization, experience_level }) => {
  const res = await pool.query(
    `INSERT INTO user_profiles (user_id, selected_field, selected_specialization, experience_level)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user_id, selected_field, selected_specialization, experience_level]
  );
  return res.rows[0];
};

module.exports = { createProfile };
