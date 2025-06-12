const {
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
    const existingFlows = await getInterestFlowsByUserId(data.userId);
    if (existingFlows.length > 0) {
      return res.status(400).json({ error: 'User already has an interest flow. Please update instead.' });
    }

    // First create the interest flow
    const interestFlowId = await createInterestFlow(data);

    // Format skills for the prompt
    const skillsList = Object.entries(data.selectedSkills)
      .map(([category, skill]) => `${category}: ${skill}`)
      .join(', ');

    const prompt = `Create a ${data.selectedField} course about ${data.selectedSpecialization} for ${data.selectedExperience} level learners. Focus on these skills: ${skillsList}.`;
    
    // Create a mock request object for the CourseController
    const mockReq = {
      body: {
        prompt: prompt,
        user_id: data.userId,
        content_type: "video",
        difficulty_level: data.selectedExperience
      }
    };

    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(response) {
        this.response = response;
        return this;
      }
    };

    await CourseController.createCourse(mockReq, mockRes, (err) => {
      if (err) {
        console.error('Error creating course from interest flow:', err);
      }
    });

    res.status(201).json({ 
      message: 'Interest flow created and course generation initiated', 
      interestFlowId,
      course: mockRes.response?.data || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create interest flow' });
  }
}

async function getInterestFlowsByUserIdHandler(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId param' });

  try {
    const data = await getInterestFlowsByUserId(userId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interest flows' });
  }
}
 
async function getAllInterestFlowsHandler(req, res) {
  try {
    const flows = await getAllInterestFlows();
    res.json(flows);
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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
