const {BaseRepository, validateEntity, grantGoalToUser } = require('../utils/index');

const goalRepo = new BaseRepository('goals');
const userGoalRepo = new BaseRepository('user_goals');

const achievementController = {

async createGoal(req, res) {
  try {
    const data = req.body;
    const goalsArray = Array.isArray(data) ? data : [data];

    const createdGoals = [];

    for (const goalData of goalsArray) {
      // Set visibility based on created_by
      if (goalData.created_by) {
        goalData.visibility = 'personal';
      } else {
        goalData.visibility = 'global';
        goalData.created_by = null; 
      }

      // Check for duplicates before creation
      let existingGoal;
      if (goalData.visibility === 'personal') {
        existingGoal = await goalRepo.getOne({
          created_by: goalData.created_by,
          title: goalData.title
        });
      } else {
        existingGoal = await goalRepo.getOne({
          visibility: 'global',
          title: goalData.title
        });
      }

      if (existingGoal) {
        console.warn(`⚠️ Goal "${goalData.title}" already exists, skipping creation`);
        continue; // Skip creating duplicate
      }

      // Validate input
      validateEntity(goalData, 'goal', 'create');

      // Create the goal
      const createdGoal = await goalRepo.create(goalData);
      createdGoals.push(createdGoal);

      // Grant goal if personal
      if (createdGoal.created_by) {
        try {
          await grantGoalToUser(createdGoal.created_by, createdGoal.goal_id);
        } catch (grantError) {
          console.error(`⚠️ Failed to grant goal (goal_id: ${createdGoal.goal_id}) to user:`, grantError);
        }
      }
    }

    if (createdGoals.length === 0) {
      return res.status(400).json({
        message: 'No new goals were created — all were duplicates.'
      });
    }

    return res.status(201).json({
      message: `Successfully created ${createdGoals.length} goal(s)`,
      goals: createdGoals
    });

  } catch (error) {
    console.error('🚨 Goal creation error:', error);

    const status = error.statusCode || 500;
    const message = error.message || 'An unexpected error occurred';

    return res.status(status).json({
      error: message,
      details: error.details || null
    });
  }
},

  // User Goals
 async grantGoal(req, res) {
  try {
    const { user_id, goal_id } = req.body;
    const userGoal = await grantGoalToUser(user_id, goal_id);
    res.status(201).json(userGoal);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
},
  
 async markAsSeen(req, res) {
    try {
      const { user_goal_id } = req.params;
      const userGoal = await userGoalRepo.update(user_goal_id, {
        is_seen: true
      });
      res.json(userGoal);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getGoal(req, res) {
    try {
      const { id } = req.params;
      const goal = await goalRepo.getById(id);
      
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      res.json(goal);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAllGoals(req, res) {
    try {
      const goals = await goalRepo.getAll();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateGoal(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      validateEntity(updateData, 'goal', 'update');
      
      const goal = await goalRepo.update(id, updateData);
      res.json(goal);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },

  async deleteGoal(req, res) {
    try {
      const { id } = req.params;
      await goalRepo.delete(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUserGoals(req, res) {
    try {
      const { user_id } = req.params;
      // Using raw query for complex join
      const result = await db.query(`
        SELECT g.*, ug.earned_date, ug.is_seen 
        FROM user_goals ug
        JOIN goals g ON ug.goal_id = g.id
        WHERE ug.user_id = $1
        ORDER BY ug.earned_date DESC
      `, [user_id]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  
};

module.exports = achievementController;

