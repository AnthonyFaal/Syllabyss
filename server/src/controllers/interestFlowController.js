const {
  createInterestFlow,
  getInterestFlowsByUserId,
  updateInterestFlow,
} = require('../models/interactionsModel');

// Basic validation helper
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
    const interestFlowId = await createInterestFlow(data);
    res.status(201).json({ message: 'Interest flow created', interestFlowId });
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

module.exports = {
  createInterestFlowHandler,
  getInterestFlowsByUserIdHandler,
  updateInterestFlowHandler,
};
