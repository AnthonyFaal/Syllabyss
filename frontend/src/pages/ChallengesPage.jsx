/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { getAllGoals, grantGoal, getUserGoals } from '../api/APIs';
import { FaMedal } from 'react-icons/fa';
import './Challenges.css';
import PageLoader from "../components/Loader/pageLoader";

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [joinedGoals, setJoinedGoals] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [goalsRes, userGoalsRes] = await Promise.all([
          getAllGoals(),
          getUserGoals()
        ]);

        const goalsArray = Array.isArray(goalsRes) ? goalsRes : goalsRes.data;
        const userGoalsArray = Array.isArray(userGoalsRes) ? userGoalsRes : userGoalsRes.data;

        const joinedSet = new Set(userGoalsArray.map(g => g.goal_id));

        setChallenges(goalsArray);
        setJoinedGoals(joinedSet);
      } catch (error) {
        console.error("Error loading challenges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStartChallenge = async (goalId) => {
    try {
      setGranting(goalId);
      await grantGoal({goal_id: goalId });
      setJoinedGoals(prev => new Set(prev).add(goalId));
    } catch (error) {
      console.error("Failed to grant goal:", error);
      alert("Could not join the challenge.");
    } finally {
      setGranting(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="challenges-container">
      <h1>Learning Challenges</h1>
      <div className="challenges-grid">
        {challenges.map((challenge) => {
          const isJoined = joinedGoals.has(challenge.goal_id);
          return (
            <div key={challenge.goal_id} className="challenge-card">
              <div className="card-header">
                <img src={challenge.icon} alt="icon" className="challenge-icon" />
                <div className="challenge-category">{challenge.category}</div>
                <div className="xp-badge">
                  {challenge.reward_type === "xp" ? `+${challenge.reward_value} XP` : challenge.reward_value}
                </div>
              </div>
              <div className="challenge-content">
                <h3>{challenge.title}</h3>
                <p className="description">{challenge.description}</p>
                <div className="reward-info">
                  <FaMedal className={`reward-icon ${challenge.reward_type}`} />
                  <span>
                    Reward: {challenge.reward_type === 'xp' ? `${challenge.reward_value} XP` : 'Badge'}
                  </span>
                </div>
              </div>
              <div className="challenge-footer">
                <button
                  className={`start-btn ${isJoined ? 'started' : ''}`}
                  onClick={() => handleStartChallenge(challenge.goal_id)}
                  disabled={isJoined || granting === challenge.goal_id}
                >
                  {isJoined ? 'Started' : (granting === challenge.goal_id ? 'Starting...' : 'Start Challenge')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Challenges;
