const nodemailer = require('nodemailer');
const { HOST, PORT } = require('../../port'); // Import host and port



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (to, token) => {
  const url = `${HOST}/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: `"Syllabyss" <${process.env.EMAIL_FROM}>`, 
    to,
    subject: 'Welcome to Syllabyss - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden;">
          <div style="padding: 30px;">
            <h2 style="color: #333;">Hi there!</h2>
            <p style="font-size: 16px; color: #555;">
              Thank you for signing up on <strong>Syllabyss</strong>.
              Please verify your email to activate your account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                Verify Email
              </a>
            </div>
            <p style="font-size: 14px; color: #777;">
              This link will expire in 24 hours. If you didn't sign up for Syllabyss, you can safely ignore this email.
            </p>
            <p style="font-size: 14px; color: #777; margin-top: 40px;">
              Need help? Contact us at <a href="mailto:nyongfaalanthony@gmail.com">nyongfaalanthony@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    `
  });
};

const sendPasswordUpdateEmail = async (to) => {
  await transporter.sendMail({
    from: `"Syllabyss Security" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Your Syllabyss password has been updated',
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
              <a href="mailto:nyongfaalanthony@gmail.com">nyongfaalanthony@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

module.exports = { sendVerificationEmail, sendPasswordUpdateEmail };
