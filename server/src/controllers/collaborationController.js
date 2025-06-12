const {BaseRepository, validateEntity } = require('../utils/index');

const collaborationRepo = new BaseRepository('collaborations');
const memberRepo = new BaseRepository('collaboration_members');

const createCollaboration = async (req, res) => {
  try {
    await validateEntity('collaboration.create', req.body);
    const newCollab = await collaborationRepo.create(req.body);
    res.status(201).json(newCollab);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    await validateEntity('collaborationMember.create', req.body);
    const newMember = await memberRepo.create(req.body);
    res.status(201).json(newMember);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCollaborationMembers = async (req, res) => {
  try {
    const { collaboration_id } = req.params;
    const members = await memberRepo.getAll({ collaboration_id });
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCollaborations = async (req, res) => {
  try {
    const { course_id } = req.query;
    const collaborations = await collaborationRepo.getAll({ course_id });
    res.status(200).json(collaborations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createCollaboration,
  addMember,
  getCollaborationMembers,
  getCollaborations
};

// routes/collaborationRoutes.js
const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');

router.post('/collaborations', collaborationController.createCollaboration);
router.post('/collaborations/members', collaborationController.addMember);
router.get('/collaborations/:collaboration_id/members', collaborationController.getCollaborationMembers);
router.get('/collaborations', collaborationController.getCollaborations);

module.exports = router;
