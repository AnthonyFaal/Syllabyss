async function trackProgressForUser({
  user_id,
  event_type,
  metadata = {},
  goalRepo,
  goalProgressRepo,
  userGoalRepo
}) {
  if (!user_id || !event_type) {
    throw new Error("Missing required parameters: user_id or event_type");
  }

  if (!goalRepo || !goalProgressRepo || !userGoalRepo) {
    console.warn("⚠️ One or more repositories were not provided. Skipping progress tracking.");
    return [];
  }

  const allGoals = await goalRepo.getAll();
  const relevantGoals = allGoals.filter(goal =>
    goal.criteria?.metric === event_type
  );

  if (!relevantGoals.length) return [];

  const completedGoals = [];

  for (const goal of relevantGoals) {
    const goalId = goal.goal_id;
    const threshold = goal.criteria?.threshold;

    // 🔒 Check if user is enrolled in this goal
    const userGoal = await userGoalRepo.getOne({ user_id, goal_id: goalId });
    if (!userGoal || userGoal.status === 'completed') continue;

    let progressEntry = await goalProgressRepo.getOne({ user_id, goal_id: goalId });

    if (!progressEntry) {
      progressEntry = await goalProgressRepo.create({
        user_id,
        goal_id: goalId,
        progress_data: {},
      });
    }

    const progress = { ...progressEntry.progress_data };

    switch (event_type) {
      case 'learning_streak':
        progress.days = (progress.days || 0) + 1;
        break;

      case 'lessons_completed':
        progress.count = (progress.count || 0) + 1;
        break;

      case 'forum_posts':
        if (metadata.quality === 'meaningful') {
          progress.posts = (progress.posts || 0) + 1;
        }
        break;

      case 'lesson_completion_time':
        if (metadata.duration <= threshold) {
          progress.completed_fast = true;
        }
        break;
    }

    await goalProgressRepo.update(progressEntry.progress_id, {
      progress_data: progress,
      last_updated: new Date(),
    });

    const isComplete =
      (event_type === 'lesson_completion_time' && progress.completed_fast) ||
      (progress.count >= threshold) ||
      (progress.days >= threshold) ||
      (progress.posts >= threshold);

    if (isComplete) {
      await userGoalRepo.updateOne({ user_id, goal_id: goalId }, {
        status: 'completed',
        completed_at: new Date(),
        earned_date: new Date()
      });

      completedGoals.push(goal);
    }
  }

  return completedGoals;
}

module.exports = {
  trackProgressForUser,
};
