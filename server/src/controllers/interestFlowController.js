const {BaseRepository} = require('../utils/index');
const interestFlowRepo = new BaseRepository('user_interest_flows', 'interest_flow_id');
const userSkillsRepo = new BaseRepository('user_skills', 'skill_id');
const RecommendationController = require('./recommendationController');

// Validation helper remains the same
function validateInterestFlowData(data) {
  const { userId, selectedField, selectedExperience, selectedSpecialization, selectedSkills } = data;
  const experiences = ['beginner', 'intermediate', 'advanced', 'expert'];
 
  if (!userId || typeof userId !== 'string') return 'Invalid or missing userId';
  if (!selectedField || typeof selectedField !== 'string') return 'Invalid or missing selectedField';
  if (!selectedExperience || !experiences.includes(selectedExperience.toLowerCase()))
    return 'Invalid or missing selectedExperience';
  if (!selectedSpecialization || typeof selectedSpecialization !== 'string')
    return 'Invalid or missing selectedSpecialization';
  if (!selectedSkills || typeof selectedSkills !== 'object' || Array.isArray(selectedSkills))
    return 'Invalid or missing selectedSkills';

  return null;
}

async function createInterestFlowHandler(req, res) {
  const data = req.body;
  console.log('Incoming request data:', JSON.stringify(data, null, 2));

  const error = validateInterestFlowData(data);
  if (error) {
    console.log('Validation error:', error);
    return res.status(400).json({ error });
  }

  try {
    // Check if user already has an interest flow
    const existingFlows = await interestFlowRepo.getAll({ user_id: data.userId });
    if (existingFlows.length > 0) {
      console.log(`User ${data.userId} already has ${existingFlows.length} interest flows`);
      return res.status(400).json({
        error: 'User already has an interest flow. Please update instead.',
      });
    }

    // Create interest flow
    const interestFlow = await interestFlowRepo.create({
      user_id: data.userId,
      selected_field: data.selectedField,
      selected_experience: data.selectedExperience.toLowerCase(),
      selected_specialization: data.selectedSpecialization
    });
    console.log('Created interest flow:', interestFlow);

    // Create user skills
    const skillsPromises = Object.entries(data.selectedSkills).map(([skillGroup, skill]) =>
      userSkillsRepo.create({
        interest_flow_id: interestFlow.interest_flow_id,
        skill_group: skillGroup,
        skill: skill
      })
    );
    await Promise.all(skillsPromises);
    console.log('Skills created:', Object.keys(data.selectedSkills).length);

    // 🔹 Instead of building prompt + course manually, call RecommendationController
    const mockReq = { body: { user_id: data.userId } };
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(response) {
        this.response = response;
        return this;
      },
    };

    await RecommendationController.createInterestRecommendation(mockReq, mockRes);
    
    const responseData = {
      message: 'Interest flow created and recommendation generated',
      interestFlowId: interestFlow.interest_flow_id,
      recommendation: mockRes.response?.recommendation || null,
    };

    return res.status(201).json(responseData);
  } catch (err) {
    console.error('Error in createInterestFlowHandler:', err);
    return res.status(500).json({ 
      error: 'Failed to create interest flow',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}


async function getInterestFlowsByUserIdHandler(req, res) {
  try {
    const userId = req.user?.id; // fix destructuring issue
    if (!userId) return res.status(400).json({ error: 'Missing userId param' });
   
    // Get interest flows
    const interestFlows = await interestFlowRepo.getAll({ user_id: userId });
    if (interestFlows.length === 0) return res.json([]);

    // Get related skills
    const interestFlowIds = interestFlows.map(flow => flow.interest_flow_id);
    const skills = await userSkillsRepo.getWhereIn('interest_flow_id', interestFlowIds);

    // Map skills to flows
    const skillsMap = {};
    skills.forEach(skill => {
      if (!skillsMap[skill.interest_flow_id]) skillsMap[skill.interest_flow_id] = {};
      skillsMap[skill.interest_flow_id][skill.skill_group] = skill.skill;
    });

    const result = interestFlows.map(flow => ({
      ...flow,
      selectedSkills: skillsMap[flow.interest_flow_id] || {}
    }));

    res.json(result);

  } catch (err) {
    console.error("Error in getInterestFlowsByUserIdHandler:", err); // print in logs
    res.status(500).json({
      error: 'Failed to fetch interest flows',
      details: err.message, // send error message
      stack: err.stack // optional, useful for debugging
    });
  }
}


async function getInterestFlows(req, res) {
  try {
    // Get interest flows
    const interestFlows = await interestFlowRepo.getAll();
    if (interestFlows.length === 0) return res.json([]);

    // Get related skills
    const interestFlowIds = interestFlows.map(flow => flow.interest_flow_id);
    const skills = await userSkillsRepo.getWhereIn('interest_flow_id', interestFlowIds);

    // Map skills to flows
    const skillsMap = {};
    skills.forEach(skill => {
      if (!skillsMap[skill.interest_flow_id]) skillsMap[skill.interest_flow_id] = {};
      skillsMap[skill.interest_flow_id][skill.skill_group] = skill.skill;
    });

    const result = interestFlows.map(flow => ({
      ...flow,
      selectedSkills: skillsMap[flow.interest_flow_id] || {}
    }));

    res.json(result);

  } catch (err) {
    console.error("Error in getInterestFlowsByUserIdHandler:", err); // print in logs
    res.status(500).json({
      error: 'Failed to fetch interest flows',
      details: err.message, // send error message
      stack: err.stack // optional, useful for debugging
    });
  }
}

async function getAllInterestFlowsHandler(req, res) {
  try {
    // Get all interest flows with a count of users per field
    const query = `
      SELECT 
        selected_field,
        COUNT(DISTINCT user_id) as user_count
      FROM user_interest_flows
      GROUP BY selected_field
      ORDER BY user_count DESC;
    `;

    const result = await interestFlowRepo.rawQuery(query);
    
    res.json(result);
  } catch (err) {
    console.error('Error in getAllInterestFlowsHandler:', err);
    res.status(500).json({ 
      error: 'Failed to fetch interest flows statistics',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}



async function updateInterestFlowHandler(req, res) {
  const { interestFlowId } = req.params;
  const data = req.body;

  if (!interestFlowId) return res.status(400).json({ error: 'Missing interestFlowId param' });
  const error = validateInterestFlowData(data);
  if (error) return res.status(400).json({ error });

  try {
    // Update interest flow
    await interestFlowRepo.update(interestFlowId, {
      selected_field: data.selectedField,
      selected_experience: data.selectedExperience.toLowerCase(),
      selected_specialization: data.selectedSpecialization
    });

    // Replace skills
    await userSkillsRepo.deleteWhere('interest_flow_id', [interestFlowId]);

    const skillsPromises = Object.entries(data.selectedSkills).map(([skillGroup, skill]) =>
      userSkillsRepo.create({
        interest_flow_id: interestFlowId,
        skill_group: skillGroup,
        skill: skill
      })
    );
    await Promise.all(skillsPromises);

    res.json({ message: 'Interest flow updated' });
  } catch (err) {
    console.error("Error in updateInterestFlowHandler:", err);
    res.status(500).json({ error: 'Failed to update interest flow' });
  }
}


async function deleteInterestFlowHandler(req, res) {
  const { interestFlowId } = req.params;
  if (!interestFlowId) return res.status(400).json({ error: 'Missing interestFlowId param' });

  try {
    await userSkillsRepo.deleteWhere('interest_flow_id', [interestFlowId]);
    await interestFlowRepo.delete(interestFlowId);
    res.json({ message: 'Interest flow deleted' });
  } catch (err) {
    console.error("Error in deleteInterestFlowHandler:", err);
    res.status(500).json({ error: 'Failed to delete interest flow' });
  }
}


module.exports = {
  createInterestFlowHandler,
  getInterestFlowsByUserIdHandler,
  updateInterestFlowHandler,
  getAllInterestFlowsHandler,
  deleteInterestFlowHandler,
  getInterestFlows
};

