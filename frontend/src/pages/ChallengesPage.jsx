import { FaTrophy, FaMedal, FaLock, FaStar, FaCheckCircle, FaRunning } from "react-icons/fa";
import { GiProgression, GiBookshelf, GiDiscussion } from "react-icons/gi";
import './Challenges.css';

const Challenges = () => {
  const challenges = [
    { 
      id: 1, 
      title: "7-Day Learning Streak", 
      description: "Learn for 7 consecutive days",
      category: "Consistency",
      icon: <GiProgression className="icon" />,
      completed: true, 
      reward: "Gold Badge",
      xp: 100
    },
    { 
      id: 2, 
      title: "Complete 5 Lessons", 
      description: "Finish any 5 lessons across subjects",
      category: "Progress",
      icon: <GiBookshelf className="icon" />,
      completed: false, 
      reward: "Silver Badge",
      xp: 50
    },
    { 
      id: 3, 
      title: "Discussion Champion", 
      description: "Participate in 3 forum discussions",
      category: "Community",
      icon: <GiDiscussion className="icon" />,
      completed: false, 
      reward: "Diamond Badge",
      xp: 75
    },
    { 
      id: 4, 
      title: "Speed Learner", 
      description: "Complete a lesson in record time",
      category: "Achievement",
      icon: <FaRunning className="icon" />,
      completed: false, 
      reward: "Bronze Badge",
      xp: 30
    }
  ];

  const badges = [
    { type: "gold", name: "Learning Streak", count: 1 },
    { type: "silver", name: "Quick Learner", count: 3 },
    { type: "bronze", name: "First Steps", count: 5 }
  ];

  const leaderboard = [
    { rank: 1, name: "John Doe", xp: 350 },
    { rank: 2, name: "Jane Smith", xp: 300 },
    { rank: 3, name: "Alice Johnson", xp: 250 },
    { rank: 4, name: "Bob Brown", xp: 200 },
    { rank: 5, name: "Charlie Davis", xp: 150 },
  ];

  return (
    <div className="challenges-container">
      <header className="challenges-header">
        <h1>Learning Challenges</h1>
        <p className="subtitle">Complete challenges to earn badges and XP!</p>
      </header>

      <div className="challenges-grid">
        {challenges.map((challenge) => (
          <div key={challenge.id} className={`challenge-card ${challenge.completed ? 'completed' : ''}`}>
            <div className="card-header">
              <div className="challenge-icon">
                {challenge.completed ? (
                  <FaCheckCircle className="completed-icon" />
                ) : (
                  challenge.icon
                )}
              </div>
              <div className="challenge-category">{challenge.category}</div>
              {challenge.completed && (
                <div className="xp-badge">+{challenge.xp} XP</div>
              )}
            </div>
            
            <div className="challenge-content">
              <h3>{challenge.title}</h3>
              <p className="description">{challenge.description}</p>
              
              <div className="reward-info">
                <FaMedal className={`reward-icon ${challenge.reward.split(' ')[0].toLowerCase()}`} />
                <span>Reward: {challenge.reward}</span>
              </div>
            </div>
            
            <div className="challenge-footer">
              {challenge.completed ? (
                <div className="completed-status">
                  <FaStar className="star-icon" />
                  <span>Completed!</span>
                </div>
              ) : (
                <button className="start-btn">
                  Start Challenge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="badge-collection">
        <h2>Your Badge Collection</h2>
        <div className="badges-grid">
          {badges.map((badge, index) => (
            <div key={index} className="badge-card">
              <div className="badge-icon">
                <FaMedal className={badge.type} />
                <span className="badge-count">{badge.count}x</span>
              </div>
              <div className="badge-info">
                <h4>{badge.name}</h4>
                <p className="badge-type">{badge.type.charAt(0).toUpperCase() + badge.type.slice(1)} Badge</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="leaderboard">
        <h2>Leaderboard</h2>
        <div className="leaderboard-grid">
          {leaderboard.map((entry) => (
            <div key={entry.rank} className="leaderboard-entry">
              <span className="rank">{entry.rank}</span>
              <span className="player-name">{entry.name}</span>
              <span className="player-xp">{entry.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Challenges;
