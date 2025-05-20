/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchInterestData } from './fetchData';
import { createInterestFlow } from '../../api/APIs';
import './InterestPage.css';

export default function InterestFlow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paramUserId = searchParams.get('userId');
  const localUserId = localStorage.getItem('userId');
  const userId = paramUserId || localUserId;

  useEffect(() => {
    if (paramUserId) {
      localStorage.setItem('userId', paramUserId);
    }
  }, [paramUserId]);

  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  const [selectedField, setSelectedField] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedSkills, setSelectedSkills] = useState({});

  useEffect(() => {
    async function loadData() {
      const result = await fetchInterestData();
      setData(result);
    }
    loadData();
  }, []);

  if (!data) return <div className="ml-8 mt-8">Loading...</div>;

  const fieldOptions = data.field_selection.options;
  const experienceOptions = data.experience_level.options;
  const skillRecommendations = data.skill_recommendations[selectedField];
  const specializations = skillRecommendations?.specializations || [];

  const goNext = () => setStep((prev) => Math.min(prev + 1, 4));
  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleFieldSelect = (value) => {
    setSelectedField(value);
    setSelectedExperience('');
    setSelectedSpecialization('');
    setSelectedSkills({});
  };

  const handleExperienceSelect = (value) => setSelectedExperience(value);
  const handleSpecializationSelect = (label) => {
    setSelectedSpecialization(label);
    setSelectedSkills({});
  };

  const handleSkillSelect = (groupLabel, skill) => {
    setSelectedSkills((prev) => ({
      ...prev,
      [groupLabel]: skill,
    }));
  };

  const handleSubmit = async () => {
    const payload = {
      userId,
      selectedField,
      selectedExperience,
      selectedSpecialization,
      selectedSkills,
    };

    try {
      await createInterestFlow(payload);
      navigate('/api/dashboard');
    } catch (error) {
      console.error('Failed to submit interest flow:', error);
      alert('Failed to submit. Please try again.');
    }
  };

  return (
    <div className="Interest_container ml-8 mt-8 max-w-2xl">
      {step === 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-6">{data.field_selection.question}</h2>
          <div className="space-y-4">
            {fieldOptions.map((option) => (
              <label key={option} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="field"
                  value={option}
                  checked={selectedField === option}
                  onChange={() => handleFieldSelect(option)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 1 && selectedField && (
        <div>
          <h2 className="text-xl font-semibold mb-6">{data.experience_level.question}</h2>
          <div className="space-y-4">
            {experienceOptions.map((option) => (
              <label key={option} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="experience"
                  value={option}
                  checked={selectedExperience === option}
                  onChange={() => handleExperienceSelect(option)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedExperience && (
        <div>
          <h2 className="text-xl font-semibold mb-2">{skillRecommendations.question}</h2>
          <p className="mb-6 text-gray-600">{skillRecommendations.instruction}</p>
          <div className="space-y-5">
            {specializations.map((spec) => (
              <label key={spec.label} className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="specialization"
                  value={spec.label}
                  checked={selectedSpecialization === spec.label}
                  onChange={() => handleSpecializationSelect(spec.label)}
                  className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">{spec.label}</div>
                  <div className="text-sm text-gray-500">{spec.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && selectedSpecialization && (
        <div>
          <h2 className="text-xl font-semibold mb-6">
            {specializations.find((s) => s.label === selectedSpecialization)?.skills.question}
          </h2>
          <div className="space-y-8">
            {specializations
              .find((s) => s.label === selectedSpecialization)
              ?.skills.options.map((group) => (
                <div key={group.label} className="space-y-3">
                  <h3 className="font-medium text-gray-900">{group.label}</h3>
                  <div className="flex flex-wrap gap-3">
                    {group.skills.map((skill) => (
                      <label
                        key={skill}
                        className={`px-4 py-2 text-sm rounded-lg border cursor-pointer ${
                          selectedSkills[group.label] === skill
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name={group.label}
                          value={skill}
                          checked={selectedSkills[group.label] === skill}
                          onChange={() => handleSkillSelect(group.label, skill)}
                          className="hidden"
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="preview-container">
          <h2 className="text-2xl font-bold mb-6">Review Your Selections</h2>
          <div className="preview-section">
            <h3 className="text-lg font-semibold mb-2">Field:</h3>
            <p className="preview-value">{selectedField}</p>
          </div>
          <div className="preview-section">
            <h3 className="text-lg font-semibold mb-2">Experience Level:</h3>
            <p className="preview-value">{selectedExperience}</p>
          </div>
          <div className="preview-section">
            <h3 className="text-lg font-semibold mb-2">Specialization:</h3>
            <p className="preview-value">{selectedSpecialization}</p>
          </div>
          <div className="preview-section">
            <h3 className="text-lg font-semibold mb-2">Skills:</h3>
            <ul className="preview-skills">
              {Object.entries(selectedSkills).map(([group, skill]) => (
                <li key={group} className="preview-skill-item">
                  <span className="preview-skill-group">{group}:</span> {skill}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-12">
        <button
          onClick={goBack}
          disabled={step === 0}
          className={`px-5 py-2 text-sm rounded-md ${
            step === 0 ? 'text-gray-400' : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          ← Previous
        </button>
        {step < 4 ? (
          <button
            onClick={goNext}
            disabled={
              (step === 0 && !selectedField) ||
              (step === 1 && !selectedExperience) ||
              (step === 2 && !selectedSpecialization) ||
              (step === 3 && Object.keys(selectedSkills).length === 0)
            }
            className={`px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 ${
              (step === 0 && !selectedField) ||
              (step === 1 && !selectedExperience) ||
              (step === 2 && !selectedSpecialization) ||
              (step === 3 && Object.keys(selectedSkills).length === 0)
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {step === 3 ? 'Review' : 'Next →'}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Confirm and Submit
          </button>
        )}
      </div>
    </div>
  );
}