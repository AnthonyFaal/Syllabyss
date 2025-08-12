// utils/validator.js
const validate = require('validate.js');
const moment = require('moment');

// Custom validators
validate.validators.arrayOfStrings = function(value, options) {
  if (!value) return null;
  if (!Array.isArray(value)) return "must be an array";
  if (options.minLength && value.length < options.minLength) {
    return `must contain at least ${options.minLength} items`;
  }
  if (options.maxLength && value.length > options.maxLength) {
    return `must contain no more than ${options.maxLength} items`;
  }
  for (const item of value) {
    if (typeof item !== 'string') return "all items must be strings";
  }
  return null;
};

validate.validators.futureDate = function(value) {
  if (!value) return null;
  if (!moment(value).isValid()) return "must be a valid date";
  if (!moment(value).isAfter()) return "must be a future date";
  return null;
};

// Configure datetime validator (needed for timestamp, userGoal, systemAnalytics, etc.)
validate.validators.datetime.parse = value => +moment(value);
validate.validators.datetime.format = (value, options) =>
  moment(value).format((options && options.dateOnly) ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss');


validate.validators.passwordComplexity = function(value) {
  if (!value) return null;
  if (value.length < 8) return "must be at least 8 characters";
  if (!/[A-Z]/.test(value)) return "must contain at least one uppercase letter";
  if (!/[a-z]/.test(value)) return "must contain at least one lowercase letter";
  if (!/[0-9]/.test(value)) return "must contain at least one number";
  return null;
};

// Custom validator for end_time being after start_time
validate.validators.validateEndTime = function(value, options, key, attributes) {
  if (!value) return null; // end_time is optional
  
  const startTime = attributes.start_time;
  if (!startTime) return "must have start_time to validate end_time";
  
  if (moment(value).isSameOrBefore(moment(startTime))) {
    return "must be after start_time";
  }
  
  return null;
};

// Custom validator for recurring events
validate.validators.validateRecurrence = function(value, options, key, attributes) {
  if (attributes.is_recurring && !value) {
    return "must provide recurrence_pattern for recurring events";
  }
  return null;
};
// Common reusable rules
const commonRules = {
  id: {
    numericality: { onlyInteger: true, greaterThan: 0 }
  },
  email: {
    presence: true,
    email: true,
    length: { maximum: 255 }
  },
  password: {
    presence: true,
    length: { minimum: 8 },
    passwordComplexity: true
  },
  name: {
    presence: true,
    length: { minimum: 2, maximum: 50 }
  },
  title: {
    presence: true,
    length: { minimum: 3, maximum: 255 }
  },
  description: {
    length: { maximum: 2000 }
  },
  url: {
    url: { allowLocal: true }
  },
  boolean: {
    inclusion: { within: [true, false] }
  },
  timestamp: {
    datetime: true
  },
  percentage: {
    numericality: { greaterThanOrEqualTo: 0, lessThanOrEqualTo: 100 }
  },
  positiveInteger: {
    numericality: { onlyInteger: true, greaterThan: 0 }
  },
  nonNegativeInteger: {
    numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 }
  }
};

