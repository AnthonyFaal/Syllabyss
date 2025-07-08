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
router.get('/users', getUsers);

// ✅ Forgot password route (uses email)
router.put('/auth/forgot-password', forgotPasswordController);

// ✅ Update password route (requires userId, ideally authenticated)
router.put('/auth/update-password', validatePasswordUpdate, updatePasswordController);

// Protected routes
router.use(authenticate);

router.get('/users/:userId', getUser);
router.put('/users/:userId/profile-image', upload.single('image'), updateProfileImageController);
router.put('/users/:userId/bio', updateBioController);

module.exports = router;
