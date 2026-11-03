// TermsConditions.js
import React from "react";
import "./TermsConditions.css"; // Import the CSS file

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'your-support-email@example.com';

const TermsConditions = () => {
  return (
    <div className="terms-container">
      <div className="terms-box">
        <h1>Terms and Conditions</h1>
        <p><strong>Effective Date:</strong> [Insert Date]</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or using our services, you agree to these terms and our Privacy Policy.
          If you do not agree, please discontinue use.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old or meet the minimum age requirement in your country.
        </p>

        <h2>3. Account Registration</h2>
        <ul>
          <li>Provide accurate account details.</li>
          <li>You are responsible for securing your account.</li>
          <li>We are not responsible for unauthorized account access.</li>
        </ul>

        <h2>4. Use of the Platform</h2>
        <ul>
          <li>Use the platform for educational purposes only.</li>
          <li>Do not share or distribute copyrighted materials.</li>
          <li>No illegal, harmful, or misleading activities allowed.</li>
        </ul>

        <h2>5. Payments and Subscriptions</h2>
        <p>Some courses require a paid subscription, and payments are non-refundable except as required by law.</p>

        <h2>6. AI Usage and Limitations</h2>
        <p>
          AI-generated content may not always be accurate. Verify information before use.
        </p>

        <h2>7. Termination of Account</h2>
        <p>We may suspend or delete accounts for violations of our terms.</p>

        <h2>8. Disclaimer of Warranties</h2>
        <p>
          The platform is provided "as is" without warranties of any kind.
        </p>

        <h2>9. Contact Us</h2>
        <p>Email: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
        <p>Phone: 0209040199</p>
      </div>
    </div>
  );
};

export default TermsConditions;