// Entity-specific validation rules
const validationRules = {
  // User validations
  user: {
    create: {
      email: commonRules.email,
      password: commonRules.password,
      name: commonRules.name,
      role: {
        presence: true,
        inclusion: { within: ['student', 'admin'] }
      },
      profile_image: {
        url: true,
        allowEmpty: true
      },
      google_id: {
        allowEmpty: true
      },
      facebook_id: {
        allowEmpty: true
      }
    },
    update: {
      email: { ...commonRules.email, presence: false },
      password: { ...commonRules.password, presence: false },
      name: { ...commonRules.name, presence: false },
      role: {
        inclusion: { within: ['student', 'admin'] },
        presence: false
      },
      profile_image: {
        url: true,
        allowEmpty: true
      },
      is_verified: commonRules.boolean,
      is_active: commonRules.boolean
    },
    login: {
      email: commonRules.email,
      password: { presence: true }
    }
  },

  // Course validations
  course: {
    create: { 
      title: commonRules.title,
      description: commonRules.description,
      difficulty_level: {
        inclusion: { within: ['beginner', 'intermediate', 'advanced'] }
      },
      user_id: commonRules.id
    },
    update: {
      title: { ...commonRules.title, presence: false },
      description: { ...commonRules.description, presence: false },
      thumbnail_url: {
        url: true,
        presence: { allowEmpty: true }
      },
      difficulty_level: {
        inclusion: { within: ['beginner', 'intermediate', 'advanced'] },
        presence: false
      },
      estimated_duration: { ...commonRules.positiveInteger, presence: false }
    }
  },

  // Module validations
  module: {
    create: {
      course_id: commonRules.id,
      title: commonRules.title,
      description: commonRules.description,
      order_number: commonRules.positiveInteger
    },
    update: {
      title: { ...commonRules.title, presence: false },
      description: { ...commonRules.description, presence: false },
      order_number: { ...commonRules.positiveInteger, presence: false }
    }
  },

  // Learning Material validations
  learningMaterial: {
    create: {
      module_id: commonRules.id,
      title: commonRules.title,
      content_type: {
        inclusion: { within: ['video', 'article', 'quiz', 'infographic', 'audio', 'interactive'] }
      },
      content_url: {
        url: true,
        allowEmpty: true
      },
      duration: commonRules.positiveInteger,
      order_number: commonRules.positiveInteger
    },
    update: {
      title: { ...commonRules.title, presence: false },
      content_type: {
        inclusion: { within: ['video', 'article', 'quiz', 'infographic', 'audio', 'interactive'] },
        presence: false
      },
      content_url: {
        url: true,
        allowEmpty: true,
        presence: false
      },
      duration: { ...commonRules.positiveInteger, presence: false },
      order_number: { ...commonRules.positiveInteger, presence: false }
    }
  },

  // Quiz validations
  quiz: {
    create: {
      material_id: commonRules.id,
      title: commonRules.title,
      description: commonRules.description,
      passing_score: {
        numericality: { onlyInteger: true, greaterThanOrEqualTo: 0, lessThanOrEqualTo: 100 }
      },
      max_attempts: commonRules.positiveInteger,
      time_limit: commonRules.positiveInteger
    }
  },

  // Question validations
  question: {
    create: {
      quiz_id: commonRules.id,
      question_text: { presence: true, length: { minimum: 5 } },
      question_type: {
        inclusion: { within: ['multiple_choice', 'true_false', 'short_answer', 'matching'] }
      },
      points: commonRules.positiveInteger,
      order_number: commonRules.positiveInteger
    }
  },

  // Question Option validations
  questionOption: {
    create: {
      question_id: commonRules.id,
      option_text: { presence: true, length: { minimum: 1 } },
      is_correct: commonRules.boolean,
      order_number: commonRules.positiveInteger
    }
  },
  
  // Add this inside validationRules
userAnswer: {
  create: {
    attempt_id: {
      numericality: { onlyInteger: true, greaterThan: 0 },
      presence: true
    },
    question_id: {
      numericality: { onlyInteger: true, greaterThan: 0 },
      presence: true
    },
    selected_option_id: {
      numericality: { onlyInteger: true, greaterThan: 0 },
      presence: false // optional for short_answer / non-multiple_choice
    },
    answer_text: {
      presence: false,
      length: { maximum: 5000 } // generous length for short answers
    },
    is_correct: {
      inclusion: { within: [true, false] },
      presence: false // system typically sets this after checking answer
    },
    points_earned: {
      numericality: { greaterThanOrEqualTo: 0 },
      presence: false
    }
  }
},
  aiRecommendation: {
  create: {
    user_id: commonRules.id,
    suggested_course_title: { 
      presence: true, 
      length: { minimum: 3, maximum: 255 } 
    },
    suggested_course_description: { 
      presence: false, 
      length: { maximum: 2000 } 
    },
    suggested_difficulty_level: {
      presence: false,
      inclusion: { within: ['beginner', 'intermediate', 'advanced'] }
    },
    suggested_estimated_duration: { 
      ...commonRules.positiveInteger, 
      presence: false 
    },
    recommendation_type: { 
      presence: true, 
      length: { maximum: 50 } 
    },
    reason: { 
      presence: false, 
      length: { maximum: 2000 } 
    },
    confidence_score: {
      numericality: { greaterThanOrEqualTo: 0, lessThanOrEqualTo: 100 },
      presence: false
    },
    is_accepted: {
      presence: false,
      inclusion: { within: [true, false] }
    }
  }
},

  // User Progress validations
  userProgress: {
    update: {
      status: {
        inclusion: { within: ['not_started', 'in_progress', 'completed'] }
      },
      time_spent: commonRules.nonNegativeInteger,
      attempts: commonRules.nonNegativeInteger
    }
  },

  // Feedback validations
  feedback: {
    create: {
      course_id: commonRules.id,
      rating: {
        numericality: { onlyInteger: true, greaterThanOrEqualTo: 1, lessThanOrEqualTo: 5 }
      },
      comment: {
        length: { maximum: 1000 }
      }
    },
    update: {
      rating: {
        presence: false,
        numericality: { onlyInteger: true, greaterThanOrEqualTo: 1, lessThanOrEqualTo: 5 }
      },
      comment: {
        presence: false,
        length: { maximum: 1000 }
      }
    }
  },

  // Tag validations
  tag: {
    create: {
      name: {
        presence: true,
        length: { minimum: 2, maximum: 100 }
      }
    }
  },

  // Course Tag validations
  courseTag: {
    create: {
      course_id: commonRules.id,
      tag_id: commonRules.id
    }
  },

  // User Interest Flow validations
  userInterestFlow: {
    create: {
      user_id: commonRules.id,
      selected_field: {
        presence: true,
        length: { minimum: 2, maximum: 100 }
      },
      selected_specialization: {
        length: { maximum: 100 }
      },
      selected_experience: {
        inclusion: { within: ['beginner', 'intermediate', 'advanced'] }
      }
    }
  },

  // User Skill validations
  userSkill: {
    create: {
      interest_flow_id: commonRules.id,
      skill_group: {
        presence: true,
        length: { maximum: 100 }
      },
      skill: {
        presence: true,
        length: { maximum: 100 }
      }
    }  
  }, 

  // Chat validations
chat: {
    create: {
      user_id: commonRules.id,
      chat_name: {
        length: { maximum: 100 },
         presence: true,
      },
      profile_image: {
        url: true,
        presence: false
      },
      is_chatbot: commonRules.boolean,
      is_private:commonRules.boolean,
     
    },
    update: {
      chat_name: {
        length: { maximum: 100 },
        presence: false
      },
      profile_image: {
        url: true,
        presence: false
      },
      is_chatbot: { ...commonRules.boolean, presence: false },
      is_private: { ...commonRules.boolean, presence: true }
    }
  },

  // Chat message validations
  chatMessage: {
    create: {
      chat_id: commonRules.id,
      chat_member_id: commonRules.id,
      message_text: {
        presence: true,
        length: { minimum: 1, maximum: 5000 }
      },
      is_from_user: commonRules.boolean,
      intent: {
        length: { maximum: 100 }
      },
      confidence_score: {
        numericality: {
          greaterThanOrEqualTo: 0,
          lessThanOrEqualTo: 1
        }
      }
    }
  },

  // Chat member validations
  chatMember: {
    create: {
      chat_id: commonRules.id,
      user_id: commonRules.id,
      is_admin: { ...commonRules.boolean, presence: { allowEmpty: true } },
      joined_at: { ...commonRules.timestamp, presence: { allowEmpty: true } }
    },
    update: {
      is_admin: { ...commonRules.boolean, presence: false },
      joined_at: { ...commonRules.timestamp, presence: false }
    }
  },

// Goal (challenge or achievement) validations
goal: {
  create: {
    title: { presence: true, length: { minimum: 3, maximum: 255 } },
    description: commonRules.description,
    category: { presence: false, length: { maximum: 100 } },
    type: { presence: true, inclusion: ['challenge', 'achievement'] },
    reward_type: { presence: false, length: { maximum: 50 } },
    reward_value: { ...commonRules.positiveInteger, presence: false },
    icon: { ...commonRules.url, presence: false },
    criteria: { presence: true },
    created_by: {
  presence: false,
      numericality: {
        onlyInteger: true,
        greaterThan: 0
      }
    },
     difficulty: {
      presence: true,
      inclusion: ['easy', 'medium', 'hard']
    }
  }, 
  update: {
    title: { presence: false, length: { minimum: 3, maximum: 255 } },
    description: { ...commonRules.description, presence: false },
    category: { presence: false, length: { maximum: 100 } },
    type: { inclusion: ['challenge', 'achievement'], presence: false },
    reward_type: { presence: false, length: { maximum: 50 } },
    reward_value: { ...commonRules.positiveInteger, presence: false },
    icon: { ...commonRules.url, presence: false },
    criteria: { presence: false },
     difficulty: {
      presence: true,
      inclusion: ['easy', 'medium', 'hard']
    }
  }
},

// User Goal validations (for tracking individual progress)
userGoal: {
  create: {
    user_id: commonRules.id,
    goal_id: commonRules.id,
    status: {
      presence: false,
      inclusion: ['not_started', 'in_progress', 'completed']
    },
    started_at: { datetime: true, presence: false },
    completed_at: { datetime: true, presence: false },
    earned_date: { datetime: true, presence: false },
    is_seen: { type: 'boolean', presence: false }
  }
},

  // Leaderboard validations
  leaderboard: {
    update: {
      xp_points: commonRules.nonNegativeInteger,
      weekly_xp: commonRules.nonNegativeInteger,
      monthly_xp: commonRules.nonNegativeInteger
    }
  },

  systemAnalytics: {
  create: {
    metric_name: {
      presence: true,
      length: { minimum: 1, maximum: 100 }
    },
    metric_value: {
      presence: true,
      numericality: {
        greaterThanOrEqualTo: 0
      }
    },
    timestamp: {
      datetime: true,
      presence: false // will default if not provided
    },
    dimension: {
      length: { maximum: 100 },
      presence: false
    },
    user_id: {
      ...commonRules.id,
      presence: false
    },
    course_id: {
      ...commonRules.id,
      presence: false
    },
    module_id: {
      ...commonRules.id,
      presence: false
    }
  },

  update: {
    metric_name: { length: { minimum: 1, maximum: 100 }, presence: false },
    metric_value: { numericality: { greaterThanOrEqualTo: 0 }, presence: false },
    timestamp: { datetime: true, presence: false },
    dimension: { length: { maximum: 100 }, presence: false },
    user_id: { ...commonRules.id, presence: false },
    course_id: { ...commonRules.id, presence: false },
    module_id: { ...commonRules.id, presence: false }
  }
},

  userStreak: {
    create: {
      user_id: commonRules.id,
      streak_days: commonRules.nonNegativeInteger,
      last_active_date: { ...commonRules.timestamp, presence: false },
      longest_streak: commonRules.nonNegativeInteger,
      streak_updated_at: { ...commonRules.timestamp, presence: false }
    },
    update: {
      streak_days: { ...commonRules.nonNegativeInteger, presence: false },
      last_active_date: { ...commonRules.timestamp, presence: false },
      longest_streak: { ...commonRules.nonNegativeInteger, presence: false },
      streak_updated_at: { ...commonRules.timestamp, presence: false }
    }
  },

  streakNotification: {
    create: {
      user_id: commonRules.id,
      streak_days: commonRules.nonNegativeInteger,
      sent_at: { ...commonRules.timestamp, presence: false },
      is_read: { ...commonRules.boolean, presence: false }
    },
    update: {
      streak_days: { ...commonRules.nonNegativeInteger, presence: false },
      sent_at: { ...commonRules.timestamp, presence: false },
      is_read: { ...commonRules.boolean, presence: false }
    }
  },

 // Add this to your validationRules object (around line 400 where other entity validations are)
event: {
  create: {
    chat_id: commonRules.id,
    created_by: commonRules.id,
    title: {
      presence: true,
      length: { minimum: 3, maximum: 255 }
    },
    description: commonRules.description,
    event_type: {
      presence: true,
      inclusion: { 
        within: [
          'study_session', 
          'group_project', 
          'quiz_competition',
          'brainstorming',
          'pair_programming',
          'code_review',
          'qna_session',
          'other'
        ] 
      }
    },
    start_time: {
      presence: true,
      datetime: true,
      futureDate: true
    },
    end_time: {
      datetime: true,
      validateEndTime: true // Custom validator below
    },
    max_participants: {
      numericality: { 
        onlyInteger: true, 
        greaterThan: 0 
      },
      presence: false
    },
    is_recurring: commonRules.boolean,
    recurrence_pattern: {
      inclusion: { 
        within: ['daily', 'weekly', 'monthly', 'custom'],
        presence: function(value, attributes) {
          return attributes.is_recurring === true;
        }
      }
    },
    status: {
      inclusion: { 
        within: ['upcoming', 'ongoing', 'completed', 'cancelled'] 
      },
      presence: false // Defaults to 'upcoming'
    }
  },
  update: {
    title: { 
      length: { minimum: 3, maximum: 255 },
      presence: false
    },
    description: { ...commonRules.description, presence: false },
    event_type: {
      inclusion: { 
        within: [
          'study_session', 
          'group_project', 
          'quiz_competition',
          'brainstorming',
          'pair_programming',
          'code_review',
          'qna_session',
          'other'
        ],
        presence: false
      }
    },
    start_time: {
      datetime: true,
      presence: false
    },
    end_time: {
      datetime: true,
      validateEndTime: true,
      presence: false
    },
    max_participants: {
      numericality: { 
        onlyInteger: true, 
        greaterThan: 0 
      },
      presence: false
    },
    is_recurring: { ...commonRules.boolean, presence: false },
    recurrence_pattern: {
      inclusion: { 
        within: ['daily', 'weekly', 'monthly', 'custom'],
        presence: false
      }
    },
    status: {
      inclusion: { 
        within: ['upcoming', 'ongoing', 'completed', 'cancelled'] 
      },
      presence: false
    }
  }
},

eventParticipant: {
  create: {
    event_id: commonRules.id,
    user_id: commonRules.id,
    chat_member_id: commonRules.id,
    status: {
      inclusion: { 
        within: ['registered', 'attended', 'declined', 'left', 'waitlisted'] 
      },
      presence: false // Defaults to 'registered'
    }
  },
  update: {
    status: {
      inclusion: { 
        within: ['registered', 'attended', 'declined', 'left', 'waitlisted'] 
      },
      presence: true
    }
  }
},

eventMessage: {
  create: {
    event_id: commonRules.id,
    chat_member_id: {
      ...commonRules.id,
      presence: false // Optional if is_system_message is true
    },
    is_system_message: commonRules.boolean,
    content: {
      presence: true,
      length: { minimum: 1, maximum: 5000 }
    }
  }
} 

};

// Validation function
function validateEntity(data, entityType, action = 'create') {
  const rules = validationRules[entityType]?.[action];
  if (!rules) {
    throw new Error(`No validation rules defined for ${entityType} ${action}`);
  }

  const errors = validate(data, rules);
  if (errors) {
    const validationError = new Error('Validation failed');
    validationError.details = errors;
    validationError.statusCode = 422;
    throw validationError;
  }

  return true;
}

module.exports = {validateEntity};