const express = require('express');
const router = express.Router();
const userProgressController = require('../controllers/userProgressController');

// Create or update progress
router.post('/', userProgressController.createOrUpdateProgress);
router.get('/user/:user_id/material/:material_id', userProgressController.getProgressByMaterial);
router.get('/user/:user_id', userProgressController.getUserProgress);
router.patch('/user/:user_id/material/:material_id/status', userProgressController.updateStatus);
router.patch('/user/:user_id/material/:material_id/time', userProgressController.recordTime);
router.get('/user/:user_id/completed', userProgressController.getCompletedMaterials);
router.get('/user/:user_id/in-progress', userProgressController.getInProgressMaterials);

module.exports = router;