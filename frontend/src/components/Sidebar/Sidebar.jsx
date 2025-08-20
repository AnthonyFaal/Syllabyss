import { NavLink } from "react-router-dom";
import {
  FaBook,
  FaUserShield,
  FaComment,
  FaLayerGroup,
  FaChartPie,
  FaUsers,
  FaTrophy,
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaBullhorn, // New icon for announcements
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import ChatAssistant from "../Chatbot/ChatAssistant";
import {clearAuthToken} from '../../utils/authToken';
import { askTutor, getMe} from '../../api/APIs';
import "./Sidebar.css";

const Sidebar = ({ children }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChat, setShowChat] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [userRole, setUserRole] = useState(null); // <-- store role here

  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: "System Maintenance",
      content: "There will be scheduled maintenance on July 25th from 2-4 AM.",
      date: "2025-08-20",
      isNew: true
    },
    {
      id: 2,
      title: "New Features Added",
      content: "Check out the new collaboration tools in the platform!",
      date: "2025-08-15",
      isNew: false
    }
  ]);

  // Fetch user role on mount
  useEffect(() => {
    getMe()
      .then(res => {
        setUserRole(res.role);
      })
      .catch(() => {
        setUserRole(null);
      });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
 
  const handleLogout = () => {
    clearAuthToken(); 
    if (isMobile) {
      setIsOpen(false); 
    }
    navigate('/auth', { replace: true }); 
    window.location.reload(); 
  };

  const markAsRead = (id) => {
    setAnnouncements(announcements.map(ann => 
      ann.id === id ? {...ann, isNew: false} : ann
    ));
  };

  const tabs = [
    { label: "Dashboard", path: "/app/dashboard", icon: <FaChartPie /> },
    { label: "Courses", path: "/app/courses", icon: <FaBook /> },
    { label: "Challenges", path: "/app/challenges", icon: <FaTrophy /> },
    { label: "Insights", path: "/app/insights", icon: <FaLayerGroup /> },
    { label: "Collaboration", path: "/app/collaboration", icon: <FaUsers /> },
  ];

  // Only add admin tab if user is admin
  if (userRole === 'admin') {
    tabs.push({ label: "Admin Panel", path: "/app/admin", icon: <FaUserShield /> });
  }

  return (
    <div className="app-layout">
      {isMobile && !isOpen && (
        <button className="menu-toggle" onClick={() => setIsOpen(true)}>
          <FaBars />
        </button>
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""} ${!isMobile ? "desktop" : ""}`}>
        {isMobile && isOpen && (
          <button className="menu-toggle inside" onClick={() => setIsOpen(false)}>
            <FaTimes />
          </button>
        )}

        <div className="sidebar-title">
          Sylla<span>byss</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {tabs.map((tab) => (
              <li key={tab.path}>
                <NavLink
                  to={tab.path}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
                  }
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  <span className="sidebar-icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                </NavLink>
              </li>
            ))}
            
            {/* Announcements Section */}
            <li className="announcements-header">
              <div 
                className="sidebar-link"
                onClick={() => setShowAnnouncements(!showAnnouncements)}
              >
                <span className="sidebar-icon">
                  <FaBullhorn />
                </span>
                <span>Announcements</span>
                <span className="announcement-badge">
                  {announcements.filter(a => a.isNew).length}
                </span>
                <span className="sidebar-icon ml-auto">
                  {showAnnouncements ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              </div>
              
              {showAnnouncements && (
                <div className="announcements-container">
                  {announcements.length === 0 ? (
                    <div className="announcement-item empty">
                      No announcements yet
                    </div>
                  ) : (
                    announcements.map(announcement => (
                      <div 
                        key={announcement.id} 
                        className={`announcement-item ${announcement.isNew ? 'new' : ''}`}
                        onClick={() => markAsRead(announcement.id)}
                      >
                        <div className="announcement-title">
                          {announcement.title}
                          {announcement.isNew && <span className="new-badge">New</span>}
                        </div>
                        <div className="announcement-content">{announcement.content}</div>
                        <div className="announcement-date">{announcement.date}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          </ul>
        </nav>

        <nav className="sidebar-profile">
          <ul>
            <li>
              <NavLink
                to="/app/profile"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
                }
                onClick={() => isMobile && setIsOpen(false)}
              >
                <span className="sidebar-icon">
                  <FaUser />
                </span>
                <span>Profile</span>
              </NavLink>
            </li>
            <li><NavLink
              to="/auth"
              className="sidebar-link logout"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <span className="sidebar-icon">
                <FaSignOutAlt />
              </span>
              <span>Logout</span>
            </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        {children}
      </main>

      <button className="chat-toggle" onClick={() => setShowChat(!showChat)}>
        <FaComment />
      </button>

      {showChat && (
        <div className="chat-box">
          <ChatAssistant
            onClose={() => setShowChat(false)}
            onSendMessage={askTutor}
          />
        </div>
      )}

      {isMobile && isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}
    </div>
  );
};
export default Sidebar;