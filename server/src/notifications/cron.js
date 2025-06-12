// notifications/cron.js
const cron = require('node-cron');
const pool = require('../config/db');
const { sendNotification } = require('./notificationService');

// Run daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  try {
    // Get deadlines in the next 3 days
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    
    const results = await pool.query(
      `SELECT ud.*, u.email 
       FROM user_deadlines ud
       JOIN users u ON ud.user_id = u.user_id
       WHERE deadline BETWEEN NOW() AND $1`,
      [threeDaysLater]
    );
    
    for (const row of results.rows) {
      await sendNotification({
        userId: row.user_id,
        title: 'Upcoming Deadline',
        message: `You have a deadline approaching for ${row.resource_type} on ${new Date(row.deadline).toLocaleString()}`
      });
    }
  } catch (error) {
    console.error('Deadline notification error:', error);
  }
});