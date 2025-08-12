const express = require('express');
const router = express.Router();
const tutor = require("../controllers/tutorController")
const authenticate = require('../middlewares/authenticate');

// Protected routes (require authentication)
router.use(authenticate);

router.post('/ask', tutor.askBot); 

module.exports = router;
