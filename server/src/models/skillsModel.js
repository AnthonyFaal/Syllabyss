const pool = require('../config/db');

const addSkill = async ({ user_id, skill_name, skill_type, proficiency }) => {
  const res = await pool.query(
    `INSERT INTO user_skills (user_id, skill_name, skill_type, proficiency)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user_id, skill_name, skill_type, proficiency]
  );
  return res.rows[0];
};

module.exports = { addSkill };
