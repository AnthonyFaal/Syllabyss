const nodemailer = require('nodemailer');

const appName = process.env.APP_NAME || 'Syllabys';
const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM;
const apiBaseUrl = (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`)
  .replace(/\/$/, '');

const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      }
    : {
        service: 'gmail',
        auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASS },
      }
);

const sendVerificationEmail = async (to, token) => {
  const url = `${apiBaseUrl}/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: `"${appName}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Welcome to ${appName} - Verify Your Email`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden;">
          <div style="padding: 30px;">
            <h2 style="color: #333;">Hi there!</h2>
            <p style="font-size: 16px; color: #555;">
              Thank you for signing up on <strong>${appName}</strong>.
              Please verify your email to activate your account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                Verify Email
              </a>
            </div>
            <p style="font-size: 14px; color: #777;">
              This link will expire in 24 hours. If you didn't sign up for ${appName}, you can safely ignore this email.
            </p>
            <p style="font-size: 14px; color: #777; margin-top: 40px;">
              Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
          </div>
        </div>
      </div>
    `
  });
};

const sendPasswordUpdateEmail = async (to) => {
  await transporter.sendMail({
    from: `"${appName} Security" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Your ${appName} password has been updated`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden;">
          <div style="padding: 30px;">
            <h2 style="color: #333;">Password Updated Successfully</h2>
            <p style="font-size: 16px; color: #555;">
              Hello,<br><br>
              We wanted to let you know that your password was recently updated.
            </p>
            <p style="font-size: 14px; color: #777;">
              If you did not request this change, please contact us immediately at 
              <a href="mailto:${supportEmail}">${supportEmail}</a>.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

const sendPasswordResetEmail = async (to, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/forgot-password?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: `"${appName} Security" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Reset your ${appName} password`,
    html: `<p>Use the link below to reset your password. It expires in one hour.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendPasswordUpdateEmail };
