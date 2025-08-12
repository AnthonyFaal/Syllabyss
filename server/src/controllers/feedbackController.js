const { BaseRepository } = require('../utils/index');
const feedbackRepo = new BaseRepository('feedback', 'feedback_id');

class FeedbackController {
  // Create feedback
  async create(req, res) {
    try {
      const { course_id, rating, comment } = req.body;
      const user_id = req.user.id; // from auth middleware

      // Validation: ensure required fields
      if (!course_id || !rating || !comment) {
        return res.status(400).json({
          success: false,
          message: 'course_id, rating, and comment are required'
        });
      }

      // Rating bounds check
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const result = await feedbackRepo.create({
        user_id,
        course_id,
        rating,
        comment
      });

      return res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: result
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Get all feedback (with user info)
async getAll(req, res) {
  try {
    const conditions = req.query || {};
    const records = await feedbackRepo.joinTables({
      mainTableAlias: 'f',
      joinTables: [
        {
          table: 'users',
          alias: 'u',
          on: 'f.user_id = u.user_id',
          type: 'LEFT'
        },
        {
          table: 'courses',
          alias: 'c',
          on: 'f.course_id = c.course_id',
          type: 'LEFT'
        }
      ],
      selectFields: [
        'f.feedback_id',
        'f.user_id',
        'f.course_id',
        'f.rating',
        'f.comment',
        'f.submitted_at',
        'u.name',
        'u.profile_image',
        'c.title as course_title' // Include course title
      ],
      conditions
    });

    return res.json({ success: true, data: records });
  } catch (error) {
    return this._handleError(res, error);
  }
}

  // Get by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const record = await feedbackRepo.getById(id);

      if (!record) {
        return res.status(404).json({ success: false, message: 'Feedback not found' });
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Get by course
  async getByCourse(req, res) {
    try {
      const { id: course_id } = req.params;
      const records = await feedbackRepo.getWhere({ course_id });

      if (!records.length) {
        return res.status(404).json({ success: false, message: 'No feedback found for this course' });
      }

      return res.json({ success: true, data: records });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Get by logged-in user
  async getByUser(req, res) {
    try {
      const user_id = req.user.id;
      const records = await feedbackRepo.getWhere({ user_id });

      return res.json({ success: true, data: records });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Update feedback
  async update(req, res) {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const user_id = req.user.id;

      // Validation
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }

      const updated = await feedbackRepo.updateWhere({ feedback_id: id, user_id }, { rating, comment });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Feedback not found or unchanged' });
      }

      return res.json({ success: true, message: 'Feedback updated successfully', data: updated });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // Delete feedback
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const deleted = await feedbackRepo.deleteWhere({ feedback_id: id, user_id });

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Feedback not found' });
      }

      return res.json({ success: true, message: 'Feedback deleted successfully', data: deleted });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  _handleError(res, error) {
    console.error('❌ Feedback Controller Error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

module.exports = new FeedbackController();
