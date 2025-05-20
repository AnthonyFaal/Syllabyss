import React from "react";
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa"; // Import icons
import "./Results.css";

const Results = ({ personalityType, personalityData }) => {
  const personalityInfo = personalityData[personalityType];

  // Extract the personality name (e.g., "The Logistician") from the full key
  const personalityName = personalityType.split("–")[1]?.trim() || personalityType;

  return (
    <div className="results">
      <div className="results-header">
        <h1>
          <FaInfoCircle className="icon" /> Your Personality Type:{" "}
          <span className="personality-type">{personalityName}</span>
        </h1>
        <p className="description">{personalityInfo.description}</p>
      </div>

      <div className="results-section">
        <h2>
          <FaCheckCircle className="icon" /> Strengths
        </h2>
        <ul>
          {personalityInfo.strengths.map((strength, index) => (
            <li key={index}>
              <span className="bullet">✔</span> {strength}
            </li>
          ))}
        </ul>
      </div>

      <div className="results-section">
        <h2>
          <FaTimesCircle className="icon" /> Weaknesses
        </h2>
        <ul>
          {personalityInfo.weaknesses.map((weakness, index) => (
            <li key={index}>
              <span className="bullet">✖</span> {weakness}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Results;