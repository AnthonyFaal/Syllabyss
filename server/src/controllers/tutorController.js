// controllers/tutorController.js

const TutorService = require('../services/tutorService');
const { BaseRepository } = require('../utils/index');

class TutorController {
  constructor() {
    this.askBot = this.askBot.bind(this);

    // Initialize all repositories
    this.userRepo = new BaseRepository('users', 'user_id');
    this.interestRepo = new BaseRepository('user_interest_flows', 'interest_flow_id');
    this.skillRepo = new BaseRepository('user_skills', 'skill_id');
    this.courseRepo = new BaseRepository('courses', 'course_id');
    this.quizRepo = new BaseRepository('user_quiz_attempts', 'attempt_id');
  }

  async askBot(req, res) {
    try {
      console.log('=== Incoming Request ===');
      console.log('Body:', req.body);
      console.log('User:', req.user);
      console.log('=======================');

      const userId = req.user?.id;
      const { message } = req.body;

      if (!userId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Authenticated user and message are required',
        });
      }

      // Fetch all related data for the user
      const interests = await this.interestRepo.getAll({ user_id: userId });

      const [user, skills, recentCourse, latestQuiz] = await Promise.all([
        this.userRepo.getOne({ user_id: userId }),
        this.skillRepo.getAll({
          interest_flow_id: interests?.[0]?.interest_flow_id || null
        }),
        this.courseRepo.getOne({ user_id: userId }, 'created_at DESC'),
        this.quizRepo.getOne({ user_id: userId }, 'created_at DESC')
      ]);

      // Prepare context to pass to TutorService
      const context = {
        user: {
          name: user?.name || '',
          role: user?.role || '',
          level: user?.level || '',
          avatar: user?.profile_image || ''
        },
        interests,
        skills,
        recentCourse,
        latestQuiz
      };

      // Ask TutorService with full context
      const reply = await TutorService.handleMessage({
        userId,
        message,
        userContext: context
      });

      res.status(200).json({
        success: true,
        data: reply,
      });
    } catch (error) {
      console.error('[TutorController] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong while processing your request.',
        error: error.message,
      });
    }
  }
}

module.exports = new TutorController();
