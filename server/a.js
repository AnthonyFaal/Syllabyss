const pool = require('./src/config/db');

async function cleanupData() {
  try {
    // Delete the two most recent users (highest user_ids)
    const { rowCount: deletedUsers } = await pool.query(`
      DELETE FROM users
      WHERE user_id IN (
        SELECT user_id FROM users
        ORDER BY user_id DESC
        LIMIT 2
      )
      RETURNING *
    `);
    
    console.log(`🗑️ Deleted ${deletedUsers} most recent user records:`, deletedUsers);

    // Delete all feedback with null course_id
    const { rowCount: deletedFeedback } = await pool.query(`
      DELETE FROM feedback
      WHERE course_id IS NULL
    `);
    console.log(`🗑️ Deleted ${deletedFeedback} feedback records with NULL course_id`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
  }
}

cleanupData();