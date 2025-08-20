import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactPlayer from 'react-player';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { submitQuizAnswers, 
  createFeedback, 
  getFeedbackByCourse, 
  getCourseModules, 
  getCourseById, 
  updateModule 
} from "../../api/APIs";
import { 
  FaClock, FaStar, FaBook,
  FaVideo, FaFileAlt, FaCheck, FaTimes, FaRedo, FaFilePdf 
} from 'react-icons/fa';
import './MaterialViewer.css';

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Tell pdfjs where the worker file is
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const MaterialViewer = ({ courseId, onClose }) => {
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  
  // PDF states
  const [numPages, setNumPages] = useState(null);
  const [, setPageNumber] = useState(1);
  
  // General states
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Quiz states
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [latestAttempt, setLatestAttempt] = useState(null);
  
  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
 
  // Memoized data fetching functions
  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      // Fetch course details and modules in parallel
      const [courseRes, modulesRes, feedbackRes] = await Promise.all([
        getCourseById(courseId),
        getCourseModules(courseId),
        getFeedbackByCourse(courseId)
      ]);
      
      if (courseRes?.data?.success) {
        setCourse(courseRes.data.data);
      }
      
      if (modulesRes?.data?.success) {
        const modulesData = modulesRes.data.data;
        setModules(modulesData);
        
        // Set the first material of the first module as default
        if (modulesData.length > 0) {
          const firstModule = modulesData[0];
          setCurrentModule(firstModule);
          if (firstModule.learning_materials.length > 0) {
            const firstMaterial = firstModule.learning_materials[0];
            setCurrentMaterial(firstMaterial);
            setIsCompleted(firstMaterial.completed || false);
          }
        }
      }
      
      if (feedbackRes?.data?.success) {
        const userFeedback = feedbackRes.data.data.find(f => f.is_user_feedback);
        if (userFeedback) {
          setExistingFeedback(userFeedback);
          setFeedbackRating(userFeedback.rating);
          setFeedbackComment(userFeedback.comment || "");
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load course data");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // Load course data and modules
  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Initialize quiz when material changes
  useEffect(() => {
    if (!currentMaterial || !currentMaterial.quizzes || currentMaterial.quizzes.length === 0) {
      setQuizStarted(false);
      setQuizSubmitted(false);
      setQuizScore(0);
      setQuizPassed(false);
      setQuizAnswers({});
      return;
    }
    
    const quiz = currentMaterial.quizzes[0];
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
          if (q.user_answer !== null) answers[q.question_id] = q.user_answer;
        });
        setQuizAnswers(answers);
      }
    } else {
      setQuizScore(0);
      setQuizPassed(false);
      setQuizSubmitted(false);
      setQuizAnswers({});
    }
    
    setQuizStarted(false);
  }, [currentMaterial]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };


  const handleVideoEnded = () => {
    if (currentMaterial.content_type === 'video' && (!currentMaterial.quizzes || currentMaterial.quizzes.length === 0 || quizPassed)) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!currentMaterial) return;
    
    const quiz = currentMaterial.quizzes && currentMaterial.quizzes.length > 0 ? currentMaterial.quizzes[0] : null;
    
    if (quiz && !quizSubmitted) {
      toast.warning("Please complete the quiz before marking this material as complete.");
      return;
    }
    
    if (quiz && quizSubmitted && !quizPassed) {
      toast.error("Quiz not passed. Please retake the quiz.");
      return;
    }
    
    if (!isCompleted) {
      setIsCompleted(true);
      toast.success("Material marked as complete!");
      
      try {
        // Update the material's completed status in the modules state
        const updatedModules = modules.map(module => {
          if (module.module_id === currentModule.module_id) {
            const updatedMaterials = module.learning_materials.map(mat => 
              mat.material_id === currentMaterial.material_id 
                ? { ...mat, completed: true } 
                : mat
            );
            
            const allCompleted = updatedMaterials.every(m => m.completed);
            
            return {
              ...module,
              learning_materials: updatedMaterials,
              is_complete: allCompleted || module.is_complete
            };
          }
          return module;
        });
        
        setModules(updatedModules);
        
        // Update the module completion status in the backend if needed
        const currentModuleUpdated = updatedModules.find(m => m.module_id === currentModule.module_id);
        if (currentModuleUpdated.is_complete && !currentModule.is_complete) {
          await updateModule(currentModule.module_id, { is_complete: true });
        }
        
      } catch (err) {
        console.error("Error updating completion status:", err);
        toast.error("Failed to update completion status");
      }
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
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (!currentMaterial || !currentMaterial.quizzes || currentMaterial.quizzes.length === 0) return;
    
    const quiz = currentMaterial.quizzes[0];
    const unanswered = quiz.questions.filter(q => 
      (q.question_type === 'multiple_choice' || q.question_type === 'true_false') && 
      !quizAnswers[q.question_id]
    );
    
    if (unanswered.length > 0) {
      toast.error(`Please answer all required questions (${unanswered.length} unanswered)`);
      return;
    }
    
    setIsSubmittingQuiz(true);
    try {
      const answersPayload = quiz.questions.map(q => ({
        question_id: q.question_id,
        selected_option_id: q.question_type === 'text_input' ? null : quizAnswers[q.question_id] || null,
        answer_text: ['text_input','short_answer'].includes(q.question_type) ? quizAnswers[q.question_id] || '' : null
      }));
      
      const res = await submitQuizAnswers(quiz.quiz_id, answersPayload);
      if (res?.data?.success) {
        const data = res.data.data || {};
        setQuizScore(parseFloat(data.score || 0));
        setQuizPassed(Boolean(data.passed));
        setQuizSubmitted(true);
        setQuizStarted(false);
        setLatestAttempt(data.attempt || null);
        
        const maxAttempts = quiz.max_attempts || 1;
        const attemptNumber = data.attempt?.attempt_number || (latestAttempt?.attempt_number || 0) + 1;
        setAttemptsLeft(Math.max(0, maxAttempts - attemptNumber));
        
        if (data.passed) {
          handleComplete();
        }
      } else {
        toast.error(res?.data?.message || "Quiz submission failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting quiz");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackRating < 1 || feedbackRating > 5 || !feedbackComment.trim()) {
      toast.error("Please provide a valid rating (1-5 stars) and comment");
      return;
    }
    
    setIsSubmittingFeedback(true);
    try {
      const payload = {
        course_id: courseId,
        rating: feedbackRating,
        comment: feedbackComment.trim()
      };
      
      const res = await createFeedback(payload);
      if (res?.data?.success) {
        toast.success("Thank you for your feedback!");
        setExistingFeedback(payload);
      } else {
        toast.error(res?.data?.message || "Failed to submit feedback");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const renderStars = () => (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <FaStar 
          key={star} 
          className={star <= feedbackRating ? "star filled" : "star"} 
          onClick={() => !existingFeedback && setFeedbackRating(star)} 
        />
      ))}
    </div>
  );

  const calculatePercentage = () => {
    if (!currentMaterial || !currentMaterial.quizzes || currentMaterial.quizzes.length === 0) return 0;
    
    const quiz = currentMaterial.quizzes[0];
    if (!quiz.questions) return 0;
    
    const total = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    return total > 0 ? Math.round((quizScore / total) * 100) : 0;
  };

  const handleMaterialChange = (module, material) => {
    setCurrentModule(module);
    setCurrentMaterial(material);
    setIsCompleted(material.completed || false);
    setPageNumber(1);
    setNumPages(null); // Reset numPages when changing material
  };

  // Check if article is actually a PDF file
  const isArticlePDF = (material) => {
    if (!material || material.content_type !== 'article') return false;
    
    // Check if the URL ends with .pdf or contains pdf in the path
    const url = material.content_url || '';
    return url.toLowerCase().includes('.pdf') || 
           url.toLowerCase().includes('/pdf/') || 
           url.toLowerCase().includes('pdf=true');
  };

  if (loading) {
    return <div className="material-viewer-loading">Loading course content...</div>;
  }

  if (!course || !currentMaterial) {
    return <div className="material-viewer-error">No course or material data available</div>;
  }

  const quiz = currentMaterial.quizzes && currentMaterial.quizzes.length > 0 ? currentMaterial.quizzes[0] : null;
  const isPDF = isArticlePDF(currentMaterial);

  return (
    <div className="inline-material-viewer">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {/* Course Header */}
      <div className="course-head">
        {/* Title + Description Column */}
        <div className="course-header-top">
          <h2>{course.title}</h2>
          <p className="course-description">{course.description}</p>
        </div>

        {/* Metadata Row */}
        <div className="course-meta">
          <span className={`difficulty ${course.difficulty_level.toLowerCase()}`}>
            <FaStar /> {course.difficulty_level.charAt(0).toUpperCase() + course.difficulty_level.slice(1)}
          </span>
          <span className="duration">
            <FaClock /> {course.estimated_duration} hrs
          </span>
          <span className={`status ${course.status}`}>
            <FaBook /> {course.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="material-main-content">
        {/* Module and Material Navigation */}
        <div className="material-navigation">
          <div className="module-selector">
            <h4>Modules</h4>
            <ul>
              {modules.map(module => (
                <li key={module.module_id} className={currentModule?.module_id === module.module_id ? 'active' : ''}>
                  <button onClick={() => handleMaterialChange(module, module.learning_materials[0])}>
                    {module.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="material-selector">
            <h4>Materials</h4>
            <ul>
              {currentModule?.learning_materials.map(material => (
                <li key={material.material_id} className={currentMaterial?.material_id === material.material_id ? 'active' : ''}>
                  <button onClick={() => handleMaterialChange(currentModule, material)}>
                    {material.content_type === 'video' && <FaVideo />}
                    {material.content_type === 'article' && (isArticlePDF(material) ? <FaFilePdf /> : <FaFileAlt />)}
                    {material.title}
                    {material.completed && <FaCheck className="completed-icon" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Current Material Content */}
        <div className="material-content-container">
          <div className="material-header">
            <div className="material-title">
              {currentMaterial.content_type === 'video' && <FaVideo className="material-icon" />}
              {currentMaterial.content_type === 'article' && (
                isPDF ? <FaFilePdf className="material-icon" /> : <FaFileAlt className="material-icon" />
              )}
              <h3>{currentMaterial.title}</h3>
            </div>
            {onClose && <button className="close-material-button" onClick={onClose}><FaTimes /></button>}
          </div>
          
          <div className="material-content">
            {currentMaterial.content_type === 'video' ? (
              <ReactPlayer 
                url={currentMaterial.content_url} 
                controls 
                width="100%" 
                height="400px" 
                onEnded={handleVideoEnded} 
              />
            ) : isPDF ? (
              // PDF Viewer with react-pdf - scrollable
              <div className="pdf-viewer-container">
                <div className="pdf-document scrollable">
                  <Document
                    file={currentMaterial.content_url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading="Loading PDF..."
                  >
                    {Array.from(new Array(numPages), (el, index) => (
                      <Page 
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        width={800}
                        loading="Loading page..."
                      />
                    ))}
                  </Document>
                </div>
                <div className="pdf-info">
                  <span>{numPages || '--'} pages</span>
                </div>
              </div>
            ) : (
              // Regular article content (not PDF)
              <iframe 
                src={currentMaterial.content_url} 
                title={currentMaterial.title} 
                className="document-iframe"
                sandbox="allow-same-origin allow-scripts"
              />
            )}
          </div>
          
          {/* Quiz Section */}
          {quiz && (
            <div className="quiz-section">
              <h4>{quiz.title}</h4>
              <p>{quiz.description}</p>
              
              {quizSubmitted && (
                <div className={`score-display ${quizPassed ? 'passed' : 'failed'}`}>
                  Score: {quizScore.toFixed(1)} / {quiz.questions.reduce((sum, q) => sum + q.points, 0)} 
                  ({calculatePercentage()}%) - {quizPassed ? "PASSED" : "FAILED"}
                  <br />
                  Passing Score: {quiz.passing_score}%
                  {latestAttempt && (
                    <div className="attempt-info">
                      Attempt #{latestAttempt.attempt_number} - {new Date(latestAttempt.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
              
              {!quizStarted && attemptsLeft > 0 && (
                <button onClick={startQuiz} className="start-quiz-button">
                  {quizSubmitted ? <><FaRedo /> Retake Quiz</> : "Take Quiz"} 
                  <span>({attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left)</span>
                </button>
              )}
              
              {quizStarted && (
                <form onSubmit={handleQuizSubmit} className="quiz-form">
                  {quiz.questions.map(q => (
                    <div key={q.question_id} className="question">
                      <p className="question-text">{q.order_number}. {q.question_text}</p>
                      {q.options.map(opt => (
                        <label key={opt.option_id} className="option">
                          <input
                            type="radio"
                            name={`q_${q.question_id}`}
                            value={opt.option_id}
                            checked={quizAnswers[q.question_id] === opt.option_id}
                            onChange={() => handleAnswerChange(q.question_id, opt.option_id)}
                          />
                          {opt.option_text}
                        </label>
                      ))}
                    </div>
                  ))}
                  <button 
                    type="submit" 
                    disabled={isSubmittingQuiz}
                    className="submit-quiz-button"
                  >
                    {isSubmittingQuiz ? "Submitting..." : "Submit Quiz"}
                  </button>
                </form>
              )}
            </div>
          )}
          
          {/* Completion */}
          <div className="completion-section">
            {!isCompleted ? (
              <button onClick={handleComplete} className="complete-button">
                <FaCheck /> Mark as Complete
              </button>
            ) : (
              <div className="completion-badge">
                <FaCheck /> Completed
              </div>
            )}
          </div>
          
          {/* Feedback */}
          {isCompleted && (
            <div className="feedback-section">
              <h4>Course Feedback</h4>
              {existingFeedback ? (
                <div className="existing-feedback">
                  <div className="feedback-rating">
                    {renderStars()}
                    <span>{existingFeedback.rating} stars</span>
                  </div>
                  <p className="feedback-comment">{feedbackComment}</p>
                  <small>You already submitted feedback on {new Date(existingFeedback.created_at).toLocaleDateString()}</small>
                </div>
              ) : (
                <div className="new-feedback">
                  <div className="feedback-rating">
                    <span>Rating: </span>
                    {renderStars()}
                  </div>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Write your feedback about this course..."
                    className="feedback-textarea"
                  />
                  <button 
                    onClick={handleFeedbackSubmit} 
                    disabled={isSubmittingFeedback}
                    className="submit-feedback-button"
                  >
                    {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialViewer;