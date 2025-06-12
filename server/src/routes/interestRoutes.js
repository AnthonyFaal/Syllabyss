const express = require('express');
const router = express.Router();

const {
  createInterestFlowHandler,
  getInterestFlowsByUserIdHandler,
  updateInterestFlowHandler,
  getAllInterestFlowsHandler, 
  deleteInterestFlowHandler, // import the new handler
} = require('../controllers/interestFlowController');

router.post('/', createInterestFlowHandler);
router.get('/user/:userId', getInterestFlowsByUserIdHandler);
router.put('/:interestFlowId', updateInterestFlowHandler);
router.delete('/:interestFlowId', deleteInterestFlowHandler);
// New route to get all interest flows
router.get('/', getAllInterestFlowsHandler);

module.exports = router;
