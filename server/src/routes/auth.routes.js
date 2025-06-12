const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
  updatePasswordController,
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
const multer = require('multer');
const authenticate = require('../middlewares/authenticate');

const storage = multer.memoryStorage();
const upload = multer({ storage })

router.post('/auth/register', validateRegister, register);
router.post('/auth/login', validateLogin, login);
router.put('/auth/update-password', validatePasswordUpdate, updatePasswordController);
router.get('/auth/verify/:token', verifyEmail);
router.get('/users', getUsers);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/users/:userId', getUser);
router.put('/users/:userId/profile-image', upload.single('image'), updateProfileImageController);
router.put('/users/:userId/bio', updateBioController);

module.exports = router;
