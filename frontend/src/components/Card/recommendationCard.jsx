import React from "react";
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";

const RecommendationCard = ({ recommendation, onAccept }) => {
  return (
    <div className="recommendation-card">
      <h4>{recommendation.suggested_course_title}</h4>
      <p className="recommendation-description">
        {recommendation.suggested_course_description}
      </p>
      <div className="recommendation-meta">
        <span className={`difficulty-badge ${recommendation.suggested_difficulty_level}`}>
          {recommendation.suggested_difficulty_level}
        </span>
        <span className="duration-badge">
          {recommendation.suggested_estimated_duration} min
        </span>
      </div>
      <p className="recommendation-reason">
        <strong>Why this recommendation:</strong> {recommendation.reason}
      </p>
      <div className="recommendation-actions">
        <button
          className="accept-button"
          onClick={() => onAccept(recommendation.recommendation_id)}
        >
          <FaThumbsUp /> Accept
        </button>
      </div>
    </div>
  );
};

export default RecommendationCard;