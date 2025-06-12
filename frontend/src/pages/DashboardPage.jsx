/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { FaChartPie, FaBookOpen, FaTrophy, FaUsers, FaCalendarAlt, FaBell, FaSearch } from "react-icons/fa";
import { getUserById } from '../api/APIs';
import PageLoader from '../components/Loader/pageLoader';
import {getAuthToken, getUserId}  from '../utils/authToken';
import "./Dashboard.css";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getUserId();
    const token = getAuthToken();

    if (id) {
      fetchUserData(id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (id) => {
    try {
      setLoading(true);
      const response = await getUserById(id);
      setUserData(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return <PageLoader />;
  }
  if (!userData) {
    return <p>Unable to load user data.</p>;
  }

  return (
    <div className="dashboard-container">
      {loading && <PageLoader />}
      
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

          {userData?.role === 'admin' && (
            <div className="admin-panel-access">
              <h2>Admin Panel</h2>
              <p>You have access to the admin panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;