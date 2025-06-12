const pool = require('../config/db'); // your pg pool instance

async function createInterestFlow(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { userId, selectedField, selectedExperience, selectedSpecialization, selectedSkills } = data;

    // Insert main interest flow
    const interestFlowInsert = `
      INSERT INTO user_interest_flows (user_id, selected_field, selected_experience, selected_specialization)
      VALUES ($1, $2, $3, $4)
      RETURNING interest_flow_id
    `;
    const res = await client.query(interestFlowInsert, [userId, selectedField, selectedExperience.toLowerCase(), selectedSpecialization]);
    const interestFlowId = res.rows[0].interest_flow_id;

    // Insert skills
    const skillsInsert = `
      INSERT INTO user_skills (interest_flow_id, skill_group, skill)
      VALUES ($1, $2, $3)
    `;
    for (const [skillGroup, skill] of Object.entries(selectedSkills)) {
      await client.query(skillsInsert, [interestFlowId, skillGroup, skill]);
    }

    await client.query('COMMIT');
    return interestFlowId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getInterestFlowsByUserId(userId) {
  const interestFlowQuery = `
    SELECT *
    FROM user_interest_flows
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const skillsQuery = `
    SELECT skill_id, interest_flow_id, skill_group, skill
    FROM user_skills
    WHERE interest_flow_id = ANY($1::int[])
  `;

  const interestFlowsRes = await pool.query(interestFlowQuery, [userId]);
  const interestFlows = interestFlowsRes.rows;

  if (interestFlows.length === 0) return [];

  const interestFlowIds = interestFlows.map((flow) => flow.interest_flow_id);
  const skillsRes = await pool.query(skillsQuery, [interestFlowIds]);
  const skills = skillsRes.rows;

  // Map skills to their interest_flow_id
  const skillsMap = {};
  skills.forEach(({ interest_flow_id, skill_group, skill }) => {
    if (!skillsMap[interest_flow_id]) skillsMap[interest_flow_id] = {};
    skillsMap[interest_flow_id][skill_group] = skill;
  });

  // Combine interest flows with skills
  return interestFlows.map((flow) => ({
    ...flow,
    selectedSkills: skillsMap[flow.interest_flow_id] || {},
  }));
}

async function updateInterestFlow(interestFlowId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { selectedField, selectedExperience, selectedSpecialization, selectedSkills } = data;

    const updateFlowQuery = `
      UPDATE user_interest_flows
      SET selected_field = $1,
          selected_experience = $2,
          selected_specialization = $3
      WHERE interest_flow_id = $4
    `;
    await client.query(updateFlowQuery, [selectedField, selectedExperience.toLowerCase(), selectedSpecialization, interestFlowId]);

    // Delete old skills for this interestFlowId
    await client.query(`DELETE FROM user_skills WHERE interest_flow_id = $1`, [interestFlowId]);

    // Insert new skills
    const insertSkillQuery = `
      INSERT INTO user_skills (interest_flow_id, skill_group, skill)
      VALUES ($1, $2, $3)
    `;
    for (const [skillGroup, skill] of Object.entries(selectedSkills)) {
      await client.query(insertSkillQuery, [interestFlowId, skillGroup, skill]);
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getAllInterestFlows() {
  // Query all interest flows ordered by creation date
  const interestFlowQuery = `
    SELECT *
    FROM user_interest_flows
    ORDER BY created_at DESC
  `;

  // Query skills for all interest flows found
  const skillsQuery = `
    SELECT skill_id, interest_flow_id, skill_group, skill
    FROM user_skills
    WHERE interest_flow_id = ANY($1::int[])
  `;

  // Fetch all interest flows
  const interestFlowsRes = await pool.query(interestFlowQuery);
  const interestFlows = interestFlowsRes.rows;

  if (interestFlows.length === 0) return [];

  // Extract all interest_flow_ids
  const interestFlowIds = interestFlows.map((flow) => flow.interest_flow_id);

  // Fetch skills related to all interest flows
  const skillsRes = await pool.query(skillsQuery, [interestFlowIds]);
  const skills = skillsRes.rows;

  // Map skills to interest_flow_id grouped by skill_group
  const skillsMap = {};
  skills.forEach(({ interest_flow_id, skill_group, skill }) => {
    if (!skillsMap[interest_flow_id]) skillsMap[interest_flow_id] = {};
    skillsMap[interest_flow_id][skill_group] = skill;
  });

  // Combine interest flows with their skills
  return interestFlows.map((flow) => ({
    ...flow,
    selectedSkills: skillsMap[flow.interest_flow_id] || {},
  }));
}

async function deleteInterestFlow(interestFlowId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete skills associated with the interest flow
    await client.query(`DELETE FROM user_skills WHERE interest_flow_id = $1`, [interestFlowId]);

    // Delete the interest flow itself
    await client.query(`DELETE FROM user_interest_flows WHERE interest_flow_id = $1`, [interestFlowId]);

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createInterestFlow,
  getInterestFlowsByUserId,
  updateInterestFlow,
  getAllInterestFlows,  
  deleteInterestFlow,
};

