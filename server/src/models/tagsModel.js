const pool = require('../db');

const addCourseTag = async ({ course_id, tag_type, tag_value }) => {
  const res = await pool.query(
    `INSERT INTO course_tags (course_id, tag_type, tag_value)
     VALUES ($1, $2, $3) RETURNING *`,
    [course_id, tag_type, tag_value]
  );
  return res.rows[0];
};

module.exports = { addCourseTag };
