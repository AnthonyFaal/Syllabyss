import React from "react";
import { FaClock, FaBook, FaPlay } from "react-icons/fa";
import "./courseCard.css";

const CourseCard = ({ course, onClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateProgress = () => {
    if (!course.deadline || !course.created_at) return 0;
    
    const createdDate = new Date(course.created_at);
    const deadlineDate = new Date(course.deadline);
    const now = new Date();
    
    const totalDuration = deadlineDate - createdDate;
    const elapsed = now - createdDate;
    
    return Math.min(100, (elapsed / totalDuration) * 100);
  };

  const getDeadlineStatus = () => {
    if (!course.deadline) return { text: "No deadline", color: "#6b7280" };
    
    const now = new Date();
    const deadlineDate = new Date(course.deadline);
    const progress = calculateProgress();
    
    if (now > deadlineDate) return { text: "Deadline passed", color: "#ef4444" };
    if (progress >= 90) return { text: `Due: ${formatDate(course.deadline)}`, color: "#ef4444" };
    if (progress >= 70) return { text: `Due: ${formatDate(course.deadline)}`, color: "#f59e0b" };
    return { text: `Due: ${formatDate(course.deadline)}`, color: "#10b981" };
  };

  const totalMaterials = course.modules?.reduce(
    (acc, module) => acc + (module.learning_materials?.length || 0), 0
  ) || 0;

  const deadlineStatus = getDeadlineStatus();

  return (
    <div className="course-card" onClick={onClick}>
      <div className="course-card-content">    
        <div className="course-card-header">
          <h3 className="course-card-title">{course.title}</h3>
          <span className={`difficulty-badge ${course.difficulty_level}`}>
            {course.difficulty_level}
          </span>
        </div>
        
        <p className="course-card-description">{course.description}</p>

        <div className="course-card-stats">
          <div className="stat-item">
            <FaBook className="stat-icon" />
            <span>{course.modules?.length || 0} Modules</span>
          </div>
          <div className="stat-item">
            <FaClock className="stat-icon" />
            <span>{course.estimated_duration} hrs</span>
          </div>
        </div>

        <div className="deadline-container">
          <div className="deadline-header">
            <FaClock className="deadline-icon" style={{ color: deadlineStatus.color }} />
            <span style={{ color: deadlineStatus.color }}>
              {deadlineStatus.text}
            </span>
          </div>
          {course.deadline && (
            <div className="progress-bar">
              <div 
                className="progress-fill deadline"
                style={{ 
                  width: `${calculateProgress()}%`, 
                  backgroundColor: deadlineStatus.color 
                }}
              ></div>
            </div>
          )}
        </div>

        <button className="course-card-btn">
          <FaPlay className="btn-icon" />
          {totalMaterials > 0 ? "Continue Learning" : "Start Learning"}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;