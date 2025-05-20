import React from "react";
import "./Question.css";

const Question = ({ question, selectedValue, onAnswer }) => {
  const handleChange = (value) => {
    onAnswer(value);
  };

  return (
    <div className="question">
      <h3>{question}</h3>
      <div className="options">
        {[-2, -1, 0, 1, 2].map((value) => (
          <label
            key={value}
            className={`radio-option size-${Math.abs(value)} ${
              selectedValue === value ? "selected" : ""
            }`}
          >
            <input
              type="radio"
              name={question}
              value={value}
              checked={selectedValue === value}
              onChange={() => handleChange(value)}
            />
            {value === -2 && "Strongly Disagree"}
            {value === -1 && "Disagree"}
            {value === 0 && "Neutral"}
            {value === 1 && "Agree"}
            {value === 2 && "Strongly Agree"}
          </label>
        ))}
      </div>
    </div>
  );
};

export default Question;