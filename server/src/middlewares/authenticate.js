const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check for user_id (matches your token) instead of userId
    if (!decoded.user_id) {
      return res.status(401).json({ error: 'Malformed token - missing user ID' });
    }
    // Attach user info using the correct field name
    req.user = { 
      id: decoded.user_id,
      role: decoded.role // Optional: include other claims you need
    };
    
    next();
  } catch (err) {
   
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authenticate;