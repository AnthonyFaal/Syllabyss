import { NavLink } from "react-router-dom";
import {
  FaBook,
  FaUserShield,
  FaLightbulb,
  FaLayerGroup,
  FaChartPie,
  FaUsers,
  FaTrophy,
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaComment
} from "react-icons/fa";
import { useState, useEffect } from "react";
import ChatAssistant from "../Chatbot/ChatAssistant";
import "./Sidebar.css";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChat, setShowChat] = useState(false);
  
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

  const tabs = [
    { label: "Dashboard", path: "/app/dashboard", icon: <FaChartPie /> },
    { label: "Courses", path: "/app/courses", icon: <FaBook /> },
    { label: "Challenges", path: "/app/challenges", icon: <FaTrophy /> },
    { label: "Content Studio", path: "/app/content", icon: <FaLightbulb /> },
    { label: "Insights", path: "/app/insights", icon: <FaLayerGroup /> },
    { label: "Collaboration", path: "/app/collaboration", icon: <FaUsers /> },
    { label: "Admin Panel", path: "/app/admin", icon: <FaUserShield /> }
  ];

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
          Learn<span>UP</span>
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
            <li>
              <NavLink
                to="/auth"
                className="sidebar-link logout"
                onClick={() => isMobile && setIsOpen(false)}
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
        {/* Main content here */}
      </main>

      {/* Chatbot toggle button */}
      <button className="chat-toggle" onClick={() => setShowChat(!showChat)}>
        <FaComment />
      </button>

      {/* Chatbot component */}
      {showChat && (
        <div className="chat-box">
          <ChatAssistant onClose={() => setShowChat(false)} />
        </div>
      )}

      {/* Optional: sidebar overlay for mobile */}
      {isMobile && isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}
    </div>
  );
};

export default Sidebar;
