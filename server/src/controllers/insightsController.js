const { BaseRepository } = require('../utils/index');

// Initialize repositories
const analyticsRepo = new BaseRepository('system_analytics', 'analytic_id');
const leaderboardRepo = new BaseRepository('leaderboard', 'leaderboard_id');
const quizAttemptRepo = new BaseRepository('user_quiz_attempts', 'attempt_id');
const userGoalsRepo = new BaseRepository('user_goals', 'user_goal_id');
const coursesRepo = new BaseRepository('courses', 'course_id');
const quizzesRepo = new BaseRepository('quizzes', 'quiz_id');

class InsightsController {
  /**
   * Get user key performance indicators
   */
static async getUserKPIs(req, res, next) {
  try {
    const { userId } = req.params;
    const authUserId = req.user.id;
    
    // Authorization check
    if (parseInt(userId) !== authUserId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get quiz attempts with proper filtering - modified to work with your getWhere
    const quizAttempts = await quizAttemptRepo.getWhere({ 
      user_id: userId, 
      status: 'completed',
      score: null // This will need to be handled differently
    });

    // Filter out null scores in JavaScript instead of SQL
    const validQuizAttempts = quizAttempts.filter(attempt => attempt.score !== null);

    // Calculate quiz statistics
    const totalAttempts = validQuizAttempts.length;
    const avgQuizPercentage = totalAttempts > 0
        ? parseFloat((validQuizAttempts.reduce((acc, cur) => acc + parseFloat(cur.score), 0) / (totalAttempts * 100) * 100).toFixed(2)) // Assuming scores are out of 100
        : 0;


    // Get user goals statistics
    const userGoals = await userGoalsRepo.getWhere({ user_id: userId });
    const goalStats = {
      completed: userGoals.filter(g => g.status === 'completed').length,
      inProgress: userGoals.filter(g => g.status === 'in_progress').length,
      notStarted: userGoals.filter(g => g.status === 'not_started').length
    };

    // Get XP points from leaderboard
    const xpRecord = await leaderboardRepo.getOne({ user_id: userId });
    const totalXP = xpRecord?.xp_points || 0;

    // Get course progress statistics
    const userCourses = await coursesRepo.getWhere({ user_id: userId });
    const courseStats = {
      completed: userCourses.filter(c => c.status === 'completed').length,
      inProgress: userCourses.filter(c => c.status === 'in_progress').length,
      notStarted: userCourses.filter(c => c.status === 'not_started').length
    };

    // Return comprehensive KPIs
    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        avgQuizPercentage,
        totalAttempts,
        totalXP,
        goals: goalStats,
        courses: courseStats
      }
    });
  } catch (err) {
    next(err);
  }
}

  /**
   * Get user quiz performance trends over time
   */
  static async getUserQuizTrends(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Authorization check
      if (parseInt(userId) !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden' 
        });
      }

      // Calculate date range (last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      fourteenDaysAgo.setHours(0, 0, 0, 0);

      // Get quiz attempts with detailed information
      const recentAttempts = await quizAttemptRepo.joinTables({
        mainTableAlias: 'qa',
        joinTables: [
          {
            table: 'quizzes',
            alias: 'q',
            on: 'qa.quiz_id = q.quiz_id'
          },
          {
            table: 'learning_materials',
            alias: 'lm',
            on: 'q.material_id = lm.material_id'
          },
          {
            table: 'modules',
            alias: 'm',
            on: 'lm.module_id = m.module_id'
          },
          {
            table: 'courses',
            alias: 'c',
            on: 'm.course_id = c.course_id'
          }
        ],
        selectFields: [
          'qa.*',
          'q.title as quiz_title',
          'c.title as course_title',
          'm.title as module_title'
        ],
        conditions: {
          'qa.user_id': userId,
          'qa.status': 'completed',
          'qa.end_time': { $gte: fourteenDaysAgo.toISOString() }
        },
        orderBy: 'qa.end_time DESC'
      });

      // Process data into daily trends
      const trends = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Initialize all 14 days to ensure we have entries even for days without attempts
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trends[dateStr] = { attempts: 0, scores: [], quizzes: [] };
      }

      // Populate with actual attempt data
      recentAttempts.forEach(attempt => {
        const attemptDate = new Date(attempt.end_time);
        attemptDate.setHours(0, 0, 0, 0);
        const dateStr = attemptDate.toISOString().split('T')[0];
        
        if (trends[dateStr]) {
          trends[dateStr].attempts++;
          trends[dateStr].scores.push(parseFloat(attempt.score));
          trends[dateStr].quizzes.push({
            quizId: attempt.quiz_id,
            title: attempt.quiz_title,
            course: attempt.course_title,
            module: attempt.module_title,
            score: attempt.score
          });
        }
      });

      // Format the response data
      const data = Object.entries(trends)
        .map(([date, value]) => ({
          date,
          attempts: value.attempts,
          avg_score: value.attempts > 0 
            ? parseFloat((value.scores.reduce((a, b) => a + b, 0) / value.scores.length).toFixed(2))
            : 0,
          quizzes: value.quizzes
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      res.json({ 
        success: true, 
        data 
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user goal progress over time
   */
 static async getUserGoalProgress(req, res, next) {
  try {
    const { userId } = req.params;

    // Authorization: ensure the requesting user matches the userId param
    if (parseInt(userId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }

    // Fetch all user goals joined with goal details
    const allGoals = await userGoalsRepo.joinTables({
      mainTableAlias: 'ug',
      joinTables: [{
        table: 'goals',
        alias: 'g',
        on: 'ug.goal_id = g.goal_id'
      }],
      selectFields: [
        'ug.*',
        'g.title as goal_title',
        'g.category as goal_category',
        'g.type as goal_type',
        'g.reward_value as xp_reward'
      ],
      conditions: {
        'ug.user_id': userId
      },
      orderBy: 'ug.started_at DESC'
    });

    // Organize goal progress grouped by start date (YYYY-MM-DD)
    const progressByDate = {};

    allGoals.forEach(goal => {
      if (!goal.started_at) return;

      // Normalize start date to YYYY-MM-DD
      const startedDate = new Date(goal.started_at);
      startedDate.setHours(0, 0, 0, 0);
      const startedDateStr = startedDate.toISOString().split('T')[0];

      // Initialize date entry if not exists
      if (!progressByDate[startedDateStr]) {
        progressByDate[startedDateStr] = {
          date: startedDateStr,
          completed: 0,
          in_progress: 0,
          goals: []
        };
      }

      // Count status per date
      if (goal.status === 'completed') {
        progressByDate[startedDateStr].completed++;
      } else if (goal.status === 'in_progress') {
        progressByDate[startedDateStr].in_progress++;
      }

      // Add detailed goal info
      progressByDate[startedDateStr].goals.push({
        goalId: goal.goal_id,
        title: goal.goal_title,
        category: goal.goal_category,
        type: goal.goal_type,
        status: goal.status,
        xpReward: goal.xp_reward
      });
    });

    // Convert progressByDate object to sorted array by date ascending
    const data = Object.values(progressByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Respond with structured goal progress data
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}


  /**
   * Get user recent activity
   */
  static async getUserRecentActivity(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Authorization check
      if (parseInt(userId) !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden' 
        });
      }

      const activities = await analyticsRepo.joinTables({
                mainTableAlias: 'sa',
                joinTables: [
                    {
                    table: 'courses',
                    alias: 'c',
                    on: 'sa.course_id = c.course_id',
                    type: 'LEFT'
                    },
                    {
                    table: 'modules',
                    alias: 'm',
                    on: 'sa.module_id = m.module_id',
                    type: 'LEFT'
                    },
                    {
                    table: 'learning_materials',
                    alias: 'lm',
                    on: 'm.module_id = lm.module_id',  // Join learning_materials to modules, not system_analytics
                    type: 'LEFT'
                    },
                    {
                    table: 'quizzes',
                    alias: 'q',
                    on: 'lm.material_id = q.material_id',
                    type: 'LEFT'
                    }
                ],
                selectFields: [
                    'sa.*',
                    'c.title as course_title',
                    'm.title as module_title',
                    'lm.title as material_title',
                    'lm.content_type as material_type',
                    'q.title as quiz_title'
                ],
                conditions: {
                    'sa.user_id': userId
                },
                orderBy: 'sa.timestamp DESC',
                limit: 20
                });


      // Format activity data
      const formattedActivities = activities.map(activity => {
        let activityDetails = {
          type: activity.metric_name,
          value: activity.metric_value,
          timestamp: activity.timestamp
        };

        // Add context based on what the activity relates to
        if (activity.course_title) {
          activityDetails.context = {
            course: activity.course_title,
            module: activity.module_title,
            material: activity.material_title || activity.quiz_title,
            materialType: activity.material_type
          };
        }

        return activityDetails;
      });

      res.json({ 
        success: true, 
        data: formattedActivities 
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user XP breakdown by category
   */
  static async getUserXPBreakdown(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Authorization check
      if (parseInt(userId) !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden' 
        });
      }

      // Get all XP-related activities
      const xpActivities = await analyticsRepo.getWhere({
        user_id: userId,
        metric_name: { $like: '%xp%' }
      });

      // Categorize XP by source
      const xpBreakdown = {
        quizzes: 0,
        goals: 0,
        courses: 0,
        daily_engagement: 0,
        other: 0
      };

      xpActivities.forEach(activity => {
        const xpValue = parseInt(activity.metric_value) || 0;
        
        if (activity.metric_name.includes('quiz_xp')) {
          xpBreakdown.quizzes += xpValue;
        } else if (activity.metric_name.includes('goal_xp')) {
          xpBreakdown.goals += xpValue;
        } else if (activity.metric_name.includes('course_xp')) {
          xpBreakdown.courses += xpValue;
        } else if (activity.metric_name.includes('daily_xp')) {
          xpBreakdown.daily_engagement += xpValue;
        } else {
          xpBreakdown.other += xpValue;
        }
      });

      // Format the response
      const data = Object.entries(xpBreakdown)
        .filter(([_, value]) => value > 0)
        .map(([category, total]) => ({
          category,
          total
        }));

      res.json({ 
        success: true, 
        data 
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InsightsController;