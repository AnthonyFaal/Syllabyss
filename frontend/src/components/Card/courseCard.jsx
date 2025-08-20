import React from "react";
import { FaClock, FaBook, FaPlay } from "react-icons/fa";
import "./courseCard.css";

const CourseCard = ({ course, onClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDeadlineStatus = () => {
    if (!course.deadline) return { text: "No deadline", color: "#6b7280" };
    const now = new Date();
    const deadlineDate = new Date(course.deadline);
    const timeRemaining = deadlineDate - now;
    const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

    if (now > deadlineDate) return { text: "Deadline passed", color: "#ef4444" };
    if (daysRemaining <= 1) return { text: `Due: ${formatDate(course.deadline)}`, color: "#ef4444" };
    if (daysRemaining <= 3) return { text: `Due: ${formatDate(course.deadline)}`, color: "#f59e0b" };
    return { text: `Due: ${formatDate(course.deadline)}`, color: "#10b981" };
  };

  const getStatusText = () => { 
    switch (course.status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return "Not Started";
    }
  };
  
  const deadlineStatus = getDeadlineStatus();
  const statusText = getStatusText();

  const totalModules = course.total_module_count ?? 0;
  const completedModules = course.completed_module_count ?? 0;

  return (
    <div
      className="course-card"
      onClick={() => onClick(course)} // pass the course object to parent
    >
      <div className="course-card-content">
        <div className="course-card-header">
          <h3 className="course-card-title">{course.title}</h3>
          <span className={`difficulty-badge ${course.difficulty_level}`}>{course.difficulty_level}</span>
        </div>

        <p className="course-card-description">{course.description}</p>

        <div className="course-card-stats">
          <div className="stat-item">
            <FaBook className="stat-icon" />
            <span>{completedModules}/{totalModules} Modules</span>
          </div>
          <div className="stat-item">
            <FaClock className="stat-icon" />
            <span>{course.estimated_duration} hrs</span>
          </div>
          <div className="stat-item">
            <span className={`status-badge ${course.status}`}>{statusText}</span>
          </div>
        </div>

        <div className="deadline-container">
          <div className="deadline-header">
            <FaClock className="deadline-icon" style={{ color: deadlineStatus.color }} />
            <span style={{ color: deadlineStatus.color }}>{deadlineStatus.text}</span>
          </div>
          {course.deadline && (
            <div className="progress-bar">
              <div
                className="progress-fill deadline"
                style={{
                  width: `${course.progress || 0}%`,
                  backgroundColor: deadlineStatus.color,
                }}
              />
            </div>
          )}
        </div>

        <button
          className="course-card-btn"
          onClick={(e) => {
            e.stopPropagation(); // prevent double triggering
            onClick(course); // open modal
          }}
        >
          <FaPlay className="btn-icon" />
          {course.status === "completed"
            ? "View Course"
            : course.status === "in_progress"
            ? "Continue Learning"
            : "Start Learning"}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
