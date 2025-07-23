const express = require('express');
const router = express.Router();
const DialogflowController = require('../controllers/dialogflowController');

const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

router.post('/ask', DialogflowController.askBot);

module.exports = router;
