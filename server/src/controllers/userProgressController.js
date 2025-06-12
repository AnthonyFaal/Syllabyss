const {BaseRepository, validateEntity } = require('../utils/index');

const userProgressRepo = new BaseRepository('user_progress');

const userProgressController = {
  async createOrUpdateProgress(req, res) {
    try {
      const { user_id, material_id, status, time_spent, attempts } = req.body;
      
      // Validate input
      validateEntity('update', { status, time_spent, attempts });

      // Check if progress exists
      const existing = await userProgressRepo.getAll({
        user_id,
        material_id
      });

      let progress;
      if (existing.length > 0) {
        // Update existing progress
        progress = await userProgressRepo.update(existing[0].progress_id, {
          status,
          time_spent,
          attempts,
          last_accessed: new Date(),
          ...(status === 'completed' && { completion_date: new Date() })
        });
      } else {
        // Create new progress
        progress = await userProgressRepo.create({
          user_id,
          material_id,
          status: status || 'not_started',
          time_spent: time_spent || 0,
          attempts: attempts || 0,
          last_accessed: new Date(),
          ...(status === 'completed' && { completion_date: new Date() })
        });
      }

      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getProgressByMaterial(req, res) {
    try {
      const { user_id, material_id } = req.params;
      
      const progress = await userProgressRepo.getAll({
        user_id,
        material_id
      });

      if (progress.length === 0) {
        return res.status(404).json({ 
          message: 'No progress record found',
          suggestion: 'Create a new progress record with status "not_started"'
        });
      }

      res.json(progress[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUserProgress(req, res) {
    try {
      const { user_id } = req.params;
      
      const progress = await userProgressRepo.getAll({
        user_id
      });

      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateStatus(req, res) {
    try {
      const { user_id, material_id } = req.params;
      const { status } = req.body;

      validateEntity('update', { status });

      // Find existing progress
      const existing = await userProgressRepo.getAll({
        user_id,
        material_id
      });

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Progress record not found' });
      }

      const progress = await userProgressRepo.update(existing[0].progress_id, {
        status,
        last_accessed: new Date(),
        ...(status === 'completed' && { completion_date: new Date() })
      });

      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async recordTime(req, res) {
    try {
      const { user_id, material_id } = req.params;
      const { seconds } = req.body;

      validateEntity('update', { time_spent: seconds });

      // Find existing progress
      const existing = await userProgressRepo.getAll({
        user_id,
        material_id
      });

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Progress record not found' });
      }

      const newTime = (existing[0].time_spent || 0) + seconds;
      const progress = await userProgressRepo.update(existing[0].progress_id, {
        time_spent: newTime,
        last_accessed: new Date()
      });

      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getCompletedMaterials(req, res) {
    try {
      const { user_id } = req.params;
      
      const completed = await userProgressRepo.getAll({
        user_id,
        status: 'completed'
      });

      res.json(completed);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getInProgressMaterials(req, res) {
    try {
      const { user_id } = req.params;
      
      const inProgress = await userProgressRepo.getAll({
        user_id,
        status: 'in_progress'
      });

      res.json(inProgress);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = userProgressController;