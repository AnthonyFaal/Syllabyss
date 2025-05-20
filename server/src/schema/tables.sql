CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
     role VARCHAR(20) NOT NULL CHECK (role IN ('student','admin')),
);

CREATE TABLE user_profiles (
    profile_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    selected_field VARCHAR(100) NOT NULL, -- e.g., "Software Development"
    selected_specialization VARCHAR(100), -- e.g., "Backend Development"
    experience_level ENUM('beginner', 'intermediate', 'advanced'),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE user_skills (
    skill_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL, -- e.g., "Django", "Express Framework"
    skill_type VARCHAR(50) NOT NULL, -- e.g., "Software Frameworks"
    proficiency ENUM('interested', 'beginner', 'intermediate', 'advanced'),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_hours INT,
    difficulty ENUM('beginner', 'intermediate', 'advanced'),
    average_rating DECIMAL(3,2),
    is_paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE course_tags (
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    tag_type ENUM('field', 'specialization', 'skill'), -- e.g., "field"
    tag_value VARCHAR(100) NOT NULL, -- e.g., "Software Development"
    relevance_score INT DEFAULT 1, -- Higher = more relevant
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE recommendations (
    recommendation_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    match_score DECIMAL(5,2) NOT NULL, -- Calculated relevance score
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_viewed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE user_course_interactions (
    interaction_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    interaction_type ENUM('view', 'start', 'complete', 'save'),
    interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);





CREATE TABLE user_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    selected_field VARCHAR(100) NOT NULL,
    selected_specialization VARCHAR(100),
    experience_level VARCHAR(20) CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);










CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration INTEGER, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE learning_modules (
    module_id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(course_id),
    title VARCHAR(100) NOT NULL,
    content_type VARCHAR(20) CHECK (content_type IN ('video', 'text', 'quiz', 'interactive')),
    content_url VARCHAR(255),
    duration INTEGER, -- in minutes
    sequence_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    module_id INTEGER REFERENCES learning_modules(module_id),
    completion_status VARCHAR(20) DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed')),
    score NUMERIC(5,2),
    time_spent INTEGER, -- in seconds
    last_accessed TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    attempts INTEGER DEFAULT 0
);

CREATE TABLE ai_recommendations (
    recommendation_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    module_id INTEGER REFERENCES learning_modules(module_id),
    recommendation_type VARCHAR(50) NOT NULL,
    confidence_score NUMERIC(3,2),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_accepted BOOLEAN DEFAULT FALSE,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5)
);

CREATE TABLE gamification_data (
    entry_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    points INTEGER DEFAULT 0,
    badges JSONB, -- Stores badge names and dates earned
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    leaderboard_position INTEGER,
    last_activity TIMESTAMP WITH TIME ZONE
);

CREATE TABLE chatbot_interactions (
    interaction_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    query_text TEXT NOT NULL,
    response_text TEXT,
    intent VARCHAR(100),
    confidence NUMERIC(3,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    resolved BOOLEAN DEFAULT FALSE
); 