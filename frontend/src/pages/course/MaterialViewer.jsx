import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import ReactPlayer from 'react-player';
import { 
  FaChevronLeft, FaChevronRight, FaFilePdf, FaVideo, FaFileAlt, 
  FaCheck, FaTimes, FaEye, FaRedo 
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { submitQuizAnswers } from "../../api/APIs";
import './MaterialViewer.css';

const MaterialViewer = ({ material, onComplete, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isCompleted, setIsCompleted] = useState(material.completed);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  
  // Quiz-related states
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [latestAttempt, setLatestAttempt] = useState(null);

  const quiz = material.quizzes && material.quizzes.length > 0 ? material.quizzes[0] : null;
  
  
  useEffect(() => {
    if (quiz) {
      const maxAttempts = quiz.max_attempts || 1;
      const usedAttempts = quiz.latest_attempt ? quiz.latest_attempt.attempt_number : 0;
      setAttemptsLeft(Math.max(0, maxAttempts - usedAttempts));
      setLatestAttempt(quiz.latest_attempt);
      
      if (quiz.latest_attempt) {
        setQuizScore(parseFloat(quiz.latest_attempt.score));
        setQuizPassed(quiz.latest_attempt.passed);
        setQuizSubmitted(true);
        
        if (quiz.questions) {
          const answers = {};
          quiz.questions.forEach(q => {
            if (q.user_answer !== null) {
              answers[q.question_id] = q.user_answer;
            }
          });
          setQuizAnswers(answers);
        }
      }
    }
  }, [quiz]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePageChange = (newPage) => {
    setPageNumber(newPage);
    if (newPage === numPages && material.content_type === 'pdf' && (!quiz || quizPassed)) {
      handleComplete();
    }
  };

  const handleVideoEnded = () => {
    if (material.content_type === 'video' && (!quiz || quizPassed)) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (quiz && !quizSubmitted) {
      toast.warning("Please complete the quiz before marking this material as complete.");
      return;
    }
    if (quiz && quizSubmitted && !quizPassed) {
      toast.error("Your quiz score did not meet the passing criteria. Please retake the quiz.");
      return;
    }
    if (!isCompleted) {
      setIsCompleted(true);
      toast.success("Material marked as complete!");
      if (onComplete) onComplete(material);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizPassed(false);
    setQuizAnswers({});
    setShowAnswers(false);
  };

  const handleAnswerChange = (questionId, optionId) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

const handleQuizSubmit = async (e) => {
  e.preventDefault();
  if (!quiz) return;

  const unansweredQuestions = quiz.questions.filter(question => {
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      return !quizAnswers[question.question_id];
    }
    return false;
  });

  if (unansweredQuestions.length > 0) {
    toast.error(`Please answer all required questions (${unansweredQuestions.length} unanswered)`);
    return;
  }

  setIsSubmittingQuiz(true); // ✅ Start loading

  try {
    const answersPayload = quiz.questions.map((question) => {
      const selectedOptionId = quizAnswers[question.question_id];
      const isTextAnswer = question.question_type === 'text_input' || question.question_type === 'short_answer';
      return {
        question_id: question.question_id,
        selected_option_id: isTextAnswer ? null : selectedOptionId || null,
        answer_text: isTextAnswer ? quizAnswers[question.question_id] || '' : null,
      };
    });

    const response = await submitQuizAnswers(quiz.quiz_id, answersPayload);

    if (response?.data?.success) {
      const responseData = response.data.data || {};
      const score = parseFloat(responseData.score || 0);
      const passed = Boolean(responseData.passed);
      const attempt = responseData.attempt || {};

      setQuizScore(score);
      setQuizPassed(passed);
      setQuizSubmitted(true);
      setQuizStarted(false);
      setLatestAttempt(attempt);

      const maxAttempts = quiz.max_attempts || 1;
      const attemptNumber = attempt.attempt_number || (latestAttempt?.attempt_number || 0) + 1;
      setAttemptsLeft(Math.max(0, maxAttempts - attemptNumber));

      if (passed) {
        toast.success(`Quiz passed with score ${score}!`);
        handleComplete();
      } else {
        toast.warning(`Quiz score ${score} - please try again.`);
      }
    } else {
      toast.error(response?.data?.message || "Quiz submission failed. Please try again.");
    }
  } catch (error) {
    console.error("Error submitting quiz:", error);
    toast.error(error.response?.data?.message || "An error occurred while submitting the quiz.");
  } finally {
    setIsSubmittingQuiz(false); // ✅ End loading
  }
};

  const calculatePercentage = () => {
    if (!quiz || !quiz.questions) return 0;
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    return totalPoints > 0 ? Math.round((quizScore / totalPoints) * 100) : 0;
  };

  const getQuestionResult = (question) => {
    if (!quizSubmitted) return null;
    const isCorrect = question.is_correct;
    const earnedPoints = parseFloat(question.points_earned || 0);
    
    return (
      <span className={`question-result ${isCorrect ? 'correct' : 'incorrect'}`}>
        {isCorrect ? '✓' : '✗'} ({earnedPoints}/{question.points} pts)
      </span>
    );
  };

  const getCorrectAnswer = (question) => {
    if (!question.options) return null;
    const correctOption = question.options.find(opt => opt.is_correct);
    return correctOption ? correctOption.option_text : "No correct answer specified";
  };

  useEffect(() => {
    if (material.completed && !isCompleted) {
      setIsCompleted(true);
    }
  }, [material.completed]);

  return (
    <div className="inline-material-viewer">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="material-header">
        <div className="material-title">
          {material.content_type === 'video' && <FaVideo className="material-icon" />}
          {material.content_type === 'pdf' && <FaFilePdf className="material-icon" />}
          {material.content_type === 'article' && <FaFileAlt className="material-icon" />}
          <h3>{material.title}</h3>
        </div>
        {onClose && (
          <button className="close-material-button" onClick={onClose}>
            <FaTimes />
          </button>
        )}
      </div>
      
      <div className="material-content">
        {material.content_type === 'video' ? (
          <div className="video-container">
            <ReactPlayer 
              url={material.content_url}
              controls
              width="100%"
              height="400px"
              onEnded={handleVideoEnded}
            />
          </div>
        ) : (
          <div className="document-container">
            {material.content_type === 'pdf' ? (
              <>
                <div className="pdf-viewer">
                  <Document
                    file={material.content_url}
                    onLoadSuccess={onDocumentLoadSuccess}
                  >
                    <Page pageNumber={pageNumber} />
                  </Document>
                </div>
                <div className="pdf-controls">
                  <button 
                    onClick={() => handlePageChange(pageNumber - 1)}
                    disabled={pageNumber <= 1}
                  >
                    <FaChevronLeft />
                  </button>
                  <span>Page {pageNumber} of {numPages || '--'}</span>
                  <button 
                    onClick={() => handlePageChange(pageNumber + 1)}
                    disabled={pageNumber >= (numPages || 1)}
                  >
                    <FaChevronRight />
                  </button>
                </div>
              </>
            ) : (
              <div className="article-content">
                <iframe 
                  src={material.content_url} 
                  title={material.title}
                  className="article-iframe"
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="material-footer">
        <div className="material-meta">
          <span>Duration: {material.duration} minutes</span>
          {material.deadline && (
            <span>Deadline: {new Date(material.deadline).toLocaleDateString()}</span>
          )}
        </div>

        {/* Quiz Section */}
        {quiz && (
          <div className="quiz-section">
            <div className="quiz-status">
              {quizSubmitted && (
                <div className="score-display">
                  <div className={`score-value ${quizPassed ? 'passed' : 'failed'}`}>
                    Score: {quizScore.toFixed(1)} / {quiz.questions.reduce((sum, q) => sum + q.points, 0)}
                    <span className="percentage"> ({calculatePercentage()}%)</span>
                  </div>
                  <div className="attempts-info">
                    Attempt {latestAttempt?.attempt_number || 0} of {quiz.max_attempts}
                  </div>
                  {quizPassed ? (
                    <div className="pass-badge">PASSED</div>
                  ) : (
                    <div className="fail-badge">FAILED</div>
                  )}
                </div>
              )}
            </div>

            {(!quizStarted && attemptsLeft > 0) && (
              <button className="quiz-button" onClick={startQuiz}>
                {quizSubmitted ? <FaRedo /> : null}
                {quizSubmitted ? "Retake Quiz" : "Take Quiz"} 
                {attemptsLeft > 0 && (
                  <span className="attempts-left">
                    ({attemptsLeft} attempt{attemptsLeft > 1 ? 's' : ''} left)
                  </span>
                )}
              </button>
            )}

            {quizSubmitted && !quizStarted && (
              <button 
                className="show-answers-button" 
                onClick={() => setShowAnswers(!showAnswers)}
              >
                <FaEye /> {showAnswers ? "Hide Answers" : "Show Answers"}
              </button>
            )}

            {quizStarted && (
              <div className="quiz-container">
                <h4>{quiz.title}</h4>
                <p>{quiz.description}</p>
                <p className="passing-info">
                  Passing Score: <strong>{quiz.passing_score}</strong> out of {
                    quiz.questions.reduce((sum, q) => sum + q.points, 0)
                  } points
                </p>
                <form onSubmit={handleQuizSubmit}>
                  {quiz.questions.map((question) => (
                    <div key={question.question_id} className={`quiz-question ${showAnswers && quizSubmitted ? (question.is_correct ? 'correct-question' : 'incorrect-question') : ''}`}>
                      <p className="question-text">
                        {question.order_number}. {question.question_text}
                        {showAnswers && quizSubmitted && getQuestionResult(question)}
                      </p>
                      <div className="options-container">
                        {question.options.map((option) => (
                          <label key={option.option_id} className={`option-label ${showAnswers && quizSubmitted ? (option.is_correct ? 'correct-option' : '') : ''}`}>
                            <input
                              type={question.question_type === 'multiple_choice' || question.question_type === 'true_false' ? 'radio' : 'checkbox'}
                              name={`question_${question.question_id}`}
                              value={option.option_id}
                              checked={quizAnswers[question.question_id] === option.option_id}
                              onChange={() => handleAnswerChange(question.question_id, option.option_id)}
                              disabled={showAnswers && quizSubmitted}
                              required={question.question_type === 'multiple_choice' || question.question_type === 'true_false' 
                                ? !quizAnswers[question.question_id] 
                                : false}
                            />
                            <span className="option-text">{option.option_text}</span>
                            {showAnswers && quizSubmitted && option.is_correct && (
                              <span className="correct-answer-indicator">✓</span>
                            )}
                          </label>
                        ))}
                      </div>
                      {showAnswers && quizSubmitted && !question.is_correct && (
                        <div className="correct-answer-explanation">
                          <strong>Correct Answer:</strong> {getCorrectAnswer(question)}
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="submit" className="submit-quiz-button" disabled={isSubmittingQuiz}>
                    {isSubmittingQuiz ? "Submitting..." : "Submit Quiz"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Completion Controls */}
        {quiz ? (
          quizSubmitted && quizPassed && !isCompleted && (
            <button className="complete-button" onClick={handleComplete}>
              <FaCheck /> Mark as Complete
            </button>
          )
        ) : (
          !isCompleted && (
            <button className="complete-button" onClick={handleComplete}>
              <FaCheck /> Mark as Complete
            </button>
          )
        )}

        {isCompleted && (
          <div className="completion-badge">
            <FaCheck /> Completed
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialViewer;