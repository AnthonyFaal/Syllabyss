// migrate.js
const pool = require('./db');


// SQL statements for table creation
const createTables = async () => {
  try {
    await pool.query(` 
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(50) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student','admin')),
        profile_image TEXT,
        google_id TEXT,
        facebook_id TEXT,
        is_verified BOOLEAN DEFAULT FALSE, 
        verification_token VARCHAR(255),
        token_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_interest_flows (
        interest_flow_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        selected_field VARCHAR(100) NOT NULL,
        selected_specialization VARCHAR(100),
        selected_experience VARCHAR(20) CHECK (selected_experience IN ('beginner', 'intermediate', 'advanced')),
        created_at TIMESTAMP DEFAULT NOW()
        );
    `);
 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_skills (
        skill_id SERIAL PRIMARY KEY,
        interest_flow_id INT NOT NULL REFERENCES user_interest_flows(interest_flow_id) ON DELETE CASCADE,
        skill_group VARCHAR(100) NOT NULL,
        skill VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
     );
    `);


    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        course_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
        estimated_duration INT, -- in minutes
        user_id INT REFERENCES users(user_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deadline TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed')),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);
  
    await pool.query(`
     CREATE TABLE IF NOT EXISTS modules (
        module_id SERIAL PRIMARY KEY,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_number INT NOT NULL,
        is_complete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `); 

    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_materials (
        material_id SERIAL PRIMARY KEY,
        module_id INT REFERENCES modules(module_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'article', 'quiz', 'infographic', 'audio', 'interactive')),
        content_url TEXT,
        duration INT, -- in minutes
        order_number INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deadline TIMESTAMP
      );
    `); 

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        quiz_id SERIAL PRIMARY KEY,
        material_id INT REFERENCES learning_materials(material_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        passing_score INT DEFAULT 70,
        max_attempts INT DEFAULT 3,
        time_limit INT, -- in minutes
        deadline TIMESTAMP
      );
    `); 

    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        question_id SERIAL PRIMARY KEY,
        quiz_id INT REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'matching')),
        points INT DEFAULT 1,
        order_number INT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_options (
        option_id SERIAL PRIMARY KEY,
        question_id INT REFERENCES questions(question_id) ON DELETE CASCADE,
        option_text TEXT NOT NULL,
        is_correct BOOLEAN DEFAULT FALSE,
        order_number INT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_quiz_attempts (
        attempt_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        quiz_id INT REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
        attempt_number INT NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        score DECIMAL(5,2),
        status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_answers (
        answer_id SERIAL PRIMARY KEY,
        attempt_id INT REFERENCES user_quiz_attempts(attempt_id) ON DELETE CASCADE,
        question_id INT REFERENCES questions(question_id) ON DELETE CASCADE,
        selected_option_id INT REFERENCES question_options(option_id) ON DELETE SET NULL,
        answer_text TEXT,
        is_correct BOOLEAN,
        points_earned DECIMAL(5,2)
      );
    `); 

    // await pool.query(`DROP TABLE IF EXISTS ai_recommendations;`);
  
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        recommendation_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        suggested_course_title VARCHAR(255) NOT NULL,
        suggested_course_description TEXT,
        suggested_difficulty_level VARCHAR(20) 
        CHECK (suggested_difficulty_level IN ('beginner', 'intermediate', 'advanced')),
        suggested_estimated_duration INT, -- in minutes
        recommendation_type VARCHAR(50) NOT NULL,
        reason TEXT,                             
        confidence_score DECIMAL(5,2),            
        is_accepted BOOLEAN DEFAULT false,                      
        difficulty_level VARCHAR(20) 
        CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
        content_type VARCHAR(20) 
        CHECK (content_type IN ('article', 'video')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ); 
    `);
  
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        goal_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        type VARCHAR(20) NOT NULL CHECK (type IN ('challenge', 'achievement')),
        reward_type VARCHAR(50),
        reward_value INT,
        difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
        icon TEXT,
        created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
        visibility VARCHAR(10) NOT NULL DEFAULT 'global' CHECK (visibility IN ('global', 'personal')),
        criteria JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
   await pool.query(`
      CREATE TABLE IF NOT EXISTS user_goals (
        user_goal_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        goal_id INT REFERENCES goals(goal_id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed')),
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        earned_date TIMESTAMP
      );
    `);

    await pool.query(`
     CREATE TABLE IF NOT EXISTS user_goal_progress (
        progress_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        goal_id INT REFERENCES goals(goal_id) ON DELETE CASCADE,
        progress_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, goal_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        chat_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        chat_name VARCHAR(100),  -- optional group name
        profile_image TEXT,      -- optional image URL or path 
        is_chatbot BOOLEAN DEFAULT FALSE,  -- true if chat is with a bot
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        is_private BOOLEAN DEFAULT TRUE
      );
    `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_members (
          chat_member_id SERIAL PRIMARY KEY,
          chat_id INT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
          user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          is_admin BOOLEAN DEFAULT FALSE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (chat_id, user_id)  -- prevent duplicate membership
        );
    `); 

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id SERIAL PRIMARY KEY,
        chat_id INT REFERENCES chats(chat_id) ON DELETE CASCADE,
        chat_member_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        is_from_user BOOLEAN NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        intent VARCHAR(100),
        confidence_score DECIMAL(5,2)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_events (
        event_id SERIAL PRIMARY KEY,
        chat_id INT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
        created_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL, -- e.g., 'study_session', 'group_project', 'quiz_competition'
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        max_participants INT,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_pattern VARCHAR(100), -- e.g., 'daily', 'weekly', 'monthly'
        status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        participant_id SERIAL PRIMARY KEY,
        event_id INT NOT NULL REFERENCES chat_events(event_id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        chat_member_id INT NOT NULL REFERENCES chat_members(chat_member_id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'attended', 'declined', 'left'
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (event_id, user_id) -- Prevent duplicate registrations
      );
    `);
  
   
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_messages (
        message_id SERIAL PRIMARY KEY,
        event_id INT NOT NULL REFERENCES chat_events(event_id) ON DELETE CASCADE,
        chat_member_id INT REFERENCES users(user_id) ON DELETE SET NULL,
        is_system_message BOOLEAN DEFAULT FALSE,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ); 
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_analytics (
        analytic_id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,2) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dimension VARCHAR(100), -- e.g., 'daily', 'weekly', 'by_course'
         user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        module_id INT REFERENCES modules(module_id) ON DELETE CASCADE
      );
    `);
  
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
   
    await pool.query(`
     CREATE TABLE IF NOT EXISTS feedback (
        feedback_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_deadlines (
        deadline_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        module_id INT REFERENCES modules(module_id) ON DELETE CASCADE,
        material_id INT REFERENCES learning_materials(material_id) ON DELETE CASCADE,
        deadline TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    );
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        streak_days INT DEFAULT 0,
        last_active_date TIMESTAMP,
        longest_streak INT DEFAULT 0,
        streak_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    );

    await pool.query(`
      CREATE TABLE IF NOT EXISTS streak_notifications (
        notification_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        streak_days INT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
      );`
    );
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
        module_id INT REFERENCES modules(module_id) ON DELETE CASCADE,
        material_id INT REFERENCES learning_materials(material_id) ON DELETE CASCADE,
        deadline TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_goals_goal ON user_goals(goal_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_id ON users(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_id ON courses(course_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_material_id ON learning_materials(material_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_quiz ON user_quiz_attempts(user_id, quiz_id);`);await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_quiz ON user_quiz_attempts(user_id, quiz_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_events_chat_id ON chat_events(chat_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);`);
   
    console.log('All tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};



// Execute the migration
(async () => {
  try {
    await createTables();
    console.log("✅ Tables created successfully.");
  } catch (err) {
    console.error("❌ Error during migration:", err.message);
  } finally {
    await pool.end();
    process.exit();
  }
})();