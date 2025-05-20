// components/Card.js
import React from 'react';
import './Card.css';

const Card = ({ icon, title, description, actionLabel, onActionClick, children, className }) => {
  return (
    <div className={`card-container ${className || ''}`}>
      {icon && <div className="card-icon">{icon}</div>}
      <div className="card-content">
        {title && <h3 className="card-title">{title}</h3>}
        {description && <p className="card-description">{description}</p>}
        {children}
      </div>
      {actionLabel && onActionClick && (
        <button className="card-action-btn" onClick={onActionClick}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Card;
