const { BaseRepository, validateEntity } = require('./index');

const goalRepo = new BaseRepository('goals', 'goal_id');
const userGoalRepo = new BaseRepository('user_goals');
const leaderboardRepo = new BaseRepository('leaderboard');

async function grantGoalToUser(user_id, goal_id) {
  // Validate the input data
  validateEntity({ user_id, goal_id }, 'userGoal', 'create');

  // Fetch the goal to ensure it exists
  const goal = await goalRepo.getById(goal_id);
  if (!goal) {
    throw new Error('Goal not found');
  }

  // Check if the user already has this goal
  const existing = await userGoalRepo.getAll({ user_id, goal_id });
  if (existing.length > 0) {
    throw new Error('User already has this goal');
  }

  // Create the user-goal record
  const userGoal = await userGoalRepo.create({
    user_id,
    goal_id,
    status: 'completed',
    earned_date: new Date().toISOString(),
    is_seen: false
  });

  // If the goal has a reward, update leaderboard
  if (goal.reward_value && goal.type === 'achievement') {
    await leaderboardRepo.rawQuery(`
      INSERT INTO leaderboard (user_id, xp_points, weekly_xp, monthly_xp, last_updated)
      VALUES ($1, $2, $2, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
      SET xp_points = leaderboard.xp_points + EXCLUDED.xp_points,
          weekly_xp = leaderboard.weekly_xp + EXCLUDED.weekly_xp,
          monthly_xp = leaderboard.monthly_xp + EXCLUDED.monthly_xp,
          last_updated = CURRENT_TIMESTAMP;
    `, [user_id, goal.reward_value]);
  }

  return userGoal;
}

module.exports = grantGoalToUser;
