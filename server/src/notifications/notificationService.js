const pool = require('./db');
const { sendEmail } = require('./emailService');
const { pushNotification } = require('./pushService');
const logger = require('./logger');

const NotificationService = {
  /**
   * Send a notification to a user
   * @param {Object} params
   * @param {number} params.userId - The ID of the user to notify
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification content
   * @param {string} [params.type='system'] - Notification type (system, deadline, course, achievement)
   * @param {number} [params.relatedId] - ID of related entity (course_id, material_id, etc.)
   * @param {string} [params.relatedType] - Type of related entity
   * @param {boolean} [params.saveToDb=true] - Whether to persist the notification
   * @returns {Promise<Object>} The created notification
   */
  async sendNotification({
    userId,
    title,
    message,
    type = 'system',
    relatedId,
    relatedType,
    saveToDb = true
  }) {
    try {
      // 1. Save to database if requested
      let dbNotification;
      if (saveToDb) {
        dbNotification = await this._createDatabaseNotification({
          userId,
          title,
          message,
          type,
          relatedId,
          relatedType
        });
      }

      // 2. Get user's notification preferences
      const preferences = await this._getUserPreferences(userId);

      // 3. Deliver via preferred channels
      const deliveryPromises = [];
      
      if (preferences.email) {
        deliveryPromises.push(
          sendEmail({
            to: preferences.email,
            subject: title,
            text: message,
            html: this._formatHtmlNotification(title, message, type)
          }).catch(err => logger.error('Email notification failed', err))
        );
      }

      if (preferences.push) {
        deliveryPromises.push(
          pushNotification({
            userId,
            title,
            body: message,
            data: { type, relatedId, relatedType }
          }).catch(err => logger.error('Push notification failed', err))
        );
      }

      if (preferences.inApp) {
        // In-app notifications are handled by the client polling or via websockets
        // The record is already in the database
      }

      await Promise.all(deliveryPromises);

      return dbNotification;
    } catch (error) {
      logger.error('Notification service error:', error);
      throw error;
    }
  },

  /**
   * Create a deadline reminder notification
   * @param {number} userId - User ID
   * @param {string} resourceName - Name of the resource (course, quiz, etc.)
   * @param {Date} deadline - Deadline date
   * @param {string} resourceType - Type of resource
   * @param {number} resourceId - ID of the resource
   * @returns {Promise<Object>} The created notification
   */
  async sendDeadlineReminder(userId, resourceName, deadline, resourceType, resourceId) {
    const formattedDate = new Date(deadline).toLocaleString();
    const daysLeft = Math.floor((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));

    let urgency = '';
    if (daysLeft < 1) {
      urgency = 'URGENT: ';
    } else if (daysLeft < 3) {
      urgency = 'Upcoming: ';
    }

    return this.sendNotification({
      userId,
      title: `${urgency}Deadline Approaching`,
      message: `The deadline for ${resourceName} is on ${formattedDate}. ${daysLeft > 0 ? `${Math.ceil(daysLeft)} days remaining.` : 'Deadline is today!'}`,
      type: 'deadline',
      relatedId: resourceId,
      relatedType: resourceType
    });
  },

  /**
   * Mark a notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for validation)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(
        `UPDATE notifications 
         SET is_read = TRUE 
         WHERE notification_id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Get all notifications for a user
   * @param {number} userId - User ID
   * @param {Object} [options]
   * @param {boolean} [options.unreadOnly=false] - Only return unread notifications
   * @param {number} [options.limit=50] - Maximum number of notifications to return
   * @param {number} [options.offset=0] - Offset for pagination
   * @returns {Promise<Array>} Array of notifications
   */
  async getUserNotifications(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
    try {
      let query = `SELECT * FROM notifications WHERE user_id = $1`;
      const params = [userId];
      
      if (unreadOnly) {
        query += ` AND is_read = FALSE`;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  },

  /**
   * Get count of unread notifications for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount(userId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) FROM notifications 
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  },

  // Private methods
  async _createDatabaseNotification({ userId, title, message, type, relatedId, relatedType }) {
    try {
      const result = await pool.query(
        `INSERT INTO notifications 
         (user_id, title, message, type, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, title, message, type, relatedId, relatedType]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating database notification:', error);
      throw error;
    }
  },

  async _getUserPreferences(userId) {
    try {
      const result = await pool.query(
        `SELECT 
           u.email,
           COALESCE(np.email_notifications, TRUE) as email,
           COALESCE(np.push_notifications, TRUE) as push,
           COALESCE(np.in_app_notifications, TRUE) as inApp
         FROM users u
         LEFT JOIN notification_preferences np ON u.user_id = np.user_id
         WHERE u.user_id = $1`,
        [userId]
      );
      
      return result.rows[0] || {
        email: true,
        push: true,
        inApp: true
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      // Return default preferences if there's an error
      return {
        email: true,
        push: true,
        inApp: true
      };
    }
  },

  _formatHtmlNotification(title, message, type) {
    let icon = '';
    let color = '#3498db';
    
    switch (type) {
      case 'deadline':
        icon = '⏰';
        color = '#e74c3c';
        break;
      case 'achievement':
        icon = '🏆';
        color = '#f1c40f';
        break;
      case 'course':
        icon = '📚';
        color = '#2ecc71';
        break;
      default:
        icon = 'ℹ️';
    }
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px; overflow: hidden;">
        <div style="background-color: ${color}; color: white; padding: 15px; text-align: center;">
          <span style="font-size: 24px; margin-right: 10px;">${icon}</span>
          <h1 style="margin: 0; display: inline-block;">${title}</h1>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; line-height: 1.5;">${message}</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;">
          <p>You received this notification because you're a registered user of our platform.</p>
          <p><a href="${process.env.BASE_URL}/notifications" style="color: ${color};">Manage notification preferences</a></p>
        </div>
      </div>
    `;
  }
};

module.exports = NotificationService;