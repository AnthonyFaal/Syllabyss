const { addSkill } = require('../models/skillsModel');
const pool = require('../config/db');

// Helper function to validate a single skill
const validateSkill = (skill) => {
  const { skill_name, skill_type, proficiency } = skill;
  return skill_name && skill_name.trim() &&
         skill_type && skill_type.trim() &&
         proficiency && proficiency.trim();
};

// Create one or multiple skills
const createSkill = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    let skills = req.body.skills || [req.body]; // Support both single and multiple inputs

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ message: "At least one skill is required." });
    }

    const invalidSkill = skills.find(skill => !validateSkill(skill));
    if (invalidSkill) {
      return res.status(400).json({ message: "All fields (skill_name, skill_type, proficiency) are required for each skill." });
    }

    const addedSkills = [];
    for (const skill of skills) {
      const newSkill = await addSkill({
        user_id,
        skill_name: skill.skill_name.trim(),
        skill_type: skill.skill_type.trim(),
        proficiency: skill.proficiency.trim()
      });
      addedSkills.push(newSkill);
    }

    res.status(201).json({ message: "Skill(s) added successfully.", skills: addedSkills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all skills for the authenticated user
const getUserSkills = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const result = await pool.query(
      'SELECT * FROM user_skills WHERE user_id = $1',
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a skill by ID
const updateSkill = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { id } = req.params;
    const { skill_name, skill_type, proficiency } = req.body;

    if (!validateSkill({ skill_name, skill_type, proficiency })) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const result = await pool.query(
      `UPDATE user_skills
       SET skill_name = $1,
           skill_type = $2,
           proficiency = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [skill_name.trim(), skill_type.trim(), proficiency.trim(), id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Skill not found or unauthorized." });
    }

    res.json({ message: "Skill updated successfully.", skill: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a skill by ID
const deleteSkill = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM user_skills WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Skill not found or unauthorized." });
    }

    res.json({ message: "Skill deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createSkill,
  getUserSkills,
  updateSkill,
  deleteSkill
};
