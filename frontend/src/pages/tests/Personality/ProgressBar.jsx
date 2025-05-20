import React from "react";
import "./ProgressBar.css";

const ProgressBar = ({ current, total }) => {
  const progress = (current / total) * 100;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      <div className="progress-text">
        {current} / {total}
      </div>
    </div>
  );
};

export default ProgressBar;