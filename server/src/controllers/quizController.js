const { BaseRepository, validateEntity } = require('../utils/index');
const leaderboard = require('./leaderBoardController');

const quizRepo = new BaseRepository('quizzes', 'quiz_id');
const questionRepo = new BaseRepository('questions', 'question_id');
const optionRepo = new BaseRepository('question_options', 'option_id');
const attemptRepo = new BaseRepository('user_quiz_attempts', 'attempt_id');
const answerRepo  = new BaseRepository('user_answers', 'answer_id');

class UserQuizController {

async getQuizAttemptStatus(req, res) {
  try {
    const { quiz_id } = req.params;
    const user_id = req.user?.user_id;

    // Get quiz details
    const quiz = await quizRepo.getById(quiz_id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    // Get all user attempts
    const attempts = await attemptRepo.getAll({ quiz_id, user_id });
    const remainingAttempts = Math.max(0, quiz.max_attempts - attempts.length);

    // Get latest attempt
    const latestAttempt = attempts.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0];

    // Get all questions for this quiz
    const allQuestions = await questionRepo.getAll({ quiz_id });
    
    let responseData = {
      quiz: {
        ...quiz,
        total_questions: allQuestions.length,
        total_points: allQuestions.reduce((sum, q) => sum + q.points, 0)
      },
      latest_attempt: null,
      remaining_attempts: remainingAttempts,
      questions: []
    };

    if (latestAttempt) {
      // Get all answers for this attempt
      const allAnswers = await answerRepo.getAll({ attempt_id: latestAttempt.attempt_id });

      // Prepare detailed questions with user answers
      responseData.questions = await Promise.all(
        allQuestions.map(async (question) => {
          const userAnswer = allAnswers.find(a => a.question_id === question.question_id);
          const options = await optionRepo.getAll({ question_id: question.question_id });

          // Format response based on question type
          let answerDetails = {
            question_id: question.question_id,
            question_text: question.question_text,
            question_type: question.question_type,
            points: question.points,
            options: question.question_type !== 'short_answer' ? options : undefined,
            user_answer: null,
            is_correct: false,
            points_earned: 0,
            correct_answer: null
          };

          if (userAnswer) {
            answerDetails.is_correct = userAnswer.is_correct;
            answerDetails.points_earned = userAnswer.points_earned;
            
            // Handle different question types
            switch (question.question_type) {
              case 'multiple_choice':
              case 'true_false':
                const selectedOption = options.find(o => o.option_id === userAnswer.selected_option_id);
                answerDetails.user_answer = selectedOption ? selectedOption.option_text : null;
                answerDetails.correct_answer = options.find(o => o.is_correct)?.option_text;
                break;

              case 'short_answer':
                answerDetails.user_answer = userAnswer.answer_text;
                // For short answer, correct answers are in options (multiple possible correct answers)
                answerDetails.correct_answer = options.filter(o => o.is_correct).map(o => o.option_text);
                break;

              case 'matching':
                answerDetails.user_answer = userAnswer.answer_text || 
                  (userAnswer.selected_option_id 
                    ? options.find(o => o.option_id === userAnswer.selected_option_id)?.option_text 
                    : null);
                answerDetails.correct_answer = options.filter(o => o.is_correct).map(o => o.option_text);
                break;
            }
          }

          return answerDetails;
        })
      );

      responseData.latest_attempt = {
        ...latestAttempt,
        passed: latestAttempt.score >= quiz.passing_score
      };
    } else {
      // If no attempt yet, still return all questions (without answers)
      responseData.questions = allQuestions.map(async question => ({
        question_id: question.question_id,
        question_text: question.question_text,
        question_type: question.question_type,
        points: question.points,
        options: question.question_type !== 'short_answer' 
          ? await optionRepo.getAll({ question_id: question.question_id })
          : undefined
      }));
    }

    return res.json({
      success: true,
      data: responseData
    });
  } catch (err) {
    console.error('❌ getQuizAttemptStatus Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async answerQuiz(req, res) {
  try {
    const { quiz_id } = req.params;
    const user_id = req.user?.id; // Make sure this matches your auth structure
    const { answers } = req.body;

    console.log('📝 answerQuiz called for user:', user_id, 'quiz:', quiz_id);

    if (!Array.isArray(answers) || answers.length === 0) {
      console.log('⚠️ No answers provided');
      return res.status(400).json({ success: false, message: 'Answers are required.' });
    }

    const quiz = await quizRepo.getById(quiz_id);
    if (!quiz) {
      console.log('❌ Quiz not found:', quiz_id);
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }
    console.log('📋 Quiz found:', quiz.title);

    // Get user attempts
    const userAttempts = await attemptRepo.getAll({ quiz_id, user_id });
    const currentAttempts = userAttempts.length;

    console.log(`🔢 Current attempts for user: ${currentAttempts} / max allowed: ${quiz.max_attempts}`);

    if (currentAttempts >= quiz.max_attempts) {
      console.log('🚫 Maximum attempts reached');
      return res.status(403).json({ success: false, message: 'Maximum attempts reached.' });
    }

    const isFirstAttempt = currentAttempts === 0;

    // Create new attempt record
    const attempt = await attemptRepo.create({
      quiz_id,
      user_id,
      attempt_number: currentAttempts + 1
    });
    console.log('🆕 Created new attempt with ID:', attempt.attempt_id);

    let totalScore = 0;

    for (const ans of answers) {
      const question = await questionRepo.getById(ans.question_id);
      if (!question || question.quiz_id !== quiz.quiz_id) {
        console.log(`⚠️ Question not found or not part of quiz: ${ans.question_id}`);
        continue;
      }

      let isCorrect = false;
      let pointsEarned = 0;

      if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        const selectedOption = await optionRepo.getById(ans.selected_option_id);
        if (selectedOption && selectedOption.is_correct) {
          isCorrect = true;
          pointsEarned = question.points;
          totalScore += pointsEarned;
        }
      } else if (question.question_type === 'short_answer') {
        // You can implement NLP matching here later
        isCorrect = false;
        pointsEarned = 0;
      }

      await answerRepo.create({
        attempt_id: attempt.attempt_id,
        question_id: question.question_id,
        selected_option_id: ans.selected_option_id || null,
        answer_text: ans.answer_text || null,
        is_correct: isCorrect,
        points_earned: pointsEarned
      });

      console.log(`➡️ Answer recorded: QID ${question.question_id}, Correct: ${isCorrect}, Points: ${pointsEarned}`);
    }

    // Complete attempt with total score
    await attemptRepo.update(attempt.attempt_id, {
      score: totalScore,
      status: 'completed',
      end_time: new Date()
    });
    console.log(`✅ Attempt completed. Total Score: ${totalScore}`);

    const passed = totalScore >= quiz.passing_score;
    console.log(`🏆 Passed status: ${passed}`);

    // Add XP to leaderboard using totalScore as XP, if first attempt and passed
    if (isFirstAttempt && passed) {
        console.log(`🎉 Adding XP (${totalScore}) to leaderboard for user ${user_id}`);
        try {
          await leaderboard.updateLeaderboardXP(user_id, totalScore);
        } catch (error) {
          console.error('Failed to update leaderboard XP:', error);
          // Continue with the response even if leaderboard update fails
        }
      }

    return res.json({
      success: true,
      message: `Quiz completed. ${passed ? 'You passed!' : 'You did not pass.'}`,
      data: {
        attempt_id: attempt.attempt_id,
        score: totalScore,
        passed,
        isFirstAttempt,
        xpAdded: isFirstAttempt && passed
      }
    });
  } catch (err) {
    console.error('❌ Error in answerQuiz:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
}

module.exports = new UserQuizController();
