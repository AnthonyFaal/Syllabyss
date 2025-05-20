const pool = require('../db');

const createCourse = async ({ title, description, duration_hours, difficulty }) => {
  const res = await pool.query(
    `INSERT INTO courses (title, description, duration_hours, difficulty)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, description, duration_hours, difficulty]
  );
  return res.rows[0];
};

const getAllCourses = async () => {
  const res = await pool.query(`SELECT * FROM courses`);
  return res.rows;
};

module.exports = { createCourse, getAllCourses };
