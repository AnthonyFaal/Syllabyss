/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from 'react';
import { FaUser, FaEdit, FaCog, FaLock, FaBook, FaClock, FaFire, FaSave, FaTimes } from "react-icons/fa";
import { GiGraduateCap } from "react-icons/gi";
import { useNavigate } from 'react-router-dom';
import { getUserById, uploadProfileImage, updateUserBio } from '../../api/APIs'; 
import './Profile.css';
 
const Profile = () => {
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedToken = localStorage.getItem('token');

    if (storedUserId && storedToken) {
      setUserId(storedUserId);
      setToken(storedToken);
      fetchUserData(storedUserId);
    } else {
      window.location.href = '/auth';
    }
  }, []);

  const fetchUserData = async (id) => {
    try {
      const response = await getUserById(id);
      setUserData(response.data);
      setBioText(response.data.bio || '');
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const handleAvatarClick = () => {
    if(fileInputRef.current){
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && userId) {
      setUploading(true);
      try {
        await uploadProfileImage(userId, file);
        await fetchUserData(userId);
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Failed to upload image. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  };

  // Bio editing handlers
  const handleBioEditClick = () => setEditingBio(true);
  const handleBioChange = (e) => {
    if (e.target.value.length <= 300) {
      setBioText(e.target.value);
    }
  };
  const handleBioSave = async () => {
    try {
      // Send bio in the request body as expected by the backend
      await updateUserBio(userId, { bio: bioText });
      setEditingBio(false);
      await fetchUserData(userId);
    } catch (error) {
      console.error("Failed to update bio:", error);
      alert("Could not update bio. Please try again.");
    }
  };

  const handleBioCancel = () => {
    setBioText(userData?.bio || '');
    setEditingBio(false);
  };

  const goToInterestPage = () => {
    navigate('/user-interest');
  };

  // Dynamic stats from userData or default fallback values
  const stats = [
    { icon: <FaBook className="stat-icon" />, label: "Courses Completed", value: userData?.courses_completed ?? 0 },
    { icon: <FaClock className="stat-icon" />, label: "Hours Learned", value: userData?.hours_learned ?? 0 },
    { icon: <FaFire className="stat-icon" />, label: "Current Streak", value: userData?.current_streak ?? "0 days" },
    { icon: <GiGraduateCap className="stat-icon" />, label: "Certificates", value: userData?.certificates ?? 0 }
  ];

  // Dynamic title based on user's interests or default
  const getUserTitle = () => {
    if (userData?.interests?.length > 0) {
      const primaryInterest = userData.interests[0];
      return `${primaryInterest.selected_field} ${primaryInterest.selected_experience}`;
    }
    return "Learning Enthusiast";
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="avatar-section">
            <div className="avatar-container" onClick={handleAvatarClick}>
              <div className="avatar">
                {userData?.profile_image ? (
                  <img 
                    src={userData.profile_image} 
                    alt={userData.name || "User"} 
                    className="avatar-image" 
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {userData?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {uploading && <div className="uploading-overlay">Uploading...</div>}
            </div>

            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          <div className="profile-info-section">
            <div className="profile-info">
              <h1 className="profile-name">{userData?.name || 'User'}</h1>
              <p className="profile-email">{userData?.email}</p>
              {userData?.title && (
                <p className="profile-title">{userData.title}</p>
              )}
              {!userData?.title && (
                <p className="profile-title">{getUserTitle()}</p>
              )}
            </div>

            {/* Bio Section */}
            <div className="bio-section">
              {!editingBio ? (
                <div className="bio-display">
                  <p className="profile-bio">
                    {userData?.bio && userData.bio.trim() !== '' 
                      ? userData.bio 
                      : "You haven't added a bio yet. Click to add one."}
                  </p>
                  <button className="edit-bio-btn" onClick={handleBioEditClick}>
                    <FaEdit /> Edit Bio
                  </button>
                </div>
              ) : (
                <div className="bio-edit-container">
                  <textarea 
                    value={bioText} 
                    onChange={handleBioChange} 
                    maxLength={300} 
                    rows={4} 
                    placeholder="Tell us about yourself (max 300 characters)..."
                    className="bio-textarea"
                  />
                  <div className="bio-character-count">
                    {bioText.length} / 300 characters
                  </div>
                  <div className="bio-edit-buttons">
                    <button onClick={handleBioSave} className="save-bio-btn">
                      <FaSave /> Save
                    </button>
                    <button onClick={handleBioCancel} className="cancel-bio-btn">
                      <FaTimes /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-content">
          {/* Interests Section */}
          <section className="interests-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">🎯</span> Learning Interests
              </h2>
              {(!userData?.interests || userData.interests.length === 0) && (
                <button className="update-interests-btn" onClick={goToInterestPage}>
                  + Add Interests
                </button>
              )}
            </div>
            
            {userData?.interests?.length > 0 ? (
              <div className="interests-grid">
                {userData.interests.map((interest, idx) => (
                  <div key={idx} className="interest-card">
                    <div className="interest-header">
                      <h3 className="interest-specialization">{interest.selected_specialization}</h3>
                      <span className="interest-experience">{interest.selected_experience}</span>
                    </div>
                    {interest.skills?.length > 0 && (
                      <div className="interest-skills">
                        <h4 className="skills-title">Skills:</h4>
                        <div className="skills-tags">
                          {interest.skills.map((s, i) => (
                            <span key={i} className="skill-tag">{s.skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-interests">
                <p className="no-interests-message">
                  You haven't set up any learning interests yet. Add interests to get personalized recommendations.
                </p>
              </div>
            )}
          </section>

          <div className="profile-bottom-sections">
            <section className="stats-section">
              <h2 className="section-title">
                <span className="title-icon">📊</span> Learning Statistics
              </h2>
              <div className="stats-grid">
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card">
                    <div className="stat-icon-container">{stat.icon}</div>
                    <div className="stat-content">
                      <h3 className="stat-label">{stat.label}</h3>
                      <p className="stat-value">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <h2 className="section-title">
                <span className="title-icon">⚙️</span> Account Settings
              </h2>
              <div className="settings-grid">
                <div className="setting-card">
                  <div className="setting-icon"><FaCog /></div>
                  <div className="setting-content">
                    <h3>Preferences</h3>
                    <p>Customize your learning experience</p>
                  </div>
                  <button className="setting-action-btn">Manage</button>
                </div>
                <div className="setting-card">
                  <div className="setting-icon"><FaLock /></div>
                  <div className="setting-content">
                    <h3>Change Password</h3>
                    <p>Update your account security</p>
                  </div>
                  <button className="setting-action-btn">Manage</button>
                </div>
                <div className="setting-card">
                  <div className="setting-icon"><FaUser /></div>
                  <div className="setting-content">
                    <h3>Account Details</h3>
                    <p>Edit personal information</p>
                  </div>
                  <button className="setting-action-btn">Manage</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;