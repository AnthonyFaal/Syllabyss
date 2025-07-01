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
   
  } 
  
 async getOverview(userId) {
    try {
      // Get user
      const users = await this.userRepo.getWhere({ user_id: userId });
      if (!users || users.length === 0) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      const user = users[0];

      // Parallel fetch
      const [
        activeCourses,
        userGoals,
        leaderboardData,
        streakData,
        recommendations
      ] = await Promise.all([
        this.courseRepo.getWhere({ user_id: userId, status: 'in_progress' }),
        this.goalRepo.getWhere({ user_id: userId }),
        this.leaderboardRepo.getWhere({ user_id: userId }),
        this.streakRepo.getWhere({ user_id: userId }),
        this.recommendationRepo.getWhere({ user_id: userId })
      ]);

      // Process data
      const goalsCompleted = userGoals.filter(g => g.status === 'completed').length;
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
          goalsCompleted,
          currentStreak: streak.streak_days || 0,
          longestStreak: streak.longest_streak || 0,
          xpPoints: leaderboard.xp_points || 0,
          weeklyXp: leaderboard.weekly_xp || 0
        },
        activeCourses,
        userGoals,
        recommendations,
        leaderboardPosition: leaderboard.position || 0 // Add position if your schema supports it
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