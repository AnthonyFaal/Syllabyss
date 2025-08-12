const { BaseRepository } = require('../utils/index');
const interestFlowRepo = new BaseRepository('user_interest_flows', 'interest_flow_id');
const userSkillsRepo = new BaseRepository('user_skills', 'skill_id');
const CourseController = require('./courseController');

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
  
  // Print the incoming request data
  console.log('Incoming request data:', JSON.stringify(data, null, 2));
  
  const error = validateInterestFlowData(data);
  if (error) {
    console.log('Validation error:', error);
    return res.status(400).json({ error });
  }

  try {
    // Check for existing flows using repository
    const existingFlows = await interestFlowRepo.getAll({ user_id: data.userId });
    if (existingFlows.length > 0) {
      console.log(`User ${data.userId} already has ${existingFlows.length} interest flows`);
      return res.status(400).json({
        error: 'User already has an interest flow. Please update instead.',
      });
    }

    // Print before creating interest flow
    console.log('Creating new interest flow with data:', {
      user_id: data.userId,
      selected_field: data.selectedField,
      selected_experience: data.selectedExperience.toLowerCase(),
      selected_specialization: data.selectedSpecialization
    });

    // Create interest flow
    const interestFlow = await interestFlowRepo.create({
      user_id: data.userId,
      selected_field: data.selectedField,
      selected_experience: data.selectedExperience.toLowerCase(),
      selected_specialization: data.selectedSpecialization
    });

    console.log('Created interest flow:', interestFlow);

    // Print skills data
    console.log('Adding skills:', JSON.stringify(data.selectedSkills, null, 2));

    // Create skills
    const skillsPromises = Object.entries(data.selectedSkills).map(([skillGroup, skill]) => {
      const skillData = {
        interest_flow_id: interestFlow.interest_flow_id,
        skill_group: skillGroup,
        skill: skill
      };
      console.log('Adding skill:', skillData);
      return userSkillsRepo.create(skillData);
    });
    
    const skillsResults = await Promise.all(skillsPromises);
    console.log('Skills created:', skillsResults.length);

    // Generate course (same as before)
    const skillsList = Object.entries(data.selectedSkills)
      .map(([category, skill]) => `${category}: ${skill}`)
      .join(', ');

    const prompt = `Create a ${data.selectedField} course about ${data.selectedSpecialization} for ${data.selectedExperience} level learners. Focus on these skills: ${skillsList}.`;

    console.log('Generated course prompt:', prompt);

    const mockReq = {
      body: {
        prompt,
        user_id: data.userId,
        content_type: 'video',
        difficulty_level: data.selectedExperience,
      },
    };

    console.log('Mock request to CourseController:', mockReq);

    const mockRes = {
      status(code) {
        this.statusCode = code;
        console.log('Mock response status:', code);
        return this;
      },
      json(response) {
        this.response = response;
        console.log('Mock response data:', response);
        return this;
      },
    };

    await CourseController.createCourse(mockReq, mockRes, (err) => {
      if (err) {
        console.error('Error creating course:', err);
      } else {
        console.log('Course creation successful');
      }
    });

    const responseData = {
      message: 'Interest flow created and course generation initiated',
      interestFlowId: interestFlow.interest_flow_id,
      course: mockRes.response?.data || null,
    };

    console.log('Returning response:', responseData);
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
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId param' });

  try {
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
    res.status(500).json({ error: 'Failed to fetch interest flows' });
  }
}

async function getAllInterestFlowsHandler(req, res) {
  try {
    // Get all interest flows
    const interestFlows = await interestFlowRepo.getAll();
    
    if (interestFlows.length === 0) return res.json([]);

    // Get all related skills
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
    res.status(500).json({ error: 'Failed to fetch interest flows' });
  }
}

