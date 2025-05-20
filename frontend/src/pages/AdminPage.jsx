import { FaUserShield, FaChartBar, FaUserCog, FaCog, FaTrashAlt } from "react-icons/fa";
import { useState, useEffect } from "react";
import "./AdminPanel.css";
import { getUsers } from "../api/APIs";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("analytics");
  const [userList, setUserList] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        // Assuming response.data is the array of users
        setUserList(
          response.data.map(user => ({
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            lastLogin: new Date(user.created_at).toLocaleDateString(), // Or format as needed
            profileImage: user.profile_image,
            specialization: user.selected_specialization,
            experience: user.selected_experience,
            field: user.selected_field,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    fetchUsers();
  }, []);


  const handleDeleteUser = (id) => {
    setUserList((prevUsers) => prevUsers.filter(user => user.id !== id));
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1><FaUserShield /> Admin Panel</h1>
        <p>Manage platform settings, user data, and system-wide configurations</p>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === "analytics" ? "active" : ""}
          onClick={() => setActiveTab("analytics")}
        >
          <FaChartBar /> Analytics
        </button>
        <button
          className={activeTab === "users" ? "active" : ""}
          onClick={() => setActiveTab("users")}
        >
          <FaUserCog /> User Management
        </button>
        <button
          className={activeTab === "settings" ? "active" : ""}
          onClick={() => setActiveTab("settings")}
        >
          <FaCog /> System Settings
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "analytics" && (
          <div className="analytics-dashboard">
            <h2>Platform Analytics</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Active Users</h3>
                <p>{userList.length}</p>
              </div>
              <div className="metric-card">
                <h3>Courses Completed</h3>
                <p>3,782</p>
              </div>
              <div className="metric-card">
                <h3>Engagement Rate</h3>
                <p>68%</p>
              </div>
            </div>
            <div className="chart-placeholder">
              <p>Chart: User Engagement Over Time</p>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="user-management">
            <h2>User Management</h2>
            <div className="user-list">
              <table>
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Field</th>
                    <th>Specialization</th>
                    <th>Experience</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((user) => (
                    <tr key={user.id}>
                      <td>
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt="Profile"
                            style={{ width: "40px", borderRadius: "50%" }}
                          />
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.field || "—"}</td>
                      <td>{user.specialization || "—"}</td>
                      <td>{user.experience || "—"}</td>
                      <td>{user.lastLogin}</td>
                      <td>
                        <button onClick={() => handleDeleteUser(user.id)}><FaTrashAlt /> Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="system-settings">
            <h2>System Settings</h2>
            <div className="settings-form">
              <label>
                Enable Notifications:
                <input type="checkbox" />
              </label>
              <label>
                Maintenance Mode:
                <input type="checkbox" />
              </label>
              <label>
                Privacy Policy Updates:
                <textarea placeholder="Update the privacy policy..." />
              </label>
              <button>Save Settings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
