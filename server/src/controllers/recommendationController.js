const { 
  validateEntity, 
  BaseRepository, 
  generateDeadline,   
} = require('../utils/index');
const { generateCourseContent, generateQuizContent,  generateCourseRecommendation } = require('../services/content_generator');
const courseRepository = new BaseRepository('courses', 'course_id');
const moduleRepository = new BaseRepository('modules', 'module_id');
const materialRepository = new BaseRepository('learning_materials');
const quizRepository = new BaseRepository('quizzes', 'quiz_id');   // Assuming you have this
const questionRepository = new BaseRepository('questions', 'question_id');
const optionRepository = new BaseRepository('question_options', 'option_id');
const recommendationRepository = new BaseRepository('ai_recommendations', 'recommendation_id');
const interestFlowRepository = new BaseRepository('user_interest_flows', 'interest_flow_id');
const userSkillsRepository = new BaseRepository('user_skills', 'skill_id');
class recommendationController {
    constructor() {
        this.createInterestRecommendation= this.createInterestRecommendation.bind(this);
        this.getAllRecommendations = this.getAllRecommendations.bind(this);
        this.createRecommendation = this.createRecommendation.bind(this);
        this.acceptRecommendation = this.acceptRecommendation.bind(this);
        this.getRecommendationHistory = this.getRecommendationHistory.bind(this);
    }


 async createInterestRecommendation(req, res) {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID required'
        });
      }

      // Fetch latest interest flow
      const interestFlow = await interestFlowRepository.getOne({ user_id });
      if (!interestFlow) {
        return res.status(404).json({
          success: false,
          message: 'User interests not found'
        });
      }

      // Fetch skills linked to this flow
      const skills = await userSkillsRepository.getAll({ 
        interest_flow_id: interestFlow.interest_flow_id 
      });
      const skillList = skills.map(s => s.skill).join(', ') || 'none';

      // Past recommendations
      const pastRecs = await recommendationRepository.getAll({
        user_id,
        is_accepted: false
      });

      const historyInfo = pastRecs.length > 0
        ? `${pastRecs.length} past recommendations`
        : 'No history yet';

      // Prompt
      const prompt = `
        User interests:
        - Field: ${interestFlow.selected_field}
        - Specialization: ${interestFlow.selected_specialization || 'none'}
        - Experience: ${interestFlow.selected_experience}
        - Skills: ${skillList}
        
        ${historyInfo}.
        Suggest ONE next learning course recommendation.
        Content must be in video format.
      `;

      const recommendation = await generateCourseRecommendation(
        prompt,
        pastRecs,
        interestFlow.selected_experience,
        'video'
      );

      const savedRec = await recommendationRepository.create({
        user_id,
        suggested_course_title: recommendation.title,
        suggested_course_description: recommendation.description,
        suggested_difficulty_level: recommendation.difficulty || interestFlow.selected_experience,
        suggested_estimated_duration: recommendation.duration || 30,
        recommendation_type: recommendation.type || 'personalized',
        reason: recommendation.reason || 'Based on your interests and skills',
        confidence_score: recommendation.confidence || 70,
        difficulty_level: recommendation.difficulty || interestFlow.selected_experience,
        content_type: 'video',
        is_accepted: false
      });

      return res.status(201).json({
        success: true,
        recommendation: {
          id: savedRec.recommendation_id,
          title: savedRec.suggested_course_title,
          difficulty: savedRec.difficulty_level,
          type: savedRec.content_type,
          reason: savedRec.reason
        }
      });

    } catch (error) {
      console.error('Interest Recommendation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create interest-based recommendation'
      });
    }
  }

