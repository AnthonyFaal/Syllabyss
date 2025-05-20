const express = require('express');
const router = express.Router();
const {
  createInterestFlowHandler,
  getInterestFlowsByUserIdHandler,
  updateInterestFlowHandler,
} = require('../controllers/interestFlowController');

router.post('/interest-flow', createInterestFlowHandler);
router.get('/interest-flow/user/:userId', getInterestFlowsByUserIdHandler);
router.put('/interest-flow/:interestFlowId', updateInterestFlowHandler);

module.exports = router;
