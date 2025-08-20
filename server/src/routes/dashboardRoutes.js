const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

const dashboardController = new DashboardController();


router.get('/dashboard/:user_id/overview', async (req, res) => {
  try {
    const userId = req.params.user_id;
    const overview = await dashboardController.getOverview(userId);
    res.json(overview);
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

router.get('/dashboard/:user_id/timetable', async (req, res) => {
  try {
    const userId = req.params.user_id;
    const date = req.query.date || new Date().toISOString().split('T')[0]; // Optional date parameter
    const timetable = await dashboardController.getTimetable(userId, new Date(date));
    res.json(timetable);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ error: 'Failed to load timetable' });
  }
});


router.get('/admin/overview', async (req, res) => {
  try {
    const overview = await dashboardController.getAdminOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;