const { BaseRepository } = require('../utils/index');
class DashboardController {
  constructor() {
    this.userRepo = new BaseRepository('users');
    this.courseRepo = new BaseRepository('courses');
    this.goalRepo = new BaseRepository('user_goals');
    this.leaderboardRepo = new BaseRepository('leaderboard');
    this.streakRepo = new BaseRepository('user_streaks');
    this.recommendationRepo = new BaseRepository('ai_recommendations');
    this.timetableRepo = new BaseRepository('timetable');
    this.moduleRepo = new BaseRepository('modules');  
    this.materialRepo = new BaseRepository('learning_materials');  
  } 
async getOverview(userId) {
  try {
    // Get user
    const users = await this.userRepo.getWhere({ user_id: userId });
    if (!users || users.length === 0) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    const user = users[0];

    // Get user courses
    const userCourses = await this.courseRepo.getWhere({ user_id: userId });
    const courseIds = userCourses.map(course => course.course_id);

    // Get all modules for these courses
    const modules = await this.moduleRepo.getWhereIn('course_id', courseIds);
    const moduleIds = modules.map(m => m.module_id);
    const completedModuleIds = modules.filter(m => m.is_complete).map(m => m.module_id);

    // Get all learning materials for these modules
    const materials = await this.materialRepo.getWhereIn('module_id', moduleIds);
    const materialsCompleted = materials.filter(m => completedModuleIds.includes(m.module_id)).length;
    const totalMaterials = materials.length;
    const completionPercentage = totalMaterials > 0
      ? Math.round((materialsCompleted / totalMaterials) * 100)
      : 0;

    // Parallel fetch other stats
    const [
      activeCourses,
      leaderboardData,
      streakData,
      recommendations,
      userGoals // ⬅️ New way of fetching user goals joined with goal info
    ] = await Promise.all([
      this.courseRepo.getWhere({ user_id: userId, status: 'in_progress' }),
      this.leaderboardRepo.getWhere({ user_id: userId }),
      this.streakRepo.getWhere({ user_id: userId }),
      this.recommendationRepo.getWhere({ user_id: userId, is_accepted: false }),

      // JOIN user_goals with goals table using BaseRepository’s joinTables
      this.goalRepo.joinTables({
        mainTableAlias: 'ug',
        joinTables: [
          {
            table: 'goals',
            alias: 'g',
            on: 'ug.goal_id = g.goal_id',
            type: 'INNER'
          }
        ],
        selectFields: [
          'ug.user_goal_id',
          'ug.status',
          'ug.started_at',
          'ug.completed_at',
          'g.goal_id',
          'g.title',
          'g.description',
          'g.reward_type',
          'g.reward_value',
          'g.icon'
        ],
        conditions: {
          'ug.user_id': userId,
          'ug.status': { $ne: 'completed' }
        }
      })
    ]);

    const goalsCompletedCount = userGoals.filter(g => g.status === 'completed').length;
    const streak = streakData[0] || {};
    const leaderboard = leaderboardData[0] || {};

    return {
      user: {
        name: user.name,
        profileImage: user.profile_image,
        role: user.role
      },
      stats: {
        coursesInProgress: activeCourses.length,
        goalsCompleted: goalsCompletedCount,
        currentStreak: streak.streak_days || 0,
        longestStreak: streak.longest_streak || 0,
        xpPoints: leaderboard.xp_points || 0,
        weeklyXp: leaderboard.weekly_xp || 0,
        materialsCompleted,
        completionPercentage
      },
      activeCourses,
      userGoals, // only active goals with details
      recommendations,
      leaderboardPosition: leaderboard.position || 0 
    };

  } catch (err) {
    console.error(`[DashboardController] Failed to fetch overview for user ${userId}:`, err);
    throw new Error('Dashboard overview failed. Please try again later.');
  }
}



 async getTimetable(userId) {
    try {
      return await this.timetableRepo.joinTables({
        mainTableAlias: 't',
        joinTables: [
          {
            table: 'courses',
            alias: 'c',
            on: 't.course_id = c.course_id'
          },
          {
            table: 'modules',
            alias: 'm',
            on: 't.module_id = m.module_id'
          },
          {
            table: 'learning_materials',
            alias: 'lm',
            on: 't.material_id = lm.material_id'
          }
        ],
        selectFields: [
          't.*',
          'c.title AS course_title',
          'm.title AS module_title',
          'lm.title AS material_title'
        ],
        conditions: {
          't.user_id': userId
        },
        orderBy: 't.date ASC, t.start_time ASC'
      });
    } catch (error) {
      console.error(`[DashboardController] Failed to fetch timetable for user ${userId}:`, error);
      throw new Error('Failed to load timetable. Please try again later.');
    }
  }

  async getAdminOverview() {
  try {
    const [
      totalUsers,
      totalStudents,
      totalCourses,
      totalGoals,
      totalXP,
      totalQuizzes, 
      totalModules,
      totalFeedback
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ role: 'student' }),
      this.courseRepo.count(),
      this.goalRepo.count(),
      this.leaderboardRepo.rawQuery(`SELECT SUM(xp_points) as total_xp FROM leaderboard;`),
      this.courseRepo.rawQuery(`SELECT COUNT(*) as count FROM quizzes;`),
      this.courseRepo.rawQuery(`SELECT COUNT(*) as count FROM modules;`),
      this.courseRepo.rawQuery(`SELECT COUNT(*) as count FROM feedback;`)
    ]);

    return {
      systemStats: {
        totalUsers,
        totalStudents,
        totalCourses,
        totalGoals,
        totalQuizzes: parseInt(totalQuizzes[0]?.count || 0),
        totalModules: parseInt(totalModules[0]?.count || 0),
        totalFeedback: parseInt(totalFeedback[0]?.count || 0),
        totalXP: parseInt(totalXP[0]?.total_xp || 0)
      }
    };
  } catch (err) {
    console.error(`[DashboardController] Failed to fetch admin overview:`, err);
    throw new Error('Admin overview failed. Please try again later.');
  }
}

}

module.exports = DashboardController;