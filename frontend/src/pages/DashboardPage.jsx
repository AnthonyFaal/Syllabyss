/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { FaChartPie, FaBookOpen, FaTrophy, FaUsers, FaCalendarAlt, FaBell, FaSearch } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import { getUserById } from '../api/APIs'; 
import "./Dashboard.css";

const Dashboard = () => {
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Retrieve userId and token from localStorage
    const storedUserId = localStorage.getItem('userId');
    const storedToken = localStorage.getItem('token');

    if (storedUserId && storedToken) {
      setUserId(storedUserId);
      setToken(storedToken);
      fetchUserData(storedUserId); // Fetch user data
    } else {
      window.location.href = '/auth';
    }
  }, []);

  const fetchUserData = async (id) => {
    try {
      const response = await getUserById(id);
      setUserData(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  // Dummy data for stats and schedule
  const stats = {
    activeCourses: 5,
    challengesCompleted: 12,
    collaborationGroups: 3,
    learningProgress: 78
  };

  const weeklySchedule = [
    { day: "Mon", time: "09:00 - 10:30", course: "React Hooks Deep Dive", type: "live" },
    { day: "Tue", time: "14:00 - 15:00", course: "Data Structures", type: "self-paced" },
    { day: "Wed", time: "11:00 - 12:30", course: "UI/UX Workshop", type: "live" },
    { day: "Thu", time: "16:00 - 17:00", course: "Python Fundamentals", type: "self-paced" },
    { day: "Fri", time: "10:00 - 11:30", course: "DevOps Basics", type: "live" }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-profile">
          <FaBell className="notification-icon" />
          <div className="user-avatar">
            {userData?.profile_image ? (
              <img src={userData.profile_image} alt={userData.name || "User"} />
            ) : (
              <div className="avatar-placeholder">{userData?.name?.charAt(0)}</div>
            )}
          </div>
        </div>
        <div className="header-search">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search courses, resources..." />
        </div>
      </header>

      <div className="dashboard">
        <h1>Welcome back, {userData?.name?.split(' ')[0]}!</h1>
        <p className="dashboard-subtitle">Here's your learning overview</p>

        <div className="stats-grid">
          <div className="stat-card">
            <FaBookOpen className="stat-icon" />
            <h3>Active Courses</h3>
            <p>{stats.activeCourses}</p>
          </div>
          <div className="stat-card">
            <FaTrophy className="stat-icon" />
            <h3>Challenges Completed</h3>
            <p>{stats.challengesCompleted}</p>
          </div>
          <div className="stat-card">
            <FaUsers className="stat-icon" />
            <h3>Collaboration Groups</h3>
            <p>{stats.collaborationGroups}</p>
          </div>
          <div className="stat-card">
            <FaChartPie className="stat-icon" />
            <h3>Learning Progress</h3>
            <div className="progress-container">
              <p>{stats.learningProgress}%</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${stats.learningProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="content-section schedule-section">
            <div className="section-header">
              <FaCalendarAlt className="section-icon" />
              <h2>Your Weekly Schedule</h2>
            </div>
            <div className="schedule-grid">
              {weeklySchedule.map((item, index) => (
                <div key={index} className="schedule-item">
                  <div className="schedule-day">{item.day}</div>
                  <div className="schedule-time">{item.time}</div>
                  <div className="schedule-course">{item.course}</div>
                  <span className={`schedule-type ${item.type}`}>
                    {item.type === 'live' ? 'Live Session' : 'Self-Paced'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Add Admin Panel Link if User is Admin */}
          {userData?.role === 'admin' && (
            <div className="admin-panel-access">
              <h2>Admin Panel</h2>
              <p>You have access to the admin panel.</p>
              {/* Link to Admin Panel */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;