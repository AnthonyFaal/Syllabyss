import { useState, useEffect } from "react";
import { 
  FaUserShield, FaChartBar, FaUsers, FaCog, FaTrashAlt, FaEdit, 
  FaSearch, FaFilter, FaBars, FaTimes, FaUserGraduate, 
  FaBook, FaQuestionCircle, FaLayerGroup, FaComments, FaStar 
} from "react-icons/fa";import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PieChartComponent, StatsCard , FieldDistributionChart} from "../components/Charts/Charts";
import "./AdminPanel.css";
import { getUsers, getAdminOverview, getAllFeedback, getInterstStats} from "../api/APIs";
import PageLoader from "../components/Loader/pageLoader";
import { formatLastActiveTime } from '../utils/global';

const AdminPanel = () => {
  const [userList, setUserList] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [feedbackList, setFeedbackList] = useState([]);
  const [interestStats, setInterestStats] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const usersResponse = await getUsers();
        setUserList(
          usersResponse.data.map(user => ({
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            lastLogin: formatLastActiveTime(user.last_login || user.created_at),
            profileImage: user.profile_image,
            specialization: user.selected_specialization || "—",
            experience: user.selected_experience || "—",
            field: user.selected_field || "—",
          }))
        );
        
        const statsResponse = await getAdminOverview();
        setSystemStats(statsResponse.data.systemStats);

        const feedbackResponse = await getAllFeedback();
        setFeedbackList(feedbackResponse?.data.data);

        const interestResponse = await getInterstStats();
        setInterestStats(interestResponse.data);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = userList.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleDistribution = userList.reduce((acc, user) => {
    const role = user.role;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const roleChartData = Object.keys(roleDistribution).map(role => ({
    role,
    count: roleDistribution[role],
  }));

  const userRoles = [...new Set(userList.map(user => user.role.toLowerCase()))];

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="admin-dashboard">
      {/* Mobile Header */}
      {windowWidth <= 768 && (
        <div className="mobile-header">
          <h1><FaUserShield /> Admin</h1>
        </div>
      )}

      <div className={`admin-dashboard-container ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        {/* Desktop Header */}
        {windowWidth > 768 && (
          <div className="admin-header">
            <div className="header-content">
              <h1><FaUserShield /> Admin Dashboard</h1>
              <p>Comprehensive overview of platform metrics and user management</p>
            </div>
          </div>
        )}

        {/* Analytics Overview */}
        <section className="dashboard-section">
          <h2><FaChartBar /> Platform Overview</h2>
          {systemStats && (
            <div className="metrics-grid">
              <StatsCard 
                title="Total Users" 
                value={systemStats.totalUsers} 
                change="+12% from last month" 
                icon={<FaUsers />} 
                color="primary" 
              />
              <StatsCard 
                title="Students" 
                value={systemStats.totalStudents} 
                change={`${Math.round((systemStats.totalStudents / systemStats.totalUsers) * 100)}% of users`} 
                icon={<FaUserGraduate />} 
                color="success" 
              />
              <StatsCard 
                title="Courses" 
                value={systemStats.totalCourses} 
                change="+3 new this week" 
                icon={<FaBook />} 
                color="warning" 
              />
              <StatsCard 
                title="Quizzes" 
                value={systemStats.totalQuizzes} 
                change="High engagement" 
                icon={<FaQuestionCircle />} 
                color="info" 
              />
              <StatsCard 
                title="Modules" 
                value={systemStats.totalModules} 
                change="+8% from last month" 
                icon={<FaLayerGroup />} 
                color="secondary" 
              />
              <StatsCard 
                title="Feedback" 
                value={systemStats.totalFeedback} 
                change="Need more collection" 
                icon={<FaComments />} 
                color="tertiary" 
              />
            </div>
          )}

          <div className="chart-grid">
            <div className="chart-item">
              <FieldDistributionChart data={interestStats} />
            </div>
            <div className="chart-item">
              <PieChartComponent 
                data={roleChartData} 
                dataKey="count" 
                nameKey="role" 
                title="User Role Distribution" 
              />
            </div>
          </div>
        </section>

        {/* User Management */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2><FaUsers /> User Management</h2>
            <div className="controls">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="filter-dropdown">
                <FaFilter className="filter-icon" />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">All Roles</option>
                  {userRoles.map(role => (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="responsive-table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.name} className="user-avatar" />
                          ) : (
                            <div className="avatar-placeholder">{user.name.charAt(0)}</div>
                          )}
                          <strong>{user.name}</strong>
                        </div>
                      </td>
                      <td>
                        hidden
                        {/*<a href={`mailto:${user.email}`}>{user.email}</a>*/}
                      </td>
                      <td><span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span></td>
                      <td>{user.lastLogin}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="no-results">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
       
       {/* Feedback Management */}
       <section className="dashboard-section">
          <h2><FaComments /> User Feedback</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="feedback-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Course</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.length > 0 ? (
                  feedbackList.map(feedback => (
                    <tr key={feedback.feedback_id}>
                      <td className="user-info">
                        {feedback.profile_image ? (
                          <img
                            src={feedback.profile_image}
                            alt={feedback.name}
                            className="user-avatar"
                          />
                        ) : (
                          <div className="avatar-placeholder">{feedback.name.charAt(0)}</div>
                        )}
                        {feedback.name}
                      </td>
                      <td>{feedback.course_title}</td>
                      <td>
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            color={i < feedback.rating ? "#ffc107" : "#e4e5e9"}
                          />
                        ))}
                      </td>
                      <td>{feedback.comment}</td>
                      <td>{new Date(feedback.submitted_at).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                      No feedback found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;