async createRecommendation(req, res) {
    try {
        const { course_id } = req.body;

        if (!course_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Course ID required' 
            });
        }

        const course = await courseRepository.getOne({ course_id });
        if (!course) {
            return res.status(404).json({ 
                success: false, 
                message: 'Course not found' 
            });
        }

        // Extract primary content type from course modules
        const contentTypes = new Set();
       if (Array.isArray(course.modules)) {
            course.modules.forEach(module => {
                if (Array.isArray(module.learning_materials)) {
                    module.learning_materials.forEach(material => {
                        contentTypes.add(material.content_type);
                    });
                }
            });
        }
        const primaryContentType = contentTypes.size > 0 
            ? Array.from(contentTypes)[0] 
            : 'mixed';

        const userId = course.user_id;

        // Enhanced prompt including content type
        // Fetch user quiz stats
            const userQuizzes = await quizRepository.getAll({ user_id: userId });
            let averageScore = 0;
            let weakAreas = [];

            if (userQuizzes.length > 0) {
                const totalScore = userQuizzes.reduce((sum, q) => sum + (q.score || 0), 0);
                averageScore = (totalScore / userQuizzes.length).toFixed(1);

                // Assuming each quiz record has `weak_areas` as an array
                weakAreas = userQuizzes.flatMap(q => q.weak_areas || []);
            }

            // Fetch course history for this user
            const completedCourses = await courseRepository.getAll({ user_id: userId, status: 'completed' });
            const inProgressCourses = await courseRepository.getAll({ user_id: userId, status: 'in_progress' });

            // User preferences (assuming stored somewhere)
            const userPreferences = course.preferences || {};
            const preferredDifficulty = userPreferences.difficulty || 'any';
            const preferredContentType = userPreferences.content_type || 'any';

            // Enhanced prompt using real data
            const prompt = `
            Just completed: "${course.title}" (${course.difficulty_level}, ${primaryContentType})
            My stats: ${averageScore}% avg, weak in ${weakAreas.length > 0 ? weakAreas.join(', ') : 'none'}
            Completed: ${completedCourses.length}, In progress: ${inProgressCourses.length}
            Preferred level: ${preferredDifficulty}
            Preferred content: ${preferredContentType}
            Suggest ONE next course.
            `;

        // Check for existing recommendations
        const pastRecs = await recommendationRepository.getAll({ 
            user_id: userId,
            is_accepted: false
        });

        if (pastRecs.length >= 2) {
            return res.status(200).json({
                success: true,
                message: 'Max unaccepted recommendations reached',
                recommendations: pastRecs.slice(0, 2)
            });
        }

        // Get single recommendation with content type consideration
        const recommendation = await generateCourseRecommendation(
            prompt,
            pastRecs,
            course.difficulty_level,
            primaryContentType  
        );

        // Save with content type
        const savedRec = await recommendationRepository.create({
            user_id: userId,
            suggested_course_title: recommendation.title,
            suggested_course_description: recommendation.description,
            suggested_difficulty_level: recommendation.difficulty,
            suggested_estimated_duration: recommendation.duration,
            recommendation_type: recommendation.type,
            reason: recommendation.reason,
            confidence_score: recommendation.confidence,
            difficulty_level: recommendation.difficulty,
            content_type: recommendation.contentType || primaryContentType,
            is_accepted: false
        });

        return res.status(201).json({
            success: true,
            recommendation: {
                id: savedRec.recommendation_id,
                title: savedRec.suggested_course_title,
                difficulty: savedRec.difficulty_level,
                type: savedRec.content_type,  // Now properly includes content type
                reason: savedRec.reason
            }
        });

    } catch (error) {
        console.error('Recommendation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create recommendation'
        });
    }
}

async acceptRecommendation(req, res) {
    try {
        const { recommendationId } = req.params;
        const userId = req.user.id;

        if (!recommendationId) {
            return res.status(400).json({
                success: false,
                message: 'Recommendation ID is required'
            });
        }

        const recommendation = await recommendationRepository.getOne({
            recommendation_id: recommendationId,
            user_id: userId
        });

        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: 'Recommendation not found or not owned by user'
            });
        }

        if (recommendation.is_accepted) {
            return res.status(400).json({
                success: false,
                message: 'Recommendation has already been accepted'
            });
        }

        // Mark recommendation as accepted
        const updatedRecommendation = await recommendationRepository.update(
            recommendationId,
            { is_accepted: true }
        );

        // Build prompt
        const prompt = this.buildCoursePrompt(recommendation);

        // Prepare course data for service
        const courseData = {
            prompt,
            voice :'Ava',
            user_id: userId,
            content_type: recommendation.content_type,
            difficulty_level: recommendation.suggested_difficulty_level || recommendation.difficulty_level,
            title: recommendation.suggested_course_title,
            description: recommendation.suggested_course_description,
            estimated_duration: recommendation.suggested_estimated_duration,
            recommendation_metadata: {
                source_recommendation_id: recommendationId,
                confidence_score: recommendation.confidence_score,
                recommendation_type: recommendation.recommendation_type
            }
        };

        // Call pure service function to create course
        const courseResult =  await this.createCourseFromData(courseData, req.user);

        return res.status(200).json({
            success: true,
            message: 'Recommendation accepted and course created',
            data: {
                recommendation: updatedRecommendation,
                course: courseResult.data
            }
        });

    } catch (error) {
        console.error('Error accepting recommendation:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}


    buildCoursePrompt(recommendation) {
        return `
        Create a comprehensive ${recommendation.content_type} course about "${recommendation.suggested_course_title}".
        
        Course specifications:
        - Difficulty: ${recommendation.suggested_difficulty_level || recommendation.difficulty_level}
        - Duration: ${recommendation.suggested_estimated_duration} minutes
        - Format: ${recommendation.content_type}
        
        Description:
        ${recommendation.suggested_course_description}
        
        Context:
        - Type: ${recommendation.recommendation_type}
        - Confidence: ${recommendation.confidence_score}
        - Reason: ${recommendation.reason || 'Not specified'}
        
        Generate complete course structure with modules and lessons.
        `;
    }
  
    // Get recommendations history for a user
    async getRecommendationHistory(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 10, offset = 0 } = req.query;
            
            const recommendations = await recommendationRepository.paginate({
                page: Math.floor(offset / limit) + 1,
                limit: parseInt(limit),
                conditions: { user_id: userId }
            });
            
            return res.status(200).json({
                success: true,
                data: recommendations
            });
            
        } catch (error) {
            console.error('Recommendation history error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get recommendation history',
                error: error.message
            });
        }
    } 


async  createCourseFromData(courseInput, user) {
  try {
    console.log('⏳ Starting course creation process...');
    console.log('📥 Received course data:', JSON.stringify(courseInput, null, 2));

    const { prompt, user_id, content_type, difficulty_level } = courseInput;

    if (!prompt || !user_id) {
      throw new Error('Missing prompt or user_id');
    }

    const validContentTypes = ["video", "article", "quiz", "exercise"];
    const validDifficulties = ["beginner", "intermediate", "advanced"];

    const defaultContentType = validContentTypes.includes(content_type) ? content_type : "article";
    const defaultDifficulty = validDifficulties.includes(difficulty_level) ? difficulty_level : "beginner";

    const pastCourses = await courseRepository.getAll(user_id);

    const courseStructure = await generateCourseContent(prompt, pastCourses, {
      defaultContentType,
      defaultDifficulty,
    });

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

    validateEntity(courseData, "course", "create");
    const course = await courseRepository.create(courseData);

    for (const [index, mod] of courseStructure.modules.entries()) {
      const moduleData = {
        course_id: course.course_id,
        title: mod.title,
        description: mod.description,
        order_number: mod.order_number || index + 1,
      };
      const module = await moduleRepository.create(moduleData);

      for (const [mIndex, mat] of (mod.learning_materials || []).entries()) {
        const materialData = {
          module_id: module.module_id,
          title: mat.title,
          content_type: mat.content_type || defaultContentType,
          content_url: mat.content_url || "",
          duration: mat.duration || 0,
          order_number: mat.order_number || mIndex + 1,
        };
        const material = await materialRepository.create(materialData);

        const quizStructure = await generateQuizContent(mat.title, [
          { title: mat.title, content: mat.content || "" }
        ]);

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
        const quiz = await quizRepository.create(quizData);

        for (const question of quizStructure.questions) {
          const questionPoints = Number.isInteger(question.points) ? question.points : 1;
          const questionData = {
            quiz_id: quiz.quiz_id,
            question_text: question.question_text,
            question_type: question.question_type,
            points: questionPoints,
            order_number: question.order_number,
          };
          const savedQuestion = await questionRepository.create(questionData);

          for (const option of (question.options || [])) {
            const optionData = {
              question_id: savedQuestion.question_id,
              option_text: option.option_text,
              is_correct: option.is_correct,
              order_number: option.order_number,
            };
            await optionRepository.create(optionData);
          }
        }
      }
    }

    return {
      success: true,
      data: course,
      message: "Course created successfully with quizzes."
    };

  } catch (error) {
    console.error('❌ Error creating course:', error);
    throw error;
  }
}

  async getAllRecommendations(req, res) {
    try {
      const rec = await recommendationRepository.getAll();
      res.json(rec);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new recommendationController();