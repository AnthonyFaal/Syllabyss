import React, { useState, useEffect } from "react";
import questionsData from "../../../data/questions.json";
import personalityData from "../../../data/personalityData.json";
import Question from "./Question";
import ProgressBar from "./ProgressBar";
import Results from "./Results";

const PersonalityPage = () => {
  const [currentSet, setCurrentSet] = useState(0);
  const [responses, setResponses] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  useEffect(() => {
    const categories = [
      "Introversion_vs_Extraversion",
      "Intuition_vs_Sensing",
      "Thinking_vs_Feeling",
      "Judging_vs_Perceiving",
    ];
    const shuffledQuestions = categories.flatMap((category) => {
      const categoryQuestions = questionsData.questions.filter(
        (q) => q.category === category
      );
      return categoryQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
    });
    setSelectedQuestions(shuffledQuestions);
    setResponses(Array(shuffledQuestions.length).fill(null));
  }, []);

  const handleAnswer = (index, value) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
  };

  const calculatePersonalityType = () => {
    const scores = {
      Introversion_vs_Extraversion: 0,
      Intuition_vs_Sensing: 0,
      Thinking_vs_Feeling: 0,
      Judging_vs_Perceiving: 0,
    };

    selectedQuestions.forEach((question, index) => {
      scores[question.category] += responses[index] || 0;
    });

    let personalityType = "";
    personalityType += scores["Introversion_vs_Extraversion"] > 0 ? "I" : "E";
    personalityType += scores["Intuition_vs_Sensing"] > 0 ? "N" : "S";
    personalityType += scores["Thinking_vs_Feeling"] > 0 ? "T" : "F";
    personalityType += scores["Judging_vs_Perceiving"] > 0 ? "J" : "P";

    const fullPersonalityType = Object.keys(personalityData).find((key) =>
      key.startsWith(personalityType)
    );

    return fullPersonalityType || personalityType;
  };

  const handleNext = () => {
    if (currentSet < Math.ceil(selectedQuestions.length / 5) - 1) {
      setCurrentSet(currentSet + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentSet > 0) {
      setCurrentSet(currentSet - 1);
    }
  };

  if (showResults) {
    const personalityType = calculatePersonalityType();
    return <Results personalityType={personalityType} personalityData={personalityData} />;
  }

  const startIndex = currentSet * 5;
  const endIndex = startIndex + 5;
  const currentQuestions = selectedQuestions.slice(startIndex, endIndex);

  return (
    <div className="app">
      <ProgressBar current={startIndex + 1} total={selectedQuestions.length} />
      <div className="questions-container">
        {currentQuestions.map((question, index) => (
          <Question
            key={startIndex + index}
            question={question.question}
            selectedValue={responses[startIndex + index]}
            onAnswer={(value) => handleAnswer(startIndex + index, value)}
          />
        ))}
      </div>
      <div className="navigation-buttons">
        {currentSet > 0 && (
          <button className="nav-button" onClick={handlePrevious}>
            Previous
          </button>
        )}
        <button className="nav-button" onClick={handleNext}>
          {currentSet < Math.ceil(selectedQuestions.length / 5) - 1 ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
};

export default PersonalityPage;