async function updateInterestFlowHandler(req, res) {
  const { interestFlowId } = req.params;
  const data = req.body;

  if (!interestFlowId) return res.status(400).json({ error: 'Missing interestFlowId param' });
  const error = validateInterestFlowData(data);
  if (error) return res.status(400).json({ error });

  try {
    // Start transaction
    await pool.query('BEGIN');

    // Update interest flow
    await interestFlowRepo.update(interestFlowId, {
      selected_field: data.selectedField,
      selected_experience: data.selectedExperience.toLowerCase(),
      selected_specialization: data.selectedSpecialization
    });

    // Delete existing skills
    await userSkillsRepo.deleteWhere('interest_flow_id', [interestFlowId]);

    // Add new skills
    const skillsPromises = Object.entries(data.selectedSkills).map(([skillGroup, skill]) => {
      return userSkillsRepo.create({
        interest_flow_id: interestFlowId,
        skill_group: skillGroup,
        skill: skill
      });
    });
    await Promise.all(skillsPromises);

    await pool.query('COMMIT');
    res.json({ message: 'Interest flow updated' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update interest flow' });
  }
}

async function deleteInterestFlowHandler(req, res) {
  const { interestFlowId } = req.params;
  if (!interestFlowId) return res.status(400).json({ error: 'Missing interestFlowId param' });

  try {
    // Start transaction
    await pool.query('BEGIN');

    // Delete skills first
    await userSkillsRepo.deleteWhere('interest_flow_id', [interestFlowId]);

    // Then delete the flow
    await interestFlowRepo.delete(interestFlowId);

    await pool.query('COMMIT');
    res.json({ message: 'Interest flow deleted' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to delete interest flow' });
  }
}

module.exports = {
  createInterestFlowHandler,
  getInterestFlowsByUserIdHandler,
  updateInterestFlowHandler,
  getAllInterestFlowsHandler,
  deleteInterestFlowHandler,
};

/*const {
  createInterestFlow,
  getInterestFlowsByUserId,
  updateInterestFlow,
  getAllInterestFlows,
  deleteInterestFlow,
} = require('../models/interactionsModel');
const CourseController = require('./courseController');

// Updated validation helper
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

  const error = validateInterestFlowData(data);
  if (error) return res.status(400).json({ error });

  try {
    // Check if user already has an interest flow
    const existingFlows = await getInterestFlowsByUserId(data.userId);
    if (existingFlows.length > 0) {
      // Do not proceed with course creation
      return res.status(400).json({
        error: 'User already has an interest flow. Please update instead.',
      });
    }

    // Create the interest flow
    const interestFlowId = await createInterestFlow(data);

    // Format selected skills
    const skillsList = Object.entries(data.selectedSkills)
      .map(([category, skill]) => `${category}: ${skill}`)
      .join(', ');

    // Compose prompt for course generation
    const prompt = `Create a ${data.selectedField} course about ${data.selectedSpecialization} for ${data.selectedExperience} level learners. Focus on these skills: ${skillsList}.`;

    // Simulate request/response for course controller
    const mockReq = {
      body: {
        prompt,
        user_id: data.userId,
        content_type: 'video',
        difficulty_level: data.selectedExperience,
      },
    };

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

    // Call course creation logic
    await CourseController.createCourse(mockReq, mockRes, (err) => {
      if (err) {
        console.error('Error creating course from interest flow:', err);
      }
    });

    return res.status(201).json({
      message: 'Interest flow created and course generation initiated',
      interestFlowId,
      course: mockRes.response?.data || null,
    });
  } catch (err) {
    console.error('Error in createInterestFlowHandler:', err);
    return res.status(500).json({ error: 'Failed to create interest flow' });
  }
}

async function getInterestFlowsByUserIdHandler(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId param' });

  try {
    const data = await getInterestFlowsByUserId(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interest flows' });
  }
}
 
async function getAllInterestFlowsHandler(req, res) {
  try {
    const flows = await getAllInterestFlows();
    res.json(flows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interest flows' });
  }
}

async function updateInterestFlowHandler(req, res) {
  const { interestFlowId } = req.params;
  const data = req.body;

  if (!interestFlowId) return res.status(400).json({ error: 'Missing interestFlowId param' });

  const error = validateInterestFlowData(data);
  if (error) return res.status(400).json({ error });

  try {
    await updateInterestFlow(parseInt(interestFlowId, 10), data);
    res.json({ message: 'Interest flow updated' });
  } catch (err) { 
    res.status(500).json({ error: 'Failed to update interest flow' });
  }
}

async function deleteInterestFlowHandler(req, res) {
  const { interestFlowId } = req.params;
  if (!interestFlowId) return res.status(400).json({ error: 'Missing interestFlowId param' });

  try {
    await deleteInterestFlow(parseInt(interestFlowId, 10));
    res.json({ message: 'Interest flow deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete interest flow' });
  }
}

module.exports = {
  createInterestFlowHandler,
  getInterestFlowsByUserIdHandler,
  updateInterestFlowHandler,
  getAllInterestFlowsHandler,
  deleteInterestFlowHandler,
};
*/