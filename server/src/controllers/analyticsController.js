const { BaseRepository, validateEntity } = require('../utils/index');

const analyticsRepo = new BaseRepository('system_analytics', 'analytic_id');

class UserAnalyticsController {

  // Create analytics record
  async create(req, res) {
    try {
      const data = req.body;

      // Validate input
      validateEntity(data, 'systemAnalytics', 'create');

      // Check if similar record exists (avoid duplicates)
      const existing = await analyticsRepo.getOne({
        user_id: data.user_id,
        course_id: data.course_id,
        module_id: data.module_id,
        metric_name: data.metric_name,
        dimension: data.dimension
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A similar analytics record already exists',
          data: existing
        });
      }

      // Save to DB
      const result = await analyticsRepo.create(data);

      return res.status(201).json({
        success: true,
        message: 'Analytics record created successfully',
        data: result
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Get all analytics with optional filters
  async getAll(req, res) {
    try {
      const conditions = req.query || {};
      const records = await analyticsRepo.getAll(conditions);

      return res.json({
        success: true,
        data: records
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Get analytics by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const record = await analyticsRepo.getById(id);

      if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }

      return res.json({
        success: true,
        data: record
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Get analytics by user_id
  async getByUser(req, res) {
    try {
      const { user_id } = req.params;

      const records = await analyticsRepo.getAll({ user_id });

      return res.json({
        success: true,
        data: records
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Update analytics
  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      validateEntity(data, 'systemAnalytics', 'update');

      const updated = await analyticsRepo.update(id, data);

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Record not found or no changes' });
      }

      return res.json({
        success: true,
        message: 'Analytics record updated successfully',
        data: updated
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Delete analytics
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await analyticsRepo.delete(id);

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }

      return res.json({
        success: true,
        message: 'Analytics record deleted successfully',
        data: deleted
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Error handler
  _handleError(res, error) {
    console.error('❌ Analytics Controller Error:', error);

    if (error.details) {
      return res.status(error.statusCode || 422).json({
        success: false,
        message: error.message,
        errors: error.details
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

module.exports = new UserAnalyticsController();
