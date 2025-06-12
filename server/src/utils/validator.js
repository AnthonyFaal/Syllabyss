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

validate.validators.passwordComplexity = function(value) {
  if (!value) return null;
  if (value.length < 8) return "must be at least 8 characters";
  if (!/[A-Z]/.test(value)) return "must contain at least one uppercase letter";
  if (!/[a-z]/.test(value)) return "must contain at least one lowercase letter";
  if (!/[0-9]/.test(value)) return "must contain at least one number";
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
      presence: { allowEmpty: true }
    },
    profile_image: {
      url: true,
      presence: { allowEmpty: true }
    },
    is_chatbot: commonRules.boolean,
    start_time: commonRules.timestamp,
    end_time: {
      datetime: true
    },
    sentiment_score: {
      numericality: {
        greaterThanOrEqualTo: -1,
        lessThanOrEqualTo: 1
      }
    },
    satisfaction_rating: {
      numericality: {
        onlyInteger: true,
        greaterThanOrEqualTo: 1,
        lessThanOrEqualTo: 5
      }
    }
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
    start_time: { ...commonRules.timestamp, presence: false },
    end_time: { ...commonRules.timestamp, presence: false },
    sentiment_score: {
      numericality: {
        greaterThanOrEqualTo: -1,
        lessThanOrEqualTo: 1
      },
      presence: false
    },
    satisfaction_rating: {
      numericality: {
        onlyInteger: true,
        greaterThanOrEqualTo: 1,
        lessThanOrEqualTo: 5
      },
      presence: false
    }
  }
},

// Chat Message validations
chatMessage: {
  create: {
    chat_id: commonRules.id,
    message_text: {
      presence: true,
      length: { minimum: 1, maximum: 5000 }
    },
    is_from_user: commonRules.boolean,
    timestamp: commonRules.timestamp,
    intent: {
      length: { maximum: 100 },
      presence: { allowEmpty: true }
    },
    confidence_score: {
      numericality: {
        greaterThanOrEqualTo: 0,
        lessThanOrEqualTo: 1
      }
    }
  }
},

// Achievement validations
  achievement: {
    create: {
      name: { presence: true, length: { minimum: 3, maximum: 100 } },
      description: commonRules.description,
      icon_url: { ...commonRules.url, presence: false },
      criteria: { presence: true, length: { minimum: 10 } },
      xp_value: { ...commonRules.positiveInteger, presence: true }
    },
    update: {
      name: { ...commonRules.name, presence: false },
      description: { ...commonRules.description, presence: false },
      icon_url: { ...commonRules.url, presence: false },
      criteria: { length: { minimum: 10 }, presence: false },
      xp_value: { ...commonRules.positiveInteger, presence: false }
    }
  },

  // User Achievement validations
  userAchievement: {
    create: {
      user_id: commonRules.id,
      achievement_id: commonRules.id
    }
  },

  // Leaderboard validations
  leaderboard: {
    update: {
      xp_points: commonRules.nonNegativeInteger,
      weekly_xp: commonRules.nonNegativeInteger,
      monthly_xp: commonRules.nonNegativeInteger
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