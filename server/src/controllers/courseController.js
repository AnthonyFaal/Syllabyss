const { 
  validateEntity, 
  BaseRepository, 
  generateDeadline,   
} = require('../utils/index');
const {updateUserStreakLogic} = require("../utils/streakUpdater");

const {createTimetable} = require('../utils/timetableHelper');
const recommendationController = require('./recommendationController');
const { generateCourseContent, generateQuizContent } = require('../services/content_generator');
const courseRepository = new BaseRepository('courses', 'course_id');
const moduleRepository = new BaseRepository('modules', 'module_id');
const materialRepository = new BaseRepository('learning_materials');
const quizRepository = new BaseRepository('quizzes', 'quiz_id');   // Assuming you have this
const questionRepository = new BaseRepository('questions', 'question_id');
const optionRepository = new BaseRepository('question_options', 'option_id');
const attemptRepo = new BaseRepository('user_quiz_attempts', 'attempt_id');
const answerRepo  = new BaseRepository('user_answers', 'answer_id');
 class CourseController {
 
async createCourse(req, res, next) {
  try {
    console.log('⏳ Starting course creation process...');
    console.log('📥 Received request with body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User ID:', req.body.user_id);

    const { prompt, user_id, content_type, difficulty_level } = req.body;

    // Validate required fields
    if (!prompt || !user_id) {
      console.error('❌ Validation failed: Missing prompt or user_id');
      return res.status(400).json({
        success: false,
        error: "Missing prompt or user_id",
      });
    }

    console.log('✅ Basic validation passed');
    console.log('📝 Prompt:', prompt);
    console.log('🎚️ Requested content type:', content_type);
    console.log('📊 Requested difficulty level:', difficulty_level);

    const validContentTypes = ["video", "article", "quiz", "exercise"];
    const validDifficulties = ["beginner", "intermediate", "advanced"];

    const defaultContentType = validContentTypes.includes(content_type) ? content_type : "article";
    const defaultDifficulty = validDifficulties.includes(difficulty_level) ? difficulty_level : "beginner";

    console.log('⚙️ Using content type:', defaultContentType);
    console.log('📈 Using difficulty level:', defaultDifficulty);

    // Get past courses for context
    console.log('🔍 Fetching past courses for user:', user_id);
    const pastCourses = await courseRepository.getAll(user_id);
    console.log(`📚 Found ${pastCourses.length} past courses for user`);

    // Generate course content
    console.log('🧠 Generating course content with prompt:', prompt);
    const courseStructure = await generateCourseContent(prompt, pastCourses, {
      defaultContentType,
      defaultDifficulty,
    });
    
    console.log('🎨 Generated course structure:', JSON.stringify({
      title: courseStructure.title,
      description: courseStructure.description,
      moduleCount: courseStructure.modules?.length || 0,
      estimatedDuration: courseStructure.estimated_duration
    }, null, 2));

    // Prepare course data
    const courseData = {
      title: courseStructure.title,
      description: courseStructure.description,
      difficulty_level: courseStructure.difficulty_level,
      estimated_duration: courseStructure.estimated_duration,
      user_id,
      deadline: generateDeadline({
        durationType: "course",
        durationValue: courseStructure.estimated_duration,
        durationUnit: "minutes",
        strategy: "custom",
      }),
    };

    console.log('📋 Prepared course data:', JSON.stringify(courseData, null, 2));

    // Validate course data
    console.log('🔍 Validating course data structure...');
    validateEntity(courseData, "course", "create");
    console.log('✅ Course data validation passed');

    // Create course
    console.log('💾 Saving course to database...');
    const course = await courseRepository.create(courseData);
    console.log('✔️ Course created with ID:', course.course_id);

    // Process modules
    console.log(`🛠️ Processing ${courseStructure.modules?.length || 0} modules...`);
    for (const [index, mod] of courseStructure.modules.entries()) {
      console.log(`\n📦 Processing module ${index + 1}: ${mod.title}`);
      
      const moduleData = {
        course_id: course.course_id,
        title: mod.title,
        description: mod.description,
        order_number: mod.order_number || index + 1,
      };

      console.log('📄 Module data:', JSON.stringify(moduleData, null, 2));
      
      const module = await moduleRepository.create(moduleData);
      console.log('✔️ Module created with ID:', module.module_id);

      // Process learning materials
      const materials = mod.learning_materials || [];
      console.log(`📚 Processing ${materials.length} learning materials for module...`);
      
      for (const [mIndex, mat] of materials.entries()) {
        console.log(`\n📝 Processing material ${mIndex + 1}: ${mat.title}`);
        
        const materialData = {
          module_id: module.module_id,
          title: mat.title,
          content_type: mat.content_type || defaultContentType,
          content_url: mat.content_url || "",
          duration: mat.duration || 0,
          order_number: mat.order_number || mIndex + 1,
        };

        console.log('📄 Material data:', JSON.stringify(materialData, null, 2));
        
        const material = await materialRepository.create(materialData);
        console.log('✔️ Material created with ID:', material.material_id);

        // Generate quiz for this material
         // Generate quiz for this material
    console.log('❓ Generating quiz for material...');
    const quizStructure = await generateQuizContent(mat.title, [
      { title: mat.title, content: mat.content || "" }
    ]);

    console.log('📊 Generated quiz structure:', JSON.stringify({
      title: quizStructure.title,
      questionCount: quizStructure.questions?.length || 0,
      passingScore: quizStructure.passing_score,
      totalPoints: quizStructure.questions.reduce((sum, q) => sum + q.points, 0) // Verify points sum
    }, null, 2));

    const quizData = {
      material_id: material.material_id,
      title: quizStructure.title,
      description: quizStructure.description,
      passing_score: quizStructure.passing_score,
      max_attempts: quizStructure.max_attempts,
      time_limit: quizStructure.time_limit,
      deadline: generateDeadline({
        durationType: "quiz",
        durationValue: quizStructure.time_limit,
        durationUnit: "minutes",
        strategy: "custom"
      })
    };

    console.log('📝 Quiz data:', JSON.stringify(quizData, null, 2));
    
    const quiz = await quizRepository.create(quizData);
    console.log('✔️ Quiz created with ID:', quiz.quiz_id);

    // Process quiz questions - ENSURE POINTS ARE PASSED HERE
    console.log(`❓ Processing ${quizStructure.questions?.length || 0} quiz questions...`);
    for (const question of quizStructure.questions) {
      // EXPLICITLY VERIFY POINTS VALUE BEFORE SAVING
      const questionPoints = Number.isInteger(question.points) ? question.points : 1;
      console.log(`🔢 Question points value: ${questionPoints} (original: ${question.points})`);

      const questionData = {
        quiz_id: quiz.quiz_id,
        question_text: question.question_text,
        question_type: question.question_type,
        points: questionPoints, // This overrides the database default
        order_number: question.order_number,
      };

      console.log('❔ Question data:', JSON.stringify({
        text: question.question_text,
        type: question.question_type,
        points: questionPoints // Log the actual points being saved
      }, null, 2));
      
      const savedQuestion = await questionRepository.create(questionData);
      console.log(`✔️ Question created with ID: ${savedQuestion.question_id}, Points: ${questionPoints}`);
          // Process question options
          console.log(`🔘 Processing ${question.options?.length || 0} options...`);
          for (const option of (question.options || [])) {
            const optionData = {
              question_id: savedQuestion.question_id,
              option_text: option.option_text,
              is_correct: option.is_correct,
              order_number: option.order_number,
            };

            console.log('⚙️ Option data:', JSON.stringify({
              text: option.option_text,
              isCorrect: option.is_correct
            }, null, 2));
            
            await optionRepository.create(optionData);
          }
          console.log('✅ All options saved for question');
        }
        console.log('✅ All questions saved for quiz');
      }
      console.log('✅ All materials processed for module');
    }
    console.log('🎉 All modules processed successfully');

    console.log('🏁 Course creation completed successfully');
    return res.status(201).json({
      success: true,
      data: {
        course,
        message: "Course created successfully with quizzes for each material.",
      },
    });

  } catch (error) {
    console.error('❌ Error creating course:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    next(error);
  }
}

   async getCourse(req, res, next) {
    try {
      const courseId = req.params.id;
      const course = await courseRepository.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      // Get all modules for this course
      const modules = await moduleRepository.getAll({ course_id: courseId });
      
      // For each module, get its learning materials
      const courseWithModules = await Promise.all(modules.map(async (mod) => {
        const materials = await materialRepository.getAll({ module_id: mod.module_id });
        return {
          ...mod,
          learning_materials: materials
        };
      }));
      
      res.status(200).json({
        success: true,
        data: {
          ...course,
          modules: courseWithModules
        }
      });
    } catch (error) {
      next(error);
    }
  } 

  async getAllCourses(req, res, next) {
    try {
      const { difficulty, search, page, limit } = req.query;
      const conditions = {};
      
      if (difficulty) {
        conditions.difficulty_level = difficulty;
      }
      
      if (search) {
        conditions.title = { ilike: `%${search}%` };
      }
      
      const courses = await courseRepository.paginate({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        conditions
      });
      
      // For each course, get its modules and materials
      const enrichedCourses = await Promise.all(courses.data.map(async (course) => {
        const modules = await moduleRepository.getAll({ course_id: course.course_id });
        
        const modulesWithMaterials = await Promise.all(modules.map(async (mod) => {
          const materials = await materialRepository.getAll({ module_id: mod.module_id });
          return {
            ...mod,
            learning_materials: materials
          };
        }));
        
        return {
          ...course,
          modules: modulesWithMaterials
        };
      }));
      
      res.status(200).json({
        success: true,
        ...courses,
        data: enrichedCourses
      });
    } catch (error) {
      next(error);
    }
  }
  
async getCoursesByUser(req, res, next) {
  try {
    const userId = req.params.userId || req.user.id;
    const { page, limit } = req.query;

    // Get courses
    const coursesData = await courseRepository.paginate({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      conditions: { user_id: userId },
    });
    const courses = coursesData.data;

    // Enhance courses with module counts
    const enhancedCourses = await Promise.all(
      courses.map(async (course) => {
        const modules = await moduleRepository.getAll({ course_id: course.course_id }); 
        const total_module_count = modules.length;
        const completed_module_count = modules.filter((m) => m.is_complete).length;

        return {
          ...course,
          total_module_count,
          completed_module_count,
        };
      })
    );

    res.status(200).json({
      success: true,
      page: coursesData.page,
      limit: coursesData.limit,
      total: coursesData.total,
      data: enhancedCourses,
    });
  } catch (error) {
    next(error);
  }
}

async getCourseModelsWithMaterials(req, res, next) {
  try {
    const courseId = req.params.courseId;
    const userId = req.user?.user_id;

    const modules = await moduleRepository.getAll({ course_id: courseId });

    const modulesWithMaterials = await Promise.all(
      modules.map(async (mod) => {
        const materials = await materialRepository.getAll({ module_id: mod.module_id });

        const materialsWithQuizzes = await Promise.all(
          materials.map(async (mat) => {
            const quizzes = await quizRepository.getAll({ material_id: mat.material_id });

            const quizzesWithQuestionsAndAttempts = await Promise.all(
              quizzes.map(async (quiz) => {
                const questions = await questionRepository.getAll({ quiz_id: quiz.quiz_id });

                const questionsWithAnswers = await Promise.all(
                  questions.map(async (question) => {
                    const options = await optionRepository.getAll({ question_id: question.question_id });

                    let userAnswer = null;
                    let isCorrect = false;
                    let pointsEarned = 0;

                    // Get latest attempt
                    const attempts = await attemptRepo.getAll({ quiz_id: quiz.quiz_id, user_id: userId });
                    const latestAttempt = attempts?.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0];

                    if (latestAttempt) {
                      const answers = await answerRepo.getAll({ attempt_id: latestAttempt.attempt_id });
                      const answer = answers.find(ans => ans.question_id === question.question_id);

                      if (answer) {
                        userAnswer = answer.answer_text || answer.selected_option_id;
                        isCorrect = answer.is_correct;
                        pointsEarned = answer.points_earned;
                      }
                    }

                    return {
                      ...question,
                      options,
                      user_answer: userAnswer,
                      is_correct: isCorrect,
                      points_earned: pointsEarned
                    };
                  })
                );

                // Include latest attempt summary
                const attempts = await attemptRepo.getAll({ quiz_id: quiz.quiz_id, user_id: userId });
                const latestAttempt = attempts?.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0];

                return {
                  ...quiz,
                  questions: questionsWithAnswers,
                  latest_attempt: latestAttempt
                    ? {
                        ...latestAttempt,
                        passed: latestAttempt.score >= quiz.passing_score
                      }
                    : null
                };
              })
            );

            return {
              ...mat,
              quizzes: quizzesWithQuestionsAndAttempts
            };
          })
        );

        return {
          ...mod,
          learning_materials: materialsWithQuizzes
        };
      })
    );

    res.status(200).json({
      success: true,
      data: modulesWithMaterials
    });
  } catch (error) {
    console.error("Error in getCourseModelsWithMaterials:", error);
    next(error);
  }
}


