const { BaseRepository } = require('../utils/index');

class LeaderboardRepository extends BaseRepository {
  constructor() {
    super('leaderboard', 'user_id');
  }

  async getLeaderboardWithUsers(period = 'all') {
    let orderBy = 'xp_points DESC';
    
    if (period === 'weekly') {
      orderBy = 'weekly_xp DESC';
    } else if (period === 'monthly') {
      orderBy = 'monthly_xp DESC';
    }

    return this.joinTables({
      joinTables: [{
        table: 'users',
        alias: 'u',
        on: 'leaderboard.user_id = u.user_id'
      }],
      selectFields: [
        'leaderboard.*',
        'u.name',
        'u.profile_image'
      ],
      orderBy,
      limit: 100
    });
  }

  async getUserRank(userId) {
    // This still requires a window function, so we'll use rawQuery
    // but keep it encapsulated in the repository
    const result = await this.rawQuery(`
      WITH ranked_leaderboard AS (
        SELECT user_id, xp_points, RANK() OVER (ORDER BY xp_points DESC) as rank
        FROM leaderboard
      )
      SELECT * FROM ranked_leaderboard WHERE user_id = $1
    `, [userId]);

    return result[0] || null;
  }

  async updateUserXP(userId, xp) {
    // First try to insert or ignore if exists
    await this.upsert(
      {
        user_id: userId,
        xp_points: xp,
        weekly_xp: xp,
        monthly_xp: xp,
        last_updated: new Date().toISOString()
      },
      'user_id',
      ['xp_points', 'weekly_xp', 'monthly_xp', 'last_updated']
    );

    // Then increment the values
    return this.increment(userId, {
      xp_points: xp,
      weekly_xp: xp,
      monthly_xp: xp
    });
  }
}

const leaderboardRepo = new LeaderboardRepository();

const leaderboard = {
  async getLeaderboard(req, res) {
    try {
      const { period = 'all' } = req.query;
      const result = await leaderboardRepo.getLeaderboardWithUsers(period);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUserRank(req, res) {
    try {
      const { user_id } = req.params;
      const result = await leaderboardRepo.getUserRank(user_id);
      
      if (!result) {
        return res.status(404).json({ error: 'User not found on leaderboard' });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateLeaderboardXP(user_id, xp) {
    await leaderboardRepo.updateUserXP(user_id, xp);
  }
};

module.exports = leaderboard;