const {BaseRepository, validateEntity } = require('../utils/index');

const questionRepo = new BaseRepository('questions');
const optionRepo = new BaseRepository('question_options');
const attemptRepo = new BaseRepository('user_quiz_attempts');
const answerRepo = new BaseRepository('user_answers');


const quizController = {
  createQuestion: async (req, res) => {
    try {
      await validateEntity('question.create', req.body);
      const question = await questionRepo.create(req.body);
      res.status(201).json({ success: true, data: question });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  getQuestionsByQuiz: async (req, res) => {
    try {
      const { quiz_id } = req.params;
      const questions = await questionRepo.getAll({ quiz_id });
      res.json({ success: true, data: questions });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  createOption: async (req, res) => {
    try {
      await validateEntity('questionOption.create', req.body);
      const option = await optionRepo.create(req.body);
      res.status(201).json({ success: true, data: option });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  getOptionsByQuestion: async (req, res) => {
    try {
      const { question_id } = req.params;
      const options = await optionRepo.getAll({ question_id });
      res.json({ success: true, data: options });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  createAttempt: async (req, res) => {
    try {
      const attempt = await attemptRepo.create(req.body);
      res.status(201).json({ success: true, data: attempt });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  getAttemptsByUser: async (req, res) => {
    try {
      const { user_id } = req.params;
      const attempts = await attemptRepo.getAll({ user_id });
      res.json({ success: true, data: attempts });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  createAnswer: async (req, res) => {
    try {
      const answer = await answerRepo.create(req.body);
      res.status(201).json({ success: true, data: answer });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  getAnswersByAttempt: async (req, res) => {
    try {
      const { attempt_id } = req.params;
      const answers = await answerRepo.getAll({ attempt_id });
      res.json({ success: true, data: answers });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};


module.exports = quizController;