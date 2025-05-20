const pool = require('../db');

const addRecommendation = async ({ user_id, course_id, match_score }) => {
  const res = await pool.query(
    `INSERT INTO recommendations (user_id, course_id, match_score)
     VALUES ($1, $2, $3) RETURNING *`,
    [user_id, course_id, match_score]
  );
  return res.rows[0];
};

const getRecommendationsForUser = async (user_id) => {
  const res = await pool.query(`SELECT * FROM recommendations WHERE user_id = $1`, [user_id]);
  return res.rows;
};

module.exports = { addRecommendation, getRecommendationsForUser };
