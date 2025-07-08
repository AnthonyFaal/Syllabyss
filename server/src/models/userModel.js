const pool = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async ({ email, password, name, role, verificationToken, tokenExpiresAt }) => {
  // Check for existing email
  const emailExists = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  if (emailExists.rows.length > 0) {
    throw new Error('This email is already registered. Try logging in or use a different email.');
  }

  // Check for existing name (optional — if names must be unique)
  const nameExists = await pool.query(`SELECT * FROM users WHERE name = $1`, [name]);
  if (nameExists.rows.length > 0) {
    throw new Error('This name is already taken. Please choose a different name.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const res = await pool.query(`
    INSERT INTO users (email, password, name, role, verification_token, token_expires_at)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email, hashedPassword, name, role, verificationToken, tokenExpiresAt]
  );
  return res.rows[0];
};


const getUserByEmail = async (email) => {
  const res = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return res.rows[0];
};

const verifyUser = async (token) => {
  const now = new Date();
  const res = await pool.query(`
    UPDATE users
    SET is_verified = TRUE, verification_token = NULL, token_expires_at = NULL
    WHERE verification_token = $1 AND token_expires_at > $2 RETURNING *`,
    [token, now]
  );
  return res.rows[0];
};

const getAllUsers = async () => {
  const res = await pool.query(`
    SELECT 
      u.user_id, u.email, u.name, u.role, u.bio, u.profile_image, u.created_at, u.last_login,
      i.selected_field, i.selected_specialization, i.selected_experience
    FROM users u
    LEFT JOIN user_interest_flows i ON u.user_id = i.user_id
  `);
  return res.rows;
};


const getUserById = async (userId) => {
  const userRes = await pool.query(`
    SELECT 
      u.user_id, u.email, u.name, u.role, u.bio, u.profile_image, u.created_at, u.updated_at,
      i.interest_flow_id, i.selected_field, i.selected_specialization, i.selected_experience, i.created_at AS interest_created_at
    FROM users u
    LEFT JOIN user_interest_flows i ON u.user_id = i.user_id
    WHERE u.user_id = $1
  `, [userId]);

  if (userRes.rows.length === 0) return null;

  const user = {
    user_id: userRes.rows[0].user_id,
    email: userRes.rows[0].email,
    name: userRes.rows[0].name,
    role: userRes.rows[0].role,
    bio: userRes.rows[0].bio,
    profile_image: userRes.rows[0].profile_image,
    created_at: userRes.rows[0].created_at,
    updated_at: userRes.rows[0].updated_at,
    interests: []
  };

  const interestMap = new Map();

  for (const row of userRes.rows) {
    if (row.interest_flow_id) {
      if (!interestMap.has(row.interest_flow_id)) {
        interestMap.set(row.interest_flow_id, {
          interest_flow_id: row.interest_flow_id,
          selected_field: row.selected_field,
          selected_specialization: row.selected_specialization,
          selected_experience: row.selected_experience,
          created_at: row.interest_created_at,
          skills: []
        });
      }
    }
  }

  // Now fetch skills for each interest flow
  for (const [flowId, interest] of interestMap.entries()) {
    const skillsRes = await pool.query(`
      SELECT skill_group, skill, created_at
      FROM user_skills
      WHERE interest_flow_id = $1
    `, [flowId]);

    interest.skills = skillsRes.rows;
    user.interests.push(interest);
  }

  return user;
};

const updatePassword = async (identifier, newPassword) => {
  const hashed = await bcrypt.hash(newPassword, 10);

  const res = await pool.query(
    `
    UPDATE users
    SET password = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id::text = $2 OR email = $2
    RETURNING user_id, email, name;
    `,
    [hashed, identifier]
  );

  return res.rows[0] || null;
};


const updateProfileImage = async (userId, imageUrl) => {
  const res = await pool.query(
    `UPDATE users SET profile_image = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id, email, name, role, profile_image, created_at`,
    [imageUrl, userId]
  );
  return res.rows[0]; // returns updated user
};

const updateBio = async (userId, bio) => {
  const res = await pool.query(
    `UPDATE users SET bio = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id, email, name, role, profile_image, bio, created_at`,
    [bio, userId]
  );
  return res.rows[0];
};

const loginUser = async (email) => {
  const res = await pool.query(`
    UPDATE users 
    SET last_login = NOW(), updated_at = NOW() 
    WHERE email = $1 
    RETURNING *`, 
    [email]
  );
  return res.rows[0];
};


module.exports = {
  loginUser,
  createUser,
  getUserByEmail,
  verifyUser,
  getAllUsers,
  updatePassword, 
  getUserById,
  updateProfileImage,
  updateBio
};
