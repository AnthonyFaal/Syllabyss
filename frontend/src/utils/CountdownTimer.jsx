import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';

const CountdownTimer = ({ duration = 10, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
      
      setProgress(prev => {
        const newProgress = prev + (100 / duration);
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, onComplete]);

  return (
    <div className="countdown-timer">
      <CircularProgress 
        variant="determinate" 
        value={progress} 
        size={80}
        thickness={4}
      />
      <div className="countdown-text">
        {timeLeft}s
      </div>
      <p>Creating your course...</p>
    </div>
  );
};

export default CountdownTimer;