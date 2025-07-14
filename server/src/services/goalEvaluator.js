const pool = require('../config/db');

// Get user's current progress based on metric type
async function getUserMetricProgress(userId, metric, criteria = {}) {
  switch (metric) {
    case 'lessons_completed':
      const lessons = await pool.query(`
        SELECT COUNT(*) FROM user_completed_lessons WHERE user_id = $1
      `, [userId]);
      return parseInt(lessons.rows[0].count);

    case 'learning_streak':
      const streak = await pool.query(`
        SELECT streak_days FROM user_streaks WHERE user_id = $1
      `, [userId]);
      return streak.rows[0]?.streak_days || 0;

    case 'forum_posts':
      const posts = await pool.query(`
        SELECT COUNT(*) FROM forum_posts WHERE user_id = $1 AND is_meaningful = TRUE
      `, [userId]);
      return parseInt(posts.rows[0].count);

    case 'lesson_completion_time':
      const fastLessons = await pool.query(`
        SELECT COUNT(*) FROM user_completed_lessons 
        WHERE user_id = $1 AND completion_time_minutes <= $2
      `, [userId, criteria.threshold]);
      return parseInt(fastLessons.rows[0].count);

    case 'journaling_streak':
      const journaling = await pool.query(`
        SELECT streak_days FROM user_journaling_streaks WHERE user_id = $1
      `, [userId]);
      return journaling.rows[0]?.streak_days || 0;

    case 'group_tasks':
      const groupTasks = await pool.query(`
        SELECT COUNT(*) FROM group_tasks 
        WHERE assigned_to = $1 AND group_member_count >= $2
      `, [userId, criteria.min_members || 2]);
      return parseInt(groupTasks.rows[0].count);

    case 'ideas_submitted':
      const ideas = await pool.query(`
        SELECT COUNT(*) FROM user_ideas 
        WHERE user_id = $1
      `, [userId]);
      return parseInt(ideas.rows[0].count);

    case 'tasks_completed':
      const tasks = await pool.query(`
        SELECT COUNT(*) FROM user_tasks 
        WHERE user_id = $1
      `, [userId]);
      return parseInt(tasks.rows[0].count);

    case 'meditation_sessions':
    case 'study_sessions':
      const sessionType = metric === 'meditation_sessions' ? 'meditation' : 'study';
      const sessions = await pool.query(`
        SELECT COUNT(*) FROM user_sessions
        WHERE user_id = $1 AND session_type = $2
      `, [userId, sessionType]);
      return parseInt(sessions.rows[0].count);

    default:
      return 0;
  }
}

// Evaluate all active goals for a user when an action happens
async function evaluateUserGoals(userId, metric) {
  try {
    const goalsQuery = await pool.query(`
      SELECT ug.user_goal_id, g.criteria
      FROM user_goals ug
      JOIN goals g ON g.goal_id = ug.goal_id
      WHERE ug.user_id = $1 AND ug.status != 'completed'
    `, [userId]);

    for (const goal of goalsQuery.rows) {
      const criteria = goal.criteria;
      if (criteria.metric !== metric) continue;

      const progress = await getUserMetricProgress(userId, metric, criteria);

      if (progress >= criteria.threshold) {
        await pool.query(`
          UPDATE user_goals 
          SET status = 'completed', completed_at = NOW() 
          WHERE user_goal_id = $1
        `, [goal.user_goal_id]);

        // Optional: Insert notification
        await pool.query(`
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, $2, $3)
        `, [userId, 'Goal Achieved!', `You have completed the goal: ${metric}`]);
      }
    }
  } catch (err) {
    console.error('Error evaluating goals:', err.message);
  }
}

module.exports = { evaluateUserGoals };
