import { useState, useEffect } from "react";
import { 
  FaUserShield, FaChartBar, FaUsers, FaCog, FaTrashAlt, FaEdit, 
  FaSearch, FaFilter, FaBars, FaTimes, FaUserGraduate, 
  FaBook, FaQuestionCircle, FaLayerGroup, FaComments, FaStar
} from "react-icons/fa";
import { BarChartComponent, PieChartComponent, StatsCard } from "../components/Charts/Charts";
import "./AdminPanel.css";
import { getUsers, getAdminOverview } from "../api/APIs";
import PageLoader from "../components/Loader/pageLoader";

const AdminPanel = () => {
  const [userList, setUserList] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch users
        const usersResponse = await getUsers();
        setUserList(
          usersResponse.data.map(user => ({
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            lastLogin: new Date(user.last_login || user.created_at).toLocaleDateString(),
            profileImage: user.profile_image,
            specialization: user.selected_specialization || "—",
            experience: user.selected_experience || "—",
            field: user.selected_field || "—",
          }))
        );
        
        // Fetch system stats
        const statsResponse = await getAdminOverview();
        setSystemStats(statsResponse.data.systemStats);
        
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteUser = (id) => {
    setUserList(prevUsers => prevUsers.filter(user => user.id !== id));
  };

  const filteredUsers = userList.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter;
    return matchesSearch && matchesRole;
  });

  const fieldDistribution = userList.reduce((acc, user) => {
    const field = user.field || "Unspecified";
    acc[field] = (acc[field] || 0) + 1;
    return acc;
  }, {});

  const fieldChartData = Object.keys(fieldDistribution).map(field => ({
    field,
    count: fieldDistribution[field],
  }));

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
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <h1><FaUserShield /> Admin</h1>
        </div>
      )}

      <div className={`dashboard-container ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
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
              <BarChartComponent 
                data={fieldChartData} 
                xKey="field" 
                yKey="count" 
                title="User Field Distribution" 
              />
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
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    {windowWidth > 600 && <th>Contact</th>}
                    <th>Role</th>
                    {windowWidth > 768 && <th>Field</th>}
                    {windowWidth > 992 && <th>Specialization</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-info">
                            {user.profileImage ? (
                              <img src={user.profileImage} alt={user.name} className="user-avatar" />
                            ) : (
                              <div className="avatar-placeholder">{user.name.charAt(0)}</div>
                            )}
                            <div>
                              <strong>{user.name}</strong>
                              {windowWidth <= 600 && <small>{user.email}</small>}
                              <small>Last active: {user.lastLogin}</small>
                            </div>
                          </div>
                        </td>
                        {windowWidth > 600 && (
                          <td>
                            <div className="contact-info">
                              <a href={`mailto:${user.email}`}>{user.email}</a>
                              {windowWidth > 768 && <small>Exp: {user.experience}</small>}
                            </div>
                          </td>
                        )}
                        <td><span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span></td>
                        {windowWidth > 768 && <td>{user.field}</td>}
                        {windowWidth > 992 && <td>{user.specialization}</td>}
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn"><FaEdit /></button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={windowWidth > 992 ? 6 : windowWidth > 768 ? 5 : windowWidth > 600 ? 4 : 3} className="no-results">
                        No users found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* System Settings */}
        <section className="dashboard-section">
          <h2><FaCog /> System Settings</h2>
          <div className="settings-grid">
            <div className="settings-card">
              <h3>Platform Status</h3>
              <div className="setting-item">
                <label>
                  <input type="checkbox" />
                  Maintenance Mode
                </label>
                <p className="setting-description">When enabled, only admins can access the platform</p>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  User Registration
                </label>
                <p className="setting-description">Allow new users to register accounts</p>
              </div>
            </div>

            <div className="settings-card">
              <h3>Content Settings</h3>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Enable Comments
                </label>
                <p className="setting-description">Allow users to comment on courses</p>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Enable Ratings
                </label>
                <p className="setting-description">Allow users to rate courses</p>
              </div>
            </div>

            {windowWidth > 600 && (
              <div className="settings-card">
                <h3>Analytics</h3>
                <div className="setting-item">
                  <label>
                    Data Retention
                    <select defaultValue="30">
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Collect Anonymous Usage Data
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="settings-actions">
            <button className="save-btn">Save All Settings</button>
            {windowWidth > 480 && (
              <button className="reset-btn">Reset to Defaults</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;