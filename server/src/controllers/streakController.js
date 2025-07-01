const { BaseRepository, validateEntity } = require('../utils/index');
const moment = require('moment');

const streakRepo = new BaseRepository('user_streaks', 'user_id');
const notificationRepo = new BaseRepository('streak_notifications');

// Define milestone days
const MILESTONES = [3, 7, 14, 30];

exports.getUserStreak = async (req, res) => {
  const userId = parseInt(req.params.user_id);

  const streak = await streakRepo.getById(userId);
  if (!streak) {
    return res.status(404).json({ message: 'No streak found for this user.' });
  }

  res.json(streak); 
};

exports.updateUserStreak = async (req, res) => {
  const user_id = parseInt(req.params.user_id);
  const today = moment().startOf('day');

  let streak = await streakRepo.getById(user_id);

  if (!streak) {
    const data = {
      user_id,
      streak_days: 1,
      last_active_date: today.toISOString(),
      longest_streak: 1
    };

    validateEntity(data, 'userStreak', 'create');
    streak = await streakRepo.create(data);

    await maybeNotifyMilestone(user_id, 1);
    return res.status(201).json({ message: 'Streak started', streak });
  }

  const lastActive = moment(streak.last_active_date).startOf('day');

  if (today.diff(lastActive, 'days') === 1) {
    // Continue streak
    streak.streak_days += 1;
    streak.last_active_date = today.toISOString();
    streak.longest_streak = Math.max(streak.longest_streak, streak.streak_days);
  } else if (today.diff(lastActive, 'days') > 1) {
    // Reset streak
    streak.streak_days = 1;
    streak.last_active_date = today.toISOString();
  } else {
    // Same day: no update
    return res.json({ message: 'Streak already counted for today', streak });
  }

  validateEntity(streak, 'userStreak', 'update');
  const updated = await streakRepo.update(user_id, streak);

  await maybeNotifyMilestone(user_id, updated.streak_days);

  res.json({ message: 'Streak updated', streak: updated });
};

const maybeNotifyMilestone = async (user_id, streak_days) => {
  if (!MILESTONES.includes(streak_days)) return;

  // Prevent duplicate milestone notifications
  const existing = await notificationRepo.getOne({ user_id, streak_days });
  if (existing) return;

  const notification = {
    user_id,
    streak_days
  };

  validateEntity(notification, 'streakNotification', 'create');
  await notificationRepo.create(notification);
};
