import { FaUsers, FaComments, FaHandshake, FaLightbulb, FaTrophy } from "react-icons/fa";
import { GiProgression, GiTeamIdea } from "react-icons/gi";
import "./Collaboration.css"; // We'll import the CSS file

const Collaboration = () => {
  const collaborationActivities = [
    {
      id: 1,
      title: "Group Study Session",
      description: "Join a live study session with peers learning similar topics",
      icon: <FaUsers className="icon" />,
      participants: 12,
      category: "Live",
      status: "active"
    },
    {
      id: 2,
      title: "Project Collaboration",
      description: "Work together on a practical project with team members",
      icon: <GiTeamIdea className="icon" />,
      participants: 4,
      category: "Project",
      status: "forming"
    },
    {
      id: 3,
      title: "Discussion Forum",
      description: "Participate in ongoing topic discussions",
      icon: <FaComments className="icon" />,
      participants: 32,
      category: "Discussion",
      status: "active"
    },
    {
      id: 4,
      title: "Peer Review Exchange",
      description: "Exchange and review each other's work",
      icon: <FaHandshake className="icon" />,
      participants: 8,
      category: "Feedback",
      status: "active"
    },
    {
      id: 5,
      title: "Study Challenge",
      description: "Compete in a 7-day learning challenge",
      icon: <FaLightbulb className="icon" />,
      participants: 25,
      category: "Challenge",
      status: "upcoming"
    },
    {
      id: 6,
      title: "Mentorship Program",
      description: "Connect with experienced mentors",
      icon: <GiProgression className="icon" />,
      participants: 15,
      category: "Guidance",
      status: "forming"
    }
  ];

  const leaderboard = [
    { id: 1, name: "Alex Johnson", points: 1250, avatar: "A", badge: <FaTrophy className="gold" /> },
    { id: 2, name: "Sam Wilson", points: 1120, avatar: "S", badge: <FaTrophy className="silver" /> },
    { id: 3, name: "Taylor Smith", points: 980, avatar: "T", badge: <FaTrophy className="bronze" /> },
    { id: 4, name: "Jordan Lee", points: 875, avatar: "J" },
    { id: 5, name: "Casey Kim", points: 820, avatar: "C" }
  ];

  return (
    <div className="collaboration-container">
      <header className="collaboration-header">
        <h1>Learning Community</h1>
        <p className="subtitle">Collaborate, discuss, and grow with peers</p>
      </header>

      <div className="collaboration-stats">
        <div className="stat-card">
          <h3>Active Collaborations</h3>
          <p className="stat-value">24</p>
          <p className="stat-change">+5 this week</p>
        </div>
        <div className="stat-card">
          <h3>Community Members</h3>
          <p className="stat-value">1,842</p>
          <p className="stat-change">+32 today</p>
        </div>
        <div className="stat-card">
          <h3>Your Connections</h3>
          <p className="stat-value">18</p>
          <p className="stat-change">+2 this month</p>
        </div>
      </div>

      <div className="collaboration-content">
        <section className="activities-section">
          <h2>Available Activities</h2>
          <div className="activities-grid">
            {collaborationActivities.map(activity => (
              <div key={activity.id} className={`activity-card ${activity.status}`}>
                <div className="card-header">
                  <div className="activity-icon">
                    {activity.icon}
                    <span className="participants">{activity.participants}+</span>
                  </div>
                  <div className="activity-category">{activity.category}</div>
                </div>
                <div className="card-body">
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                </div>
                <div className="card-footer">
                  <span className={`status-badge ${activity.status}`}>
                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                  </span>
                  <button className="join-btn">
                    {activity.status === "upcoming" ? "Notify Me" : "Join Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="community-sidebar">
          <div className="leaderboard-card">
            <h2>Community Leaders</h2>
            <div className="leaderboard-list">
              {leaderboard.map(user => (
                <div key={user.id} className="leaderboard-item">
                  <div className="user-info">
                    <div className="avatar">{user.avatar}</div>
                    <div>
                      <h4>{user.name}</h4>
                      <p className="points">{user.points} points</p>
                    </div>
                  </div>
                  {user.badge && <div className="badge">{user.badge}</div>}
                </div>
              ))}
            </div>
            <button className="view-all-btn">View Full Leaderboard</button>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <button className="action-btn">
              <FaComments /> Start Discussion
            </button>
            <button className="action-btn">
              <FaUsers /> Create Group
            </button>
            <button className="action-btn">
              <FaHandshake /> Find Mentor
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Collaboration;