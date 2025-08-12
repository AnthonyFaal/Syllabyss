// migrations/createUserActivityLog.js
const pool = require('../config/db'); // adjust to your DB connection

async function createUserActivityLogTableAndTriggers() {
  const sql = `
  -- Create table
  CREATE TABLE IF NOT EXISTS user_activity_log (
      activity_id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      reference_id INT,
      reference_table VARCHAR(50),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_created_at ON user_activity_log(created_at);

  -- Function: log quiz completion
  CREATE OR REPLACE FUNCTION log_quiz_completion()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO user_activity_log (user_id, activity_type, reference_id, reference_table, description)
    VALUES (
      NEW.user_id,
      'quiz_completed',
      NEW.quiz_id,
      'quizzes',
      'Completed quiz ID ' || NEW.quiz_id || ' with score ' || COALESCE(NEW.score, 0)
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_log_quiz_completion ON user_quiz_attempts;
  CREATE TRIGGER trg_log_quiz_completion
  AFTER UPDATE OF status ON user_quiz_attempts
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION log_quiz_completion();

  -- Function: log goal completion
  CREATE OR REPLACE FUNCTION log_goal_completion()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO user_activity_log (user_id, activity_type, reference_id, reference_table, description)
    VALUES (
      NEW.user_id,
      'goal_completed',
      NEW.goal_id,
      'goals',
      'Completed goal ID ' || NEW.goal_id
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_log_goal_completion ON user_goals;
  CREATE TRIGGER trg_log_goal_completion
  AFTER UPDATE OF status ON user_goals
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION log_goal_completion();

  -- Function: log course enrollment
  CREATE OR REPLACE FUNCTION log_course_enrollment()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO user_activity_log (user_id, activity_type, reference_id, reference_table, description)
    VALUES (
      NEW.user_id,
      'course_enrolled',
      NEW.course_id,
      'courses',
      'Enrolled in course "' || NEW.title || '"'
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_log_course_enrollment ON courses;
  CREATE TRIGGER trg_log_course_enrollment
  AFTER INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION log_course_enrollment();
  `;

  try {
    await pool.query(sql);
    console.log('✅ user_activity_log table and triggers created successfully');
  } catch (error) {
    console.error('❌ Error creating activity log table/triggers:', error);
  } finally {
    await pool.end();
  }
}

createUserActivityLogTableAndTriggers();
