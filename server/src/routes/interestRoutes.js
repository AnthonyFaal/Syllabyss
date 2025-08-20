const express = require('express');
const router = express.Router();

const {
  createInterestFlowHandler,
  getInterestFlowsByUserIdHandler,
  updateInterestFlowHandler,
  getAllInterestFlowsHandler, 
  deleteInterestFlowHandler, 
  getInterestFlows// import the new handler
} = require('../controllers/interestFlowController');

router.post('/', createInterestFlowHandler);
router.get('/user', getInterestFlowsByUserIdHandler);
router.put('/:interestFlowId', updateInterestFlowHandler);
router.delete('/:interestFlowId', deleteInterestFlowHandler);
// New route to get all interest flows
router.get('/', getAllInterestFlowsHandler);
router.get('/all', getInterestFlows);
module.exports = router;
