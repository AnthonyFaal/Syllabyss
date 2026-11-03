/*
 * One-time, deliberate administrator credential update.
 * Values are read only from environment variables so no password is committed.
 *
 * PowerShell:
 *   $env:CURRENT_ADMIN_EMAIL='old@example.com'
 *   $env:ADMIN_EMAIL='admin@example.com'
 *   $env:ADMIN_PASSWORD='use-a-strong-password'
 *   node scripts/manage-admin.js
 */
require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

const required = ['CURRENT_ADMIN_EMAIL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
  process.exitCode = 1;
} else if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters long.');
  process.exitCode = 1;
} else {
  (async () => {
    try {
      const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      const result = await pool.query(
        `UPDATE users
         SET email = $1, password = $2, role = 'admin', is_verified = TRUE,
             verification_token = NULL, token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE lower(email) = lower($3)
         RETURNING user_id, email, name, role`,
        [process.env.ADMIN_EMAIL.trim().toLowerCase(), password, process.env.CURRENT_ADMIN_EMAIL.trim()]
      );

      if (result.rowCount === 0) {
        throw new Error('No user matches CURRENT_ADMIN_EMAIL; no account was changed.');
      }

      console.log(`Administrator updated: ${result.rows[0].email} (user ${result.rows[0].user_id}).`);
    } catch (error) {
      console.error(`Administrator update failed: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  })();
}
