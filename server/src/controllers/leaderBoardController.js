const {BaseRepository} = require('../utils/index');

// Reuse BaseRepository instance
const leaderboardRepo = new BaseRepository('leaderboard', 'user_id');

const leaderboardController = {
 async getLeaderboard(req, res) {
  try {
    const { period = 'all' } = req.query;

    const orderMap = {
      weekly: 'weekly_xp DESC',
      monthly: 'monthly_xp DESC',
      all: 'xp_points DESC'
    };

    const orderBy = orderMap[period] || orderMap.all;

    const result = await leaderboardRepo.joinTables({
      mainTableAlias: 'leaderboard',
      joinTables: [
        {
          table: 'users',
          alias: 'u',
          on: 'leaderboard.user_id = u.user_id'
        }
      ],
      selectFields: [
        'leaderboard.*',
        'u.name AS user_name',
        'u.profile_image AS user_image'
      ],
      orderBy,
      limit: 100
    });

    // ✅ Success response with data key
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Leaderboard Fetch Error:', error);

    // ❌ Standardized error response
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard'
    });
  }
},

  async getUserRank(req, res) {
  try {
    const { user_id } = req.params;

    const result = await leaderboardRepo.rawQuery(`
      WITH ranked_leaderboard AS (
        SELECT user_id, xp_points,
               RANK() OVER (ORDER BY xp_points DESC) AS position
        FROM leaderboard
      )
      SELECT * FROM ranked_leaderboard WHERE user_id = $1
    `, [user_id]);

    if (!result.length) {
      return res.status(404).json({ error: 'User not found in leaderboard' });
    }

    res.status(200).json(result[0]); // includes user_id, xp_points, and position
  } catch (error) {
    console.error('Rank Fetch Error:', error);
    res.status(500).json({ error: 'Failed to get user rank' });
  }
},

async updateLeaderboardXP(req, res) {
  try {
    const { user_id, xp } = req.body;

    if (!user_id || typeof xp !== 'number') {
      return res.status(400).json({ error: 'Invalid user_id or xp' });
    }

    const timestamp = new Date().toISOString();

    // Step 1: Upsert the leaderboard row
    await leaderboardRepo.upsert(
      {
        user_id,
        xp_points: 0,
        weekly_xp: 0,
        monthly_xp: 0,
        last_updated: timestamp
      },
      'user_id',
      [] // do not update on conflict
    );

    // Step 2: Increment XP
    await leaderboardRepo.increment(user_id, {
      xp_points: xp,
      weekly_xp: xp,
      monthly_xp: xp,
      last_updated: timestamp
    });

    // Step 3: Recalculate all positions using RANK() and update them
    await leaderboardRepo.rawQuery(`
      WITH ranked AS (
        SELECT user_id, RANK() OVER (ORDER BY xp_points DESC) AS position
        FROM leaderboard
      )
      UPDATE leaderboard l
      SET position = r.position
      FROM ranked r
      WHERE l.user_id = r.user_id
    `);

    res.status(200).json({ message: 'XP and leaderboard position updated successfully' });
  } catch (error) {
    console.error('XP Update Error:', error);
    res.status(500).json({ error: 'Failed to update XP and position' });
  }
}

};

module.exports = leaderboardController;
 