async  updateCourse(req, res, next) {
  try {
    const courseId = req.params.courseId;
    const { status } = req.body;

    console.log(`📌 Received request to update course ${courseId} with status: ${status}`);

    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing status value' });
    }

    const existingCourse = await courseRepository.getById(courseId);
    if (!existingCourse) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const updatePayload = {
      status,
      updated_at: new Date(),
    };

    if (status === 'in_progress' && !existingCourse.started_at) {
      updatePayload.started_at = new Date();
    } else if (status === 'completed' && !existingCourse.completed_at) {
      updatePayload.completed_at = new Date();
    }

    const updatedCourse = await courseRepository.update(courseId, updatePayload);

    // Send response first
    res.status(200).json({
      success: true,
      message: 'Course status updated successfully',
      data: updatedCourse,
    });

    // Trigger timetable generation in background
    if (status === 'in_progress') {
      console.log(`⚡ Starting timetable generation for user ${existingCourse.user_id} in background`);

      createTimetable(existingCourse.user_id)
        .then(() => {
          console.log(`✅ Timetable generation completed for user ${existingCourse.user_id}`);
        })
        .catch((error) => {
          console.error(`❌ Timetable generation failed for user ${existingCourse.user_id}: ${error.message}`);
        });
    } 

   else if (status === 'completed') {
      console.log(`⚡ Starting course recommendation generation for user ${existingCourse.user_id} in background`);
      
      // Create mock request/response objects
      const mockReq = {
        body: {
          course_id: courseId,
          type: 'next_course'
        }
      };
      
      const mockRes = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          console.log('Recommendation created:', data);
          return this;
        }
      };

      // Call the recommendation controller
      recommendationController.createRecommendation(mockReq, mockRes)
        .then(() => {
          console.log(`✅ Recommendation generation completed for user ${existingCourse.user_id}`);
        })
        .catch((error) => {
          console.error(`❌ Recommendation generation failed for user ${existingCourse.user_id}: ${error.message}`);
        });
    }

  } catch (error) {
    console.error(`❌ Error updating course ${req.params.courseId}: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}


async updateModule(req, res, next) {
  try {
    console.log('📦 Received request with:', {
      params: req.params,
      body: req.body,
    });

    const rawModuleId = req.params.moduleId;
    const moduleId = parseInt(rawModuleId, 10);

    console.log(`📌 Received request to update module ${rawModuleId} with is_complete: ${req.body.is_complete}`);

    if (isNaN(moduleId)) {
      console.log(`⚠️ Invalid module ID: ${rawModuleId}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid module ID'
      });
    }

    const { is_complete } = req.body;

    if (typeof is_complete !== 'boolean') {
      console.log(`⚠️ Invalid is_complete value: ${is_complete}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid is_complete value (must be boolean)' 
      });
    }

    const existingModule = await moduleRepository.getById(moduleId);
    if (!existingModule) {
      console.log(`❌ Module not found: ${moduleId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Module not found' 
      });
    }

    // Update module
    await moduleRepository.update(moduleId, { is_complete });
    console.log(`✅ Module ${moduleId} updated with is_complete = ${is_complete}`);

    const updatedModuleData = await moduleRepository.getById(moduleId);

    // Get user_id directly from authenticated user
    const user_id = req.user.id;
    console.log(`👤 Using authenticated user ID: ${user_id}`);

    res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: updatedModuleData
    });

    // 🧠 Update streak (don't block response)
    try {
      const streakResult = await updateUserStreakLogic(user_id);
      console.log(`🔥 Streak update for user ${user_id}:`, streakResult.message);
    } catch (streakErr) {
      console.error(`❌ Failed to update streak for user ${user_id}: ${streakErr.message}`);
    }

    // ⏳ Rebuild timetable
    createTimetable(user_id)
      .then(() => {
        console.log(`✅ Timetable regenerated for user ${user_id}`);
      })
      .catch((error) => {
        console.error(`❌ Timetable regeneration failed for user ${user_id}: ${error.message}`);
      });

  } catch (error) {
    console.error(`❌ Error updating module ${req.params.moduleId}: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}


async deleteCourse(req, res, next) {
  try {
    const courseId = req.params.courseId; // Changed from id to courseId for consistency
    const userId = req.user.id;
    
    // Check if course exists and belongs to user
    const existingCourse = await courseRepository.getById(courseId);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    if (existingCourse.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this course'
      });
    }
    
    // Delete course using the generic delete method
    await courseRepository.delete(courseId);
    
    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

  async deleteAllCourses(req, res, next) {
  try {
    // Verify admin privileges
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Admin privileges required'
    //   });
    // }

    // Get counts before deletion (optional)
    
    const moduleCount = await moduleRepository.count();
    const materialCount = await materialRepository.count();

    // Delete all courses - cascading will handle modules/materials
    const deletedCourses = await courseRepository.deleteAll();

    res.status(200).json({
      success: true,
      message: 'All courses and associated data deleted successfully',
      deletedCount: {
        courses: deletedCourses.length,
        modules: moduleCount, // These will be deleted by cascade
        materials: materialCount // These will be deleted by cascade
      }
    }); 
  } catch (error) {
    next(error);
  }
}
}

module.exports = new CourseController();