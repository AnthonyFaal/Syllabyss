const { BaseRepository} = require('../utils/index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sendVerificationEmail, sendPasswordResetEmail, sendPasswordUpdateEmail } = require('../utils/sendEmail');
const { generateToken } = require('../utils/generateToken');
const { uploadFileBuffer } = require('../utils/cloudinary');
const { HOST, PORT } = require('../../port');


const userRepo = new BaseRepository('users', 'user_id');

const canManageUser = (req, userId) => req.user.role === 'admin' || String(req.user.id) === String(userId);

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const token = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    // Check if email already exists
    const existingUser = await userRepo.getOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    // Check if name already exists
    const nameExists = await userRepo.getOne({ name });
    if (nameExists) {
      return res.status(409).json({ error: 'This name is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepo.create({
      email,
      password: hashedPassword,
      name,
      role: 'student',
      verification_token: token,
      token_expires_at: tokenExpiresAt,
      is_verified: false
    });

    await sendVerificationEmail(email, token);
    
    res.status(201).json({
      message: 'User registered successfully. A verification link has been sent to your email.',
      userId: user.user_id
    });
  } catch (err) {
    res.status(400).json({
      error: 'Registration failed. ' + err.message
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const now = new Date();

    // Find user with the verification token
    const user = await userRepo.getOne({ verification_token: token });
    
    if (!user) {
      console.log('No user found with this verification token');
      return res.status(400).send("Invalid verification link");
    }

    // Check if token is expired by comparing dates directly
    if (!user.token_expires_at || new Date(user.token_expires_at) < now) {
      console.log('Token expired - Expires at:', user.token_expires_at, 'Current time:', now);
      return res.status(400).send("Verification link has expired. Please request a new one.");
    }

    // Update user verification status
    await userRepo.update(user.user_id, {
      is_verified: true,
      verification_token: null,
      token_expires_at: null
    });

    return res.redirect(`${process.env.FRONTEND_URL || `http://${HOST}:5173`}/user-interest?verified=true&userId=${user.user_id}`);
  } catch (err) {
    console.error('Verification error:', err);
    return res.redirect(`${process.env.FRONTEND_URL || `http://${HOST}:5173`}/user-interest?verified=false&error=${encodeURIComponent('Verification failed. Please try again.')}`);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
   
    // 1. Check if user exists
    const user = await userRepo.getOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Verify account status
    if (!user.is_verified) {
      const token = generateToken();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
      
      // Update verification token
      await userRepo.update(user.user_id, {
        verification_token: token,
        token_expires_at: tokenExpiresAt
      });
      
      await sendVerificationEmail(email, token);

      return res.status(403).json({
        error: 'Email not verified. A new verification email has been sent.'
      });
    }

    // 4. Update last login
    await userRepo.update(user.user_id, {
      last_login: new Date()
    });

    // 5. Create JWT
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      userId: user.user_id, 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePasswordController = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword) {
      return res.status(400).json({ error: 'A new password is required.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await userRepo.update(userId, {
      password: hashedPassword
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await sendPasswordUpdateEmail(updatedUser.email);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const forgotPasswordController = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (email && !token && !newPassword) {
      const user = await userRepo.getOne({ email });
      if (user) {
        const resetToken = generateToken();
        await userRepo.update(user.user_id, {
          verification_token: resetToken,
          token_expires_at: new Date(Date.now() + 60 * 60 * 1000)
        });
        await sendPasswordResetEmail(email, resetToken);
      }
      return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    }

    if (!token || !newPassword) return res.status(400).json({ error: 'A valid reset token and new password are required.' });
    if (newPassword.length < 6 || !/\d/.test(newPassword)) {
      return res.status(422).json({ error: 'Password must be at least 6 characters and include a number.' });
    }

    const user = await userRepo.getOne({ verification_token: token });
    if (!user || !user.token_expires_at || new Date(user.token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await userRepo.update(user.user_id, { password: hashedPassword, verification_token: null, token_expires_at: null });

    if (!updatedUser) {
      return res.status(404).json({ error: 'No account found with the provided email address.' });
    }

    await sendPasswordUpdateEmail(updatedUser.email);

    res.json({ message: 'Your password has been reset successfully. Please check your email for confirmation.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await userRepo.getAll1(
      {},
      `CASE WHEN role = 'admin' THEN 0 ELSE 1 END, name ASC`
    );
    res.status(200).json(users.map(({ password, verification_token, token_expires_at, ...user }) => user));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};


const updateProfileImageController = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!canManageUser(req, userId)) return res.status(403).json({ message: 'You cannot update this profile.' });
    const file = req.file;
    const location = 'profile_images';

    if (!file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    const imageUrl = await uploadFileBuffer(file.buffer, location);
    const updatedUser = await userRepo.update(userId, {
      profile_image: imageUrl
    });

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
    const user = await userRepo.getById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const { password, verification_token, token_expires_at, ...safeUser } = user;
    
    res.status(200).json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

const updateBioController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio } = req.body;

    if (!canManageUser(req, userId)) return res.status(403).json({ message: 'You cannot update this profile.' });

    if (!bio) {
      return res.status(400).json({ message: 'Bio is required' });
    }

    const updatedUser = await userRepo.update(userId, { bio });

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

module.exports = { 
  register, 
  login, 
  verifyEmail, 
  updatePasswordController, 
  getUsers,  
  updateProfileImageController, 
  getUser, 
  updateBioController, 
  forgotPasswordController 
};
