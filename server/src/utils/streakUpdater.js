const moment = require('moment');
const { BaseRepository, validateEntity } = require('./index');
const { trackProgressForUser } = require('../services/goalService'); 

// Repositories needed for goal tracking
const goalRepo = new BaseRepository('goals', 'goal_id');
const goalProgressRepo = new BaseRepository('user_goal_progress', 'progress_id');
const userGoalRepo = new BaseRepository('user_goals', 'user_goal_id');

const streakRepo = new BaseRepository('user_streaks', 'user_id');

const updateUserStreakLogic = async (user_id) => {
  const today = moment().startOf('day');
  let streak = await streakRepo.getById(user_id);

  let streakStartedToday = false;

  if (!streak) {
    const data = {
      user_id,
      streak_days: 1,
      last_active_date: today.toISOString(),
      longest_streak: 1,
    };

    validateEntity(data, 'userStreak', 'create');
    streak = await streakRepo.create(data);

    streakStartedToday = true;
  } else {
    const lastActive = moment(streak.last_active_date).startOf('day');

    if (today.diff(lastActive, 'days') === 1) {
      streak.streak_days += 1;
      streak.last_active_date = today.toISOString();
      streak.longest_streak = Math.max(streak.longest_streak, streak.streak_days);
      streakStartedToday = true;
    } else if (today.diff(lastActive, 'days') > 1) {
      streak.streak_days = 1;
      streak.last_active_date = today.toISOString();
      streakStartedToday = true;
    } else {
      return { message: 'Streak already counted for today', streak };
    }

    validateEntity(streak, 'userStreak', 'update');
    streak = await streakRepo.update(user_id, streak);
  }

  // ✅ Track learning_streak progress only if streak was updated today
  if (streakStartedToday) {
    await trackProgressForUser({
      user_id,
      event_type: 'learning_streak',
      goalRepo,
      goalProgressRepo,
      userGoalRepo,
    });
  }

  return {
    message: streakStartedToday ? 'Streak updated' : 'Streak already counted for today',
    streak,
  };
};

module.exports = { updateUserStreakLogic };
