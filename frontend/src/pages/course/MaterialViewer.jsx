import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import ReactPlayer from 'react-player';
import { 
  FaChevronLeft, FaChevronRight, FaFilePdf, FaVideo, FaFileAlt, 
  FaCheck, FaTimes, FaRedo, FaStar 
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { submitQuizAnswers, createFeedback, getFeedbackByCourse } from "../../api/APIs";
import './MaterialViewer.css';

const MaterialViewer = ({ material, courseId, onComplete, onClose }) => {
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
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [latestAttempt, setLatestAttempt] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
  
  useEffect(() => {
    if (courseId) {
      loadFeedback(courseId);
    }
  }, [courseId]);

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

    setIsSubmittingQuiz(true);

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
      setIsSubmittingQuiz(false);
    }
  };

  const calculatePercentage = () => {
    if (!quiz || !quiz.questions) return 0;
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    return totalPoints > 0 ? Math.round((quizScore / totalPoints) * 100) : 0;
  };

  useEffect(() => {
    if (material.completed && !isCompleted) {
      setIsCompleted(true);
    }
  }, [isCompleted, material.completed]);

  const loadFeedback = async (courseId) => {
    try {
      const res = await getFeedbackByCourse(courseId);

      if (res?.data?.success) {
        const userFeedback = res.data.data.find(f => f.is_user_feedback);
        if (userFeedback) {
          setExistingFeedback(userFeedback);
          setFeedbackRating(userFeedback.rating);
          setFeedbackComment(userFeedback.comment || "");
        }
      }
    } catch (err) {
      console.error("Error loading feedback:", err);
    }
  };

  useEffect(() => {
  if (courseId) {
    loadFeedback(courseId);
  }
}, [courseId]);

// ...

const handleFeedbackSubmit = async () => {
  if (feedbackRating < 1 || feedbackRating > 5) {
    toast.error("Please select a star rating between 1 and 5.");
    return;
  }
  if (!feedbackComment.trim()) {
    toast.error("Please write a comment.");
    return;
  }

  setIsSubmittingFeedback(true);
  try {
    const payload = {
      course_id: courseId, // ✅ use the passed courseId
      rating: feedbackRating,
      comment: feedbackComment.trim(),
    };
    const res = await createFeedback(payload);
    if (res?.data?.success) {
      toast.success("Thank you for your feedback!");
      setExistingFeedback(payload);
    } else {
      toast.error(res?.data?.message || "Failed to submit feedback.");
    }
  } catch (err) {
    console.error(err);
    toast.error("Error submitting feedback.");
  } finally {
    setIsSubmittingFeedback(false);
  }
};

  const renderStars = () => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <FaStar
            key={star}
            className={star <= feedbackRating ? "star filled" : "star"}
            onClick={() => {
              if (!existingFeedback) setFeedbackRating(star);
            }}
          />
        ))}
      </div>
    );
  };

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
                    <div key={question.question_id} className="quiz-question">
                      <p className="question-text">
                        {question.order_number}. {question.question_text}
                      </p>
                      <div className="options-container">
                        {question.options.map((option) => (
                          <label key={option.option_id} className="option-label">
                            <input
                              type={question.question_type === 'multiple_choice' || question.question_type === 'true_false' ? 'radio' : 'checkbox'}
                              name={`question_${question.question_id}`}
                              value={option.option_id}
                              checked={quizAnswers[question.question_id] === option.option_id}
                              onChange={() => handleAnswerChange(question.question_id, option.option_id)}
                              required={question.question_type === 'multiple_choice' || question.question_type === 'true_false' 
                                ? !quizAnswers[question.question_id] 
                                : false}
                            />
                            <span className="option-text">{option.option_text}</span>
                          </label>
                        ))}
                      </div>
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

      {/* Feedback Section */}
      {isCompleted && (
        <div className="feedback-section">
          <h4>Course Feedback</h4>
          {existingFeedback ? (
            <div className="feedback-display">
              <div className="feedback-stars">{renderStars()}</div>
              <p>{feedbackComment}</p>
              <small>You have already submitted feedback for this course.</small>
            </div>
          ) : (
            <div className="feedback-form">
              {renderStars()}
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Write your feedback..."
              />
              <button
                className="submit-feedback-button"
                onClick={handleFeedbackSubmit}
                disabled={isSubmittingFeedback}
              >
                {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MaterialViewer;