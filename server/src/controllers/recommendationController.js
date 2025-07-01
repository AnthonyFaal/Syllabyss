const { generateCourseRecommendation } = require('../services/content_generator');
const {BaseRepository} = require('../utils/index');
const courseRepository = new BaseRepository('courses');
const recommendationRepository = new BaseRepository('ai_recommendations');

class recommendationController {
    constructor() {
        this.createRecommendation = this.createRecommendation.bind(this);
        this.getRecommendations = this.getRecommendations.bind(this);
        this.acceptRecommendation = this.acceptRecommendation.bind(this);
        this.getRecommendationHistory = this.getRecommendationHistory.bind(this);
    }
  
    /*async createRecommendation(req, res) {
        try {
            const { course_id, type = 'next_course' } = req.body;

            if (!course_id) {
                return res.status(400).json({ success: false, message: 'course_id is required' });
            }

            // Get the completed course info
            const course = await courseRepository.getOne({ course_id });
            if (!course) {
                return res.status(404).json({ success: false, message: 'Course not found' });
            }

            const userId = course.user_id;

            // Get learning metrics for this user
            const metrics = await this._getUserMetrics(userId);

            // Generate prompt based on course + user metrics
            const prompt = 
                `I just completed the course titled "${course.title}" at ${course.difficulty_level} level.
                My average quiz score is ${metrics.quiz.averageScore.toFixed(1)}%.
                My weak areas include: ${metrics.quiz.weakAreas.join(', ') || 'none'}.
                I have completed ${metrics.courses.completedCourses} courses and have ${metrics.courses.inProgressCourses} in progress.
                I usually prefer ${metrics.courses.preferredDifficulty} level courses.
                Suggest a relevant course for me to take next.`;

            // Avoid duplicate recommendations
            const pastRecommendations = await recommendationRepository.getAll({ user_id: userId });

            // Generate a single course recommendation
            const recommendation = await generateCourseRecommendation(
                prompt,
                pastRecommendations,
                type
            );

            // Save the recommendation
            const savedRec = await recommendationRepository.create({
                user_id: userId,
                suggested_course_title: recommendation.suggested_course_title,
                suggested_course_description: recommendation.suggested_course_description,
                suggested_difficulty_level: recommendation.suggested_difficulty_level,
                suggested_estimated_duration: recommendation.suggested_estimated_duration,
                recommendation_type: recommendation.recommendation_type,
                reason: recommendation.reason,
                confidence_score: recommendation.confidence_score,
                is_accepted: false,
                created_at: new Date().toISOString()
            });

            return res.status(201).json({
                success: true,
                recommendation: savedRec
            });

        } catch (error) {
            console.error('Create recommendation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create recommendation',
                error: error.message
            });
        }
    }*/

     async createRecommendation(req, res) {
        try {
            const { course_id, type = 'next_course' } = req.body;

            if (!course_id) {
                return res.status(400).json({ success: false, message: 'course_id is required' });
            }

            // Get the completed course info
            const course = await courseRepository.getOne({ course_id });
            if (!course) {
                return res.status(404).json({ success: false, message: 'Course not found' });
            }

            const userId = course.user_id;

            // Get learning metrics for this user
            const metrics = await this._getUserMetrics(userId);

            // Generate prompt with specific focus on the completed course
            const prompt = 
                `I just completed the course titled "${course.title}" (ID: ${course_id}) at ${course.difficulty_level} level.
                Focus specifically on what would be the best immediate next step after this course.
                My average quiz score is ${metrics.quiz.averageScore.toFixed(1)}%.
                My weak areas include: ${metrics.quiz.weakAreas.join(', ') || 'none'}.
                I have completed ${metrics.courses.completedCourses} courses and have ${metrics.courses.inProgressCourses} in progress.
                I usually prefer ${metrics.courses.preferredDifficulty} level courses.
                Suggest only the most relevant course for me to take next.`;

            // Get past recommendations to avoid duplicates
            const pastRecommendations = await recommendationRepository.getAll({ 
                user_id: userId,
                is_accepted: false
            });

            // If user already has 2 unaccepted recommendations, return them
            if (pastRecommendations.length >= 2) {
                return res.status(200).json({
                    success: true,
                    message: 'User already has maximum unaccepted recommendations',
                    recommendations: pastRecommendations.slice(0, 2)
                });
            }

            // Generate a single focused recommendation
            const recommendation = await generateCourseRecommendation(
                prompt,
                pastRecommendations,
                type
            );

            // Save the recommendation
            const savedRec = await recommendationRepository.create({
                user_id: userId,
                suggested_course_title: recommendation.suggested_course_title,
                suggested_course_description: recommendation.suggested_course_description,
                suggested_difficulty_level: recommendation.suggested_difficulty_level,
                suggested_estimated_duration: recommendation.suggested_estimated_duration,
                recommendation_type: recommendation.recommendation_type,
                reason: recommendation.reason,
                confidence_score: recommendation.confidence_score,
                is_accepted: false,
                created_at: new Date().toISOString()
            });

            return res.status(201).json({
                success: true,
                recommendation: savedRec
            });

        } catch (error) {
            console.error('Create recommendation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create recommendation',
                error: error.message
            });
        }
    }
    // Get unaccepted recommendations for user (max 5, most recent first)
    async getRecommendations(req, res) {
        try {
            const userId = req.params.userId;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            // Use getWhere instead of getAll for complex queries
            const recommendations = await recommendationRepository.getWhere({
                user_id: userId,
                is_accepted: false
            }, {
                orderBy: 'created_at DESC',
                limit: 10
            });
            
            return res.status(200).json({
                success: true,
                recommendations
            });
            
        } catch (error) {
            console.error('Get recommendations error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get recommendations',
                error: error.message
            });
        }
    }

    // Accept a recommendation (mark it as accepted)
    async acceptRecommendation(req, res) {
        try {
            const { recommendationId } = req.params;
            const userId = req.user.id;
            
            // Verify the recommendation exists and belongs to the user
            const recommendation = await recommendationRepository.getOne({
                recommendation_id: recommendationId,
                user_id: userId
            });
            
            if (!recommendation) {
                return res.status(404).json({
                    success: false,
                    message: 'Recommendation not found'
                });
            }
            
            // Update the recommendation
           const updated = await recommendationRepository.update(recommendationId, {
            is_accepted: true,
            updated_at: new Date().toISOString()
           });

            
            return res.status(200).json({
                success: true,
                recommendation: updated
            });
            
        } catch (error) {
            console.error('Accept recommendation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to accept recommendation',
                error: error.message
            });
        }
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

    // Helper method to get user metrics
    async _getUserMetrics(userId) {
        // Implementation would query quiz attempts, courses, etc.
        // Return mock data for now
        return {
            quiz: {
                averageScore: 75,
                weakAreas: ['algebra', 'geometry']
            },
            courses: {
                completedCourses: 5,
                inProgressCourses: 2,
                preferredDifficulty: 'intermediate'
            }
        };
    }
}

module.exports = new recommendationController();