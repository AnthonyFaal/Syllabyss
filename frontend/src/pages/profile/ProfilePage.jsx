/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from 'react';
import { FaUser, FaEdit, FaCog, FaLock, FaBook, FaClock, FaFire, FaSave, FaTimes } from "react-icons/fa";
import { GiGraduateCap } from "react-icons/gi";
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../components/Loader/pageLoader';
import { getUserById, uploadProfileImage, updateUserBio, updatePassword } from '../../api/APIs'; 
import './Profile.css';

const Profile = () => {
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordMode, setPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      fetchUserData(storedUserId);
    } else {
      window.location.href = '/auth';
    }
  }, []);

  const fetchUserData = async (id) => {
    setLoading(true);
    try {
      const response = await getUserById(id);
      setUserData(response.data);
      setBioText(response.data.bio || '');
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
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

  const handleBioEditClick = () => setEditingBio(true);
  const handleBioChange = (e) => {
    if (e.target.value.length <= 300) {
      setBioText(e.target.value);
    }
  };
  const handleBioSave = async () => {
    try {
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

  const handlePasswordUpdate = async () => {
    if (!newPassword) {
      alert("Please enter a new password.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(userId, { password: newPassword });
      alert("Password updated successfully.");
      setNewPassword('');
      setPasswordMode(false);
    } catch (error) {
      console.error("Failed to update password:", error);
      alert("Failed to update password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToInterestPage = () => navigate('/user-interest');
  const goToPreferencesPage = () => navigate('/preferences');
  const goToAccountDetailsPage = () => navigate('/account-details');

  const stats = [
    { icon: <FaBook className="stat-icon" />, label: "Courses Completed", value: userData?.courses_completed ?? 0 },
    { icon: <FaClock className="stat-icon" />, label: "Hours Learned", value: userData?.hours_learned ?? 0 },
    { icon: <FaFire className="stat-icon" />, label: "Current Streak", value: userData?.current_streak ?? "0 days" },
    { icon: <GiGraduateCap className="stat-icon" />, label: "Certificates", value: userData?.certificates ?? 0 }
  ];

  const getUserTitle = () => {
    if (userData?.interests?.length > 0) {
      const primaryInterest = userData.interests[0];
      return `${primaryInterest.selected_field} ${primaryInterest.selected_experience}`;
    }
    return "Learning Enthusiast";
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="avatar-section">
            <div className="avatar-container" onClick={handleAvatarClick}>
              <div className="avatar">
                {userData?.profile_image ? (
                  <img src={userData.profile_image} alt={userData.name || "User"} className="avatar-image" />
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
            <h1 className="profile-name">{userData?.name || 'User'}</h1>
            <p className="profile-email">{userData?.email}</p>
            <p className="profile-title">{userData?.title || getUserTitle()}</p>

            <div className="bio-section">
              {!editingBio ? (
                <div className="bio-display">
                  <p className="profile-bio">
                    {userData?.bio?.trim() !== ''
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
                  <div className="bio-character-count">{bioText.length} / 300 characters</div>
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
          <section className="interests-section">
            <div className="section-header">
              <h2><span className="title-icon">🎯</span> Learning Interests</h2>
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
                      <h3>{interest.selected_specialization}</h3>
                      <span>{interest.selected_experience}</span>
                    </div>
                    {interest.skills?.length > 0 && (
                      <div className="interest-skills">
                        <h4>Skills:</h4>
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
              <p className="no-interests-message">
                You haven't set up any learning interests yet. Add interests to get personalized recommendations.
              </p>
            )}
          </section>

          <section className="settings-section">
            <h2><span className="title-icon">⚙️</span> Account Settings</h2>
            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-icon"><FaCog /></div>
                <div className="setting-content">
                  <h3>Preferences</h3>
                  <p>Customize your learning experience</p>
                </div>
                <button className="setting-action-btn" onClick={goToPreferencesPage}>Manage</button>
              </div>
              <div className="setting-card">
                <div className="setting-icon"><FaLock /></div>
                <div className="setting-content">
                  <h3>Change Password</h3>
                  <p>Update your account security</p>
                </div>
                <button className="setting-action-btn" onClick={() => setPasswordMode(!passwordMode)}>
                  {passwordMode ? 'Cancel' : 'Manage'}
                </button>
              </div>
              <div className="setting-card">
                <div className="setting-icon"><FaUser /></div>
                <div className="setting-content">
                  <h3>Account Details</h3>
                  <p>Edit personal information</p>
                </div>
                <button className="setting-action-btn" onClick={goToAccountDetailsPage}>Manage</button>
              </div>
            </div>

            {passwordMode && (
              <div className="password-update">
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="password-input"
                />
                <button onClick={handlePasswordUpdate} className="save-password-btn">
                  <FaSave /> Update Password
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
