// services/authService.js
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const sendEmail = require("../utils/emailSender");
const { generateToken, generateVerificationToken } = require("../utils/tokenGenerator");

exports.register = async (name, email, password, role = 'user') => {
  if (!name || !email || !password) {
    throw new Error('All fields are required');
  }
  
  const existingUser = await User.findByEmail(email);
  if (existingUser) throw new Error("User already exists");

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.createUser({ name, email, password: hashedPassword, role });

  // Send verification email
  const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email/${newUser.verification_token}`;
  await sendEmail({
    email: newUser.email,
    type: 'verification',
    context: {
      name: newUser.name,
      verificationUrl,
      expiresIn: '24 hours'
    }
  });

  return { 
    message: "User registered. Check email for verification.", 
    user: {
      id: newUser.user_id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.is_verified
    }
  };
};

exports.login = async (email, password) => {
  const user = await User.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  if (!user.is_verified) {
    // Optionally resend verification email here
    throw new Error("Email not verified. Please check your email for verification link.");
  }

  const token = generateToken(user);
  return { 
    token,
    user: {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified
    }
  };
};

exports.verifyEmail = async (token) => {
  const user = await User.verifyUserByToken(token);
  if (!user) throw new Error("Invalid or expired verification link");

  return { 
    message: "Email successfully verified.",
    user: {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified
    }
  };
};

exports.resendVerificationEmail = async (email) => {
  const user = await User.findByEmail(email);
  if (!user) throw new Error("User not found");
  if (user.is_verified) throw new Error("Email is already verified");

  const token = await User.updateVerificationToken(email);

  const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email/${token}`;
  await sendEmail({
    email: user.email,
    type: 'verificationEmail',
    context: {
      name: user.name,
      verificationUrl,
      expiresIn: '24 hours'
    }
  });

  return { message: "Verification email resent successfully" };
};

exports.updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new Error("Current password is incorrect");
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.updatePassword(user.user_id, hashed);

  return { message: "Password updated successfully" };
};

exports.forgotPassword = async (email) => {
  const user = await User.findByEmail(email);
  if (!user) throw new Error("User not found");

  const resetToken = require('crypto').randomBytes(32).toString('hex');
  const hashedToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await pool.query(
    `UPDATE users 
     SET password_reset_token = $1,
         password_reset_expires = $2
     WHERE email = $3`,
    [hashedToken, expiresAt, email]
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    email: user.email,
    type: 'passwordReset',
    context: {
      name: user.name,
      resetUrl,
      expiresIn: '10 minutes'
    }
  });

  return { message: "Password reset email sent" };
};

exports.resetPassword = async (token, newPassword) => {
  const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');
  
  const user = await pool.query(
    'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
    [hashedToken]
  );

  if (!user.rows[0]) throw new Error("Invalid or expired token");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users 
     SET password = $1,
         password_reset_token = NULL,
         password_reset_expires = NULL
     WHERE user_id = $2`,
    [hashedPassword, user.rows[0].user_id]
  );

  return { message: "Password reset successfully" };
};