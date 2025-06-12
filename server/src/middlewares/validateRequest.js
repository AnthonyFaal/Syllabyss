const { validateEntity } = require('../utils/index');

function validateRequest(entityType, action = 'create') {
  return (req, res, next) => {
    try {
      validateEntity(req.body, entityType, action);
      next();
    } catch (err) {
      next(err); // Let centralized error handler catch this
    }
  };
}

module.exports = validateRequest;
