const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  register,
  login,
  verifyEmail,
  updatePasswordController,
  forgotPasswordController,
  getUsers,
  updateProfileImageController,
  getUser,
  updateBioController
} = require('../controllers/authController');

const {
  validateRegister,
  validateLogin,
  validatePasswordUpdate
} = require('../middlewares/validate');

const authenticate = require('../middlewares/authenticate');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public routes
router.post('/auth/register', validateRegister, register);
router.post('/auth/login', validateLogin, login);
router.get('/auth/verify/:token', verifyEmail);

// ✅ Forgot password route (uses email)
router.put('/auth/forgot-password', forgotPasswordController);

// ✅ Update password route (requires userId, ideally authenticated)
// Protected routes
router.use(authenticate);

router.put('/auth/update-password', validatePasswordUpdate, updatePasswordController);

router.get('/users', getUsers);
router.get('/users/:userId', getUser);
router.put('/users/:userId/profile-image', upload.single('image'), updateProfileImageController);
router.put('/users/:userId/bio', updateBioController);

// Example route to send the logged-in user's role
router.get('/me', (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role
  });
});

module.exports = router;
