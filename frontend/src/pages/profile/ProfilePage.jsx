/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from 'react';
import { FaUser, FaEdit,  FaLock,  FaSave, FaTimes } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../components/Loader/pageLoader';
import { getUserById, uploadProfileImage, updateUserBio, updatePassword, getInterestFlowsByUserId } from '../../api/APIs'; 
import { getUserId } from "../../utils/authToken";
import './Profile.css';

const Profile = () => {
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userInterests, setUserInterests] = useState([]);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true); // Start in loading state
  const [passwordMode, setPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = getUserId();
    if (storedUserId) {
      setUserId(storedUserId);
      // Load both data sources together
      Promise.all([
        getUserById(storedUserId),
        getInterestFlowsByUserId()
      ])
        .then(([userResponse, interestsResponse]) => {
          setUserData(userResponse.data);
          setBioText(userResponse.data.bio || '');
          setUserInterests(interestsResponse.data || []);
        })
        .catch(error => {
          console.error("Failed to fetch data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
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
      await updatePassword({ newPassword });
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

  
  const getUserTitle = () => {
    if (userInterests?.length > 0) {
      const primaryInterest = userInterests[0];
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
            <p className="profile-title">{getUserTitle()}</p>

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
              {userInterests?.length === 0 && (
                <button className="update-interests-btn" onClick={() => navigate('/user-interest')}>
                  + Add Interests
                </button>
              )}
            </div>
            {userInterests?.length > 0 ? (
              <div className="interests-grid">
                {userInterests.map((interest, idx) => (
                  <div key={idx} className="interest-card">
                    <div className="interest-header">
                      <h3>{interest.selected_specialization}</h3>
                      <span className="experience-badge">{interest.selected_experience}</span>
                    </div>
                    {interest.selectedSkills && (
                      <div className="interest-skills">
                        <h4>Skills:</h4>
                        <div className="skills-tags">
                          {Object.entries(interest.selectedSkills).map(([category, skill], i) => (
                            <span key={i} className="skill-tag">{skill}</span>
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
                <div className="setting-icon"><FaLock /></div>
                <div className="setting-content">
                  <h3>Change Password</h3>
                  <p>Update your account security</p>
                </div>
                <button 
                  className="setting-action-btn" 
                  onClick={() => setPasswordMode(!passwordMode)}
                >
                  {passwordMode ? 'Cancel' : 'Manage'}
                </button>
              </div>
              <div className="setting-card">
                <div className="setting-icon"><FaUser /></div>
                <div className="setting-content">
                  <h3>Account Details</h3>
                  <p>View personal information</p>
                </div>
                <button 
                  className="setting-action-btn" 
                  onClick={() => setShowAccountDetails(!showAccountDetails)}
                >
                  {showAccountDetails ? 'Hide' : 'View'}
                </button>
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


            {showAccountDetails && userData && (
              <div className="account-details-panel">
                <h3>Account Information</h3>
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{userData.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{userData.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Created:</span>
                  <span className="detail-value">
                    {new Date(userData.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Login:</span>
                  <span className="detail-value">
                    {new Date(userData.last_login).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">
                    {userData.is_active ? 'Active' : 'Inactive'}
                    {userData.is_verified && ' • Verified'}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
