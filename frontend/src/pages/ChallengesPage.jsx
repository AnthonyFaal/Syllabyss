/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { getAllGoals } from '../api/APIs';
import { FaMedal } from 'react-icons/fa';
import './Challenges.css';
import { getUserId } from "../utils/authToken";
import PageLoader from "../components/Loader/pageLoader";

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await getAllGoals();
        const goalsArray = Array.isArray(response) ? response : response.data;

        if (Array.isArray(goalsArray)) {
          setChallenges(goalsArray);
        } else {
          console.error("Invalid response format: ", response);
        }
      } catch (error) {
        console.error("Error fetching goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  if (loading) return <PageLoader />; // ✅ Proper loader

  return (
    <div className="challenges-container">
      <h1>Learning Challenges</h1>
      <div className="challenges-grid">
        {challenges.map((challenge) => (
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
                <span>Reward: {challenge.reward_type === 'xp' ? `${challenge.reward_value} XP` : 'Badge'}</span>
              </div>
            </div>
            <div className="challenge-footer">
              <button className="start-btn">Start Challenge</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Challenges;
