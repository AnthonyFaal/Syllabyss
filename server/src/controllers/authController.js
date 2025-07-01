const {
  createUser,
  getUserByEmail,
  verifyUser,
  getAllUsers,
  updatePassword,
  getUserById,
  updateProfileImage,
  updateBio,
  loginUser
} = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sendVerificationEmail , sendPasswordUpdateEmail} = require('../utils/sendEmail');
const { generateToken } = require('../utils/generateToken');
const { uploadFileBuffer } = require('../utils/cloudinary');

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const token = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const user = await createUser({
      email,
      password,
      name,
      role: 'student', // Always set to 'student'
      verificationToken: token,
      tokenExpiresAt
    });
    await sendVerificationEmail(email, token);
    res.status(201).json({
      message: 'User registered successfully. A verification link has been sent to your email.',
      userId: user.user_id
    });
  } catch (err) {
    if (err.message.includes('already registered') || err.message.includes('already taken')) {
      return res.status(409).json({ error: err.message }); // Conflict
    }
    res.status(400).json({
      error: 'Registration failed. ' + err.message
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await verifyUser(token);

    if (!user) return res.status(400).send("Invalid or expired token");

    // Redirect to frontend with verification status, userId, and token
    return res.redirect(`https://final-year-frontend-orcin.vercel.app/user-interest?verified=true&userId=${user.user_id}&token=${token}`);
  } catch (err) {
    return res.redirect(`https://final-year-frontend-orcin.vercel.app/user-interest?verified=false&error=${encodeURIComponent(err.message)}`);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' }); // Unified error
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' }); // Unified error
    }

    // 3. Verify account status
    if (!user.is_verified) {
      const token = generateToken();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await pool.query(`
        UPDATE users
        SET verification_token = $1, token_expires_at = $2
        WHERE email = $3
      `, [token, tokenExpiresAt, email]);

      await sendVerificationEmail(email, token);

      return res.status(403).json({
        error: 'Email not verified. A new verification email has been sent.'
      });
    }

    // 4. Update last login
    await loginUser(email);

    // 5. Create JWT
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.user_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePasswordController = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const updatedUser = await updatePassword(userId, newPassword);

    await sendPasswordUpdateEmail(updatedUser.email); // notify user

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers(); // this should be a function that fetches all users from DB
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

const updateProfileImageController = async (req, res) => {
  try {
    const userId = req.params.userId;
    const file = req.file;
    const location = 'profile_images'; // default folder if not provided

    if (!file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    // Upload file buffer to Cloudinary in the specified folder
    const imageUrl = await uploadFileBuffer(file.buffer, location);

    // Update the user record with new profile image URL
    const updatedUser = await updateProfileImage(userId, imageUrl);

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      message: 'Profile image updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Optionally, remove sensitive info like password before sending
    delete user.password;

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

const updateBioController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio } = req.body;

    if (!bio) {
      return res.status(400).json({ message: 'Bio is required' });
    }

    const updatedUser = await updateBio(userId, bio);

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Bio updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, verifyEmail, updatePasswordController, getUsers,  updateProfileImageController, getUser, updateBioController };
