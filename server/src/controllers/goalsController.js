const {BaseRepository, validateEntity} = require('../utils/index');
const goalRepo = new BaseRepository('goals', 'goal_id');
const goalProgressRepo = new BaseRepository('user_goal_progress', 'progress_id');
const userGoalRepo = new BaseRepository('user_goals', 'user_goal_id');

async function initializeProgressForUserGoal(user_id, goal_id) {
  const existingProgress = await goalProgressRepo.getOne({ user_id, goal_id });

  if (!existingProgress) {
    await goalProgressRepo.create({
      user_id,
      goal_id,
      progress_data: {},
      last_updated: new Date(),
    });
  }
}


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

async grantGoal(req, res) {
  try {
    const user_id = req.user?.id;
    const { goal_id } = req.body;

    if (!user_id || !goal_id) {
      return res.status(400).json({ error: 'User ID and Goal ID are required.' });
    }

    // Check if user already has this goal
    const existing = await userGoalRepo.getOne({ user_id, goal_id });
    if (existing) {
      return res.status(200).json({ message: 'Goal already granted to user.', goal: existing });
    }

    // Grant goal
    const userGoal = await userGoalRepo.create({
      user_id,
      goal_id
    });

    // Initialize goal progress
    const progress = await initializeProgressForUserGoal(user_id, goal_id);

    return res.status(201).json({
      message: 'Goal successfully granted to user.',
      goal: userGoal,
      progress
    });

  } catch (error) {
    console.error('🚨 Error granting goal:', error);
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

  async getUserGoals (req, res) {
    try {
      const userId = req.user?.id;
      console.log(userId)
      if (!userId) {
        return res.status(400).json({ error: 'User not authenticated.' });
      }

      const userGoals = await userGoalRepo.getAll({ user_id: userId });
      res.json(userGoals);
    } catch (err) {
      console.error('Error fetching user goals:', err);
      res.status(500).json({ error: 'Server error: ' + err.message });
    }
  },

};

module.exports = achievementController;

