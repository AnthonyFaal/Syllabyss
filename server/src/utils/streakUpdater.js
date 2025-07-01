const moment = require('moment');
const { BaseRepository, validateEntity } = require('./index');

const streakRepo = new BaseRepository('user_streaks', 'user_id');

const updateUserStreakLogic = async (user_id) => {
  const today = moment().startOf('day');
  let streak = await streakRepo.getById(user_id);

  if (!streak) {
    const data = {
      user_id,
      streak_days: 1,
      last_active_date: today.toISOString(),
      longest_streak: 1,
    };

    validateEntity(data, 'userStreak', 'create');
    streak = await streakRepo.create(data);

    return { message: 'Streak started', streak };
  }

  const lastActive = moment(streak.last_active_date).startOf('day');

  if (today.diff(lastActive, 'days') === 1) {
    streak.streak_days += 1;
    streak.last_active_date = today.toISOString();
    streak.longest_streak = Math.max(streak.longest_streak, streak.streak_days);
  } else if (today.diff(lastActive, 'days') > 1) {
    streak.streak_days = 1;
    streak.last_active_date = today.toISOString();
  } else {
    return { message: 'Streak already counted for today', streak };
  }

  validateEntity(streak, 'userStreak', 'update');
  const updated = await streakRepo.update(user_id, streak);

  return { message: 'Streak updated', streak: updated };
};

module.exports = { updateUserStreakLogic };
