const {BaseRepository, validateEntity } = require('../utils/index');


const achievementRepo = new BaseRepository('achievements');
const userAchievementRepo = new BaseRepository('user_achievements');
const leaderboardRepo = new BaseRepository('leaderboard');

const achievementController = {
  // Achievements CRUD
  async createAchievement(req, res) {
    try {
      const achievementData = req.body;
      validateEntity(achievementData, 'achievement', 'create');
      
      const achievement = await achievementRepo.create(achievementData);
      res.status(201).json(achievement);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },

  async getAchievement(req, res) {
    try {
      const { id } = req.params;
      const achievement = await achievementRepo.getById(id);
      
      if (!achievement) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      res.json(achievement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAllAchievements(req, res) {
    try {
      const achievements = await achievementRepo.getAll();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateAchievement(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      validateEntity(updateData, 'achievement', 'update');
      
      const achievement = await achievementRepo.update(id, updateData);
      res.json(achievement);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },

  async deleteAchievement(req, res) {
    try {
      const { id } = req.params;
      await achievementRepo.delete(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // User Achievements
  async grantAchievement(req, res) {
    try {
      const { user_id, achievement_id } = req.body;
      validateEntity({ user_id, achievement_id }, 'userAchievement', 'create');
      
      const achievement = await achievementRepo.getById(achievement_id);
      if (!achievement) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      // Check if user already has this achievement using BaseRepository
      const existing = await userAchievementRepo.getAll({
        user_id,
        achievement_id
      });
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'User already has this achievement' });
      }
      
      const userAchievement = await userAchievementRepo.create({
        user_id,
        achievement_id
      });
      
      // Update leaderboard using the repository
      await leaderboardRepo.createOrUpdate({
        user_id,
        xp_points: achievement.xp_value,
        weekly_xp: achievement.xp_value,
        monthly_xp: achievement.xp_value
      }, {
        conflictTarget: 'user_id',
        mergeColumns: {
          xp_points: db.raw('leaderboard.xp_points + EXCLUDED.xp_points'),
          weekly_xp: db.raw('leaderboard.weekly_xp + EXCLUDED.weekly_xp'),
          monthly_xp: db.raw('leaderboard.monthly_xp + EXCLUDED.monthly_xp'),
          last_updated: db.raw('CURRENT_TIMESTAMP')
        }
      });
      
      res.status(201).json(userAchievement);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },

  async getUserAchievements(req, res) {
    try {
      const { user_id } = req.params;
      // Using raw query for complex join
      const result = await db.query(`
        SELECT a.*, ua.earned_date, ua.is_seen 
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.achievement_id
        WHERE ua.user_id = $1
        ORDER BY ua.earned_date DESC
      `, [user_id]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async markAsSeen(req, res) {
    try {
      const { user_achievement_id } = req.params;
      const userAchievement = await userAchievementRepo.update(user_achievement_id, {
        is_seen: true
      });
      res.json(userAchievement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Leaderboard
   async getLeaderboard(req, res) {
    try {
      const { period = 'all' } = req.query;
      let orderBy = 'xp_points DESC';
      
      if (period === 'weekly') {
        orderBy = 'weekly_xp DESC';
      } else if (period === 'monthly') {
        orderBy = 'monthly_xp DESC';
      }
      
      // Using raw query for complex join and ordering
      const result = await db.query(`
        SELECT l.*, u.name, u.profile_image 
        FROM leaderboard l
        JOIN users u ON l.user_id = u.user_id
        ORDER BY ${orderBy}
        LIMIT 100
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUserRank(req, res) {
    try {
      const { user_id } = req.params;
      // Using raw query for window function
      const result = await db.query(`
        WITH ranked_leaderboard AS (
          SELECT user_id, xp_points, RANK() OVER (ORDER BY xp_points DESC) as rank
          FROM leaderboard
        )
        SELECT * FROM ranked_leaderboard WHERE user_id = $1
      `, [user_id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found on leaderboard' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Internal method for XP updates
  async updateLeaderboardXP(user_id, xp) {
    const query = `
      INSERT INTO leaderboard (user_id, xp_points, weekly_xp, monthly_xp)
      VALUES ($1, $2, $2, $2)
      ON CONFLICT (user_id) DO UPDATE SET
        xp_points = leaderboard.xp_points + EXCLUDED.xp_points,
        weekly_xp = leaderboard.weekly_xp + EXCLUDED.weekly_xp,
        monthly_xp = leaderboard.monthly_xp + EXCLUDED.monthly_xp,
        last_updated = CURRENT_TIMESTAMP
    `;
    await db.query(query, [user_id, xp]);
  }
};

module.exports = achievementController;