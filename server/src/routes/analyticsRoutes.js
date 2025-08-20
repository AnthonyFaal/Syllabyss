const express = require('express');
const router = express.Router();
const UserAnalyticsController = require('../controllers/analyticsController');

/**
 * @route   POST /api/analytics
 * @desc    Create a new analytics record
 * @access  Public or Protected (update based on your auth setup)
 */
router.post('/', (req, res) => UserAnalyticsController.create(req, res));

/**
 * @route   GET /api/analytics
 * @desc    Get all analytics records (supports query filters)
 * @access  Public or Protected
 */
router.get('/', (req, res) => UserAnalyticsController.getAll(req, res));

/**
 * @route   GET /api/analytics/:id
 * @desc    Get an analytics record by ID
 * @access  Public or Protected
 */
router.get('/:id', (req, res) => UserAnalyticsController.getById(req, res));

/**
 * @route   GET /api/analytics/user/:user_id
 * @desc    Get analytics records for a specific user
 * @access  Public or Protected
 */
router.get('/user/:user_id', (req, res) => UserAnalyticsController.getByUser(req, res));

/**
 * @route   PUT /api/analytics/:id
 * @desc    Update an analytics record by ID
 * @access  Public or Protected
 */
router.put('/:id', (req, res) => UserAnalyticsController.update(req, res));

/**
 * @route   DELETE /api/analytics/:id
 * @desc    Delete an analytics record by ID
 * @access  Public or Protected
 */
router.delete('/:id', (req, res) => UserAnalyticsController.delete(req, res));

module.exports = router;
