import React, { useEffect, useState } from 'react';
import { overview, timetable } from "../api/APIs";
import PageLoader from "../components/Loader/pageLoader";
import { getUserId } from "../utils/authToken";

import { 
  FiBook, FiAward, FiCalendar, FiClock, FiTarget, FiTrendingUp, 
  FiStar, FiCheckCircle, FiBarChart2, FiFlag, FiBookmark, FiUsers, FiCoffee
} from 'react-icons/fi';
import "./Dashboard.css";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeTableData, setTimeTableData] = useState([]);
  const [error, setError] = useState(null);

useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = getUserId();
        // Fetch both data sources in parallel
        const [overviewResponse, timetableResponse] = await Promise.all([
          overview(userId),
          timetable(userId)
        ]);
        
        setDashboardData(overviewResponse);
        setTimeTableData(timetableResponse);
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!dashboardData) return <div className="no-data">No data available</div>;

  const stats = dashboardData.stats || {};
  const activeCourses = dashboardData.activeCourses || [];
  const progressData = dashboardData.progressData || [];
  const userGoals = dashboardData.userGoals || [];
  const recommendations = dashboardData.recommendations || [];
  const leaderboardPosition = dashboardData.leaderboardPosition ?? "N/A";
  const user = dashboardData.user || {};

  const formatTime = (timeStr) => {
  if (!timeStr) return '0 min';
  const parts = timeStr.split(':');
  if (parts.length < 2) return '0 min';

  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(mins)) return '0 min';

  return hours > 0 ? `${hours}: ${mins}` : `${mins}`;
};

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatCard = ({ icon, title, value, color }) => {
    const IconComponent = icon;
    return (
      <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
        <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
          <IconComponent size={20} />
        </div>
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      {/* User Profile Header */}
      <header className="dashboard-header">
        <div className="user-profile">
          <img 
            src={user.profileImage || "https://via.placeholder.com/150"} 
            alt="Profile" 
            className="profile-image"
          />
          <div className="user-info">
            <h1>{user.name || "Unknown User"}</h1>
            <p className="user-role">
              <span className="role-badge">{user.role || "N/A"}</span>
              <span className="welcome-message">Welcome back! Ready to learn today?</span>
            </p>
          </div>
        </div>
        <div className="quick-stats">
          <div className="quick-stat">
            <FiTrendingUp className="quick-stat-icon" />
            <span>Day {stats.currentStreak ?? 0} streak</span>
          </div>
          <div className="quick-stat">
            <FiAward className="quick-stat-icon" />
            <span>{stats.xpPoints ?? 0} XP</span>
          </div>
        </div>
      </header>

      {/* Stats Summary Cards */}
      <section className="stats-section">
        <h2><FiBarChart2 className="section-icon" /> Your Learning Stats</h2>
        <div className="stats-grid">
          <StatCard 
            icon={FiBook} 
            title="Courses in Progress" 
            value={stats.coursesInProgress ?? 0} 
            color="#4e73df" 
          />
          <StatCard 
            icon={FiCheckCircle} 
            title="Completion %" 
            value={`${stats.completionPercentage ?? 0}%`} 
            color="#1cc88a" 
          />
          <StatCard 
            icon={FiTarget} 
            title="Goals Completed" 
            value={stats.goalsCompleted ?? 0} 
            color="#f6c23e" 
          />
          <StatCard 
            icon={FiCalendar} 
            title="Current Streak" 
            value={`${stats.currentStreak ?? 0} days`} 
            color="#e74a3b" 
          />
          <StatCard 
            icon={FiStar} 
            title="Longest Streak" 
            value={`${stats.longestStreak ?? 0} days`} 
            color="#36b9cc" 
          />
          <StatCard 
            icon={FiAward} 
            title="Total XP" 
            value={stats.xpPoints ?? 0} 
            color="#5a5c69" 
          />
          <StatCard 
            icon={FiTrendingUp} 
            title="Weekly XP" 
            value={stats.weeklyXp ?? 0} 
            color="#858796" 
          />
          <StatCard 
            icon={FiClock} 
            title="Time Spent Today" 
            value={formatTime(stats.timeSpentToday)} 
            color="#f8f9fc" 
          />
          <StatCard 
            icon={FiBookmark} 
            title="Materials Completed" 
            value={stats.materialsCompleted ?? 0} 
            color="#2e59d9" 
          />
        </div>
      </section> 
      
       {/* Timetable Section - now using the local timeTableData state */}
      <div className="timetable-container">
        <h2><FiClock className="section-icon" /> Today's Schedule</h2>
        
        {timeTableData.length > 0 ? (
          <div className="timetable-events">
            {timeTableData.map((event, index) => (
              <div key={`${event.id}-${index}`} className={`timetable-event ${event.content_type}`}>
                <div className="event-time">
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </div>
                <div className="event-content">
                  <div className="event-icon">
                    {event.content_type === 'break' ? 
                      <FiCoffee className="content-icon" /> : 
                      <FiBook className="content-icon" />}
                  </div>
                  <div className="event-details">
                    <h3>{event.material_title}</h3>
                    {event.content_type !== 'break' && (
                      <>
                        <p className="event-course">{event.course_title}</p>
                        <p className="event-module">{event.module_title}</p>
                      </>
                    )}
                  </div>
                </div>
                {event.content_type !== 'break' && event.deadline && (
                  <div className="event-deadline">
                    <span>Due: {formatDate(event.deadline)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="timetable-empty">
            <p>No scheduled activities for today</p>
          </div>
        )}
      </div>

      {/* Active Courses Section */}
      <section className="courses-section">
        <h2><FiBook className="section-icon" /> Active Courses</h2>
        {activeCourses.length > 0 ? (
          <div className="courses-grid">
            {activeCourses.map(course => (
              <div key={course.course_id} className="course-card">
                <div className="course-header">
                  <div>
                    <h3>{course.title || "Untitled Course"}</h3>
                    <div className="course-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                      <span>{course.progress || 0}% complete</span>
                    </div>
                  </div>
                  <span className={`difficulty-badge ${course.difficulty_level || "unknown"}`}>
                    {course.difficulty_level || "N/A"}
                  </span>
                </div>
                <p className="course-description">{course.description || "No description available."}</p>
                <div className="course-meta">
                  <div className="meta-item">
                    <FiClock className="meta-icon" />
                    <div>
                      <span className="meta-label">Duration:</span>
                      <span>{course.estimated_duration ?? "N/A"} hours</span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <FiCalendar className="meta-icon" />
                    <div>
                      <span className="meta-label">Started:</span>
                      <span>{formatDate(course.started_at)}</span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <FiFlag className="meta-icon" />
                    <div>
                      <span className="meta-label">Deadline:</span>
                      <span>{formatDate(course.deadline)}</span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="status-container">
                      <span className="meta-label">Status:</span>
                      <span className={`status-badge ${course.status || "unknown"}`}>
                        {(course.status || "N/A").replace('_', ' ')}
                      </span>
                    </div>
                    <button className="continue-button">Continue</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FiBook className="empty-icon" size={48} />
            <p className="no-data-message">You don't have any active courses</p>
            <button className="browse-button">Browse Courses</button>
          </div>
        )}
      </section>

      {/* Progress Data Section */}
      <section className="progress-section">
        <h2><FiTrendingUp className="section-icon" /> Your Progress</h2>
        {progressData.length > 0 ? (
          <div className="progress-chart">
            <p>Progress chart would be displayed here</p>
          </div>
        ) : (
          <div className="empty-state">
            <FiBarChart2 className="empty-icon" size={48} />
            <p className="no-data-message">No progress data available yet</p>
          </div>
        )}
      </section>

      {/* User Goals Section */}
      <section className="goals-section">
        <h2><FiTarget className="section-icon" /> Your Goals</h2>
        {userGoals.length > 0 ? (
          <ul className="goals-list">
            {userGoals.map(goal => (
              <li key={goal.id} className="goal-item">
                <div className="goal-checkbox">
                  {goal.status === 'completed' ? (
                    <FiCheckCircle className="completed-icon" />
                  ) : (
                    <div className="incomplete-circle"></div>
                  )}
                </div>
                <div className="goal-content">
                  <h4>{goal.title || "Untitled Goal"}</h4>
                  <p className="goal-due-date">Due: {formatDate(goal.due_date)}</p>
                </div>
                <span className={`goal-status ${goal.status}`}>
                  {goal.status || "N/A"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <FiTarget className="empty-icon" size={48} />
            <p className="no-data-message">You haven't set any goals yet</p>
            <button className="add-goal-button">+ Add Goal</button>
          </div>
        )}
      </section>

      {/* Recommendations Section */}
        <section className="recommendations-section">
          <h2><FiStar className="section-icon" /> Recommended For You</h2>
          {recommendations.length > 0 ? (
            <div className="recommendations-grid">
              {recommendations.map(rec => (
                <div key={rec.recommendation_id} className="recommendation-card">
                  <div className="rec-image-placeholder">
                    <div className="confidence-badge">
                      {rec.confidence_score}% Match
                    </div>
                  </div>
                  <div className="rec-content">
                    <div className="rec-header">
                      <h3>{rec.suggested_course_title || "Untitled Recommendation"}</h3>
                      <span className={`rec-type ${rec.recommendation_type}`}>
                        {rec.recommendation_type}
                      </span>
                    </div>
                    <p className="rec-description">
                      {rec.suggested_course_description || "No description available."}
                    </p>
                    <div className="rec-meta">
                      <span className={`rec-difficulty ${rec.suggested_difficulty_level}`}>
                        {rec.suggested_difficulty_level || "Beginner"}
                      </span>
                      <span className="rec-duration">
                        {Math.round(rec.suggested_estimated_duration / 60)} hours
                      </span>
                      <span className="rec-date">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="rec-reason">
                      <strong>Why we recommend this:</strong> {rec.reason}
                    </div>
                    <div className="rec-actions">
                      <button className="accept-button">Accept Recommendation</button>
                      <button className="decline-button">Not Interested</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FiStar className="empty-icon" size={48} />
              <p className="no-data-message">No recommendations available yet</p>
            </div>
          )}
        </section>

      {/* Leaderboard Section */}
      <section className="leaderboard-section">
        <h2><FiUsers className="section-icon" /> Your Leaderboard Position</h2>
        <div className="leaderboard-card">
          <div className="trophy-icon">
            {leaderboardPosition <= 3 ? (
              <div className={`trophy-${leaderboardPosition}`}>
                {leaderboardPosition === 1 ? '🥇' : leaderboardPosition === 2 ? '🥈' : '🥉'}
              </div>
            ) : (
              <FiUsers size={40} />
            )}
          </div>
          <p className="leaderboard-position">#{leaderboardPosition}</p>
          <p className="leaderboard-message">Keep learning to improve your position!</p>
          <button className="view-leaderboard">View Full Leaderboard</button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;