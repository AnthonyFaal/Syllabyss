const { randomBytes } = require('crypto');

const generateToken = () => {
  return randomBytes(32).toString('hex');
};

module.exports = { generateToken };
