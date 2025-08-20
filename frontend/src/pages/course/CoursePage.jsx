/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import "./CoursePage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  createCourse,
  getUserById,
  getCoursesByUserId,
  updateCourseStatus,
} from "../../api/APIs";
import {getFromJson} from "../../utils/FromJson";
import PageLoader from "../../components/Loader/pageLoader";
import { getUserId } from "../../utils/authToken";
import CourseCard from "../../components/Card/courseCard";
import Modal from "../../components/Modal/Modal";
import CountdownTimer from "../../utils/CountdownTimer";
import MaterialViewer from "./MaterialViewer";

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [voices, setVoices] = useState([]);
  const [newCourse, setNewCourse] = useState({
    difficulty_level: "beginner",
    content_type: "video",
    prompt: "",
    voice: "Ava",
  });
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");

  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const uid = getUserId();
    setUserId(uid);
    if (uid) {
      fetchUserData(uid);
      fetchUserCourses(uid);
    }
  }, []);

  useEffect(() => {
    if (userData?.difficulty_level) {
      setNewCourse((prev) => ({
        ...prev,
        difficulty_level: userData.difficulty_level,
      }));
    }
  }, [userData]);
  
useEffect(() => {
  const loadVoices = async () => {
    const data = await getFromJson("voices");
    setVoices(data);
  };
  loadVoices();
}, []);


  const fetchUserCourses = async (userId) => {
    setLoading(true);
    try {
      const response = await getCoursesByUserId(userId);
      if (response?.data?.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch user courses", error);
    }
    setLoading(false);
  };

  const fetchUserData = async (id) => {
    try {
      const response = await getUserById(id);
      setUserData(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setError("Failed to load user data");
    }
  };

const handleUpdateStatus = async (courseId) => {
  try {
    const response = await updateCourseStatus(courseId, { status: "in_progress" });
    setCourses(
      courses.map((c) => (c.course_id === courseId ? response.data : c))
    );
  } catch (error) {
    console.error("Failed to update course status", error);
  }
};


  const handleCreateCourse = async () => {
    if (!newCourse.prompt || !newCourse.difficulty_level) {
      setError("Please provide a course prompt");
      return;
    }

    if (newCourse.prompt.length > 300) {
      setError("Prompt must be 300 characters or less");
      return;
    }

    setIsCreating(true);
    setLoading(true);

    try {
      const courseData = {
        ...newCourse,
        user_id: userId,
        difficulty_level: userData?.difficulty_level || newCourse.difficulty_level,
        voice: newCourse.voice,
      };
      const response = await createCourse(courseData);
      if (response.data.success) {
        setCourses([...courses, response.data.data]);
        setShowCreateModal(false);
        setNewCourse({
          difficulty_level: userData?.difficulty_level || "beginner",
          content_type: "video",
          prompt: "",
        });
        setError("");
      }
    } catch (error) {
      console.error("Failed to create course", error);
      setError("Failed to create course. Please try again.");
    } finally {
      setLoading(false);
      setIsCreating(false);
    }
  };
 
   

  if (!userId) return null;

  return (
    <div className="course-container">
      <ToastContainer />
      <div className="course-controls">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          className="create-course-button"
          onClick={() => setShowCreateModal(true)}
        >
          <FaPlus className="create-icon" />
          Create Course
        </button>
      </div>

      <div className="courses-content">
        {loading ? (
          <PageLoader />
        ) : courses.length > 0 ? (
          <div className="courses-grid">
            {courses
            .filter((course) =>
              course.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((course) => (
              <CourseCard
                key={course.course_id}
                course={course}
                onClick={async () => {
                  // If course status is "not_started", update it
                  if (course.status === "not_started") {
                    await handleUpdateStatus(course.course_id);
                  }
                  // Then select the course to open the MaterialViewer
                  setSelectedCourse(course);
                }}
              />
            ))}

          </div>
        ) : (
          <div className="no-courses">
            <h3>No courses found</h3>
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="create-course-modal">
          {isCreating ? (
            <CountdownTimer
              duration={10}
              onComplete={() => {
                setShowCreateModal(false);
                setIsCreating(false);
              }}
            />
          ) : (
           <>
  <h2>Create New Course</h2>
  {error && <div className="error-message">{error}</div>}

  <div className="form-group">
    <label>
      What should the AI create for you?
      <span className="info-note">
        (E.g., "Create an introductory biology course")
      </span>
    </label>
    <textarea
      value={newCourse.prompt}
      onChange={(e) =>
        setNewCourse({ ...newCourse, prompt: e.target.value })
      }
      placeholder="Type your request here... Be specific about the topic and what you expect."
      rows="4"
      className="prompt-input"
      maxLength={300}
    />
    <div className="char-count">
      {newCourse.prompt.length} / 300 characters
    </div>
  </div>

  <div className="form-row">
    <div className="form-group">
      <label>Content Type</label>
      <select
        value={newCourse.content_type}
        onChange={(e) =>
          setNewCourse({ ...newCourse, content_type: e.target.value })
        }
      >
        <option value="video">Video</option>
        <option value="article">Article</option>
      </select>
    </div>

    <div className="form-group">
      <label>Difficulty Level</label>
      <select
        value={newCourse.difficulty_level}
        onChange={(e) =>
          setNewCourse({
            ...newCourse,
            difficulty_level: e.target.value,
          })
        }
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
    </div>
  </div>

  {/* 🎙️ Voice Selector with Previews */}
  <div className="form-group">
    <label>Voice</label>
    <div className="voice-selector">
      <ul>
        {voices.map((voice, index) => (
          <li key={index} className="voice-option">
            <label>
              <input
                type="radio"
                name="voice"
                value={voice.name}
                checked={newCourse.voice === voice.name}
                onChange={() =>
                  setNewCourse({ ...newCourse, voice: voice.name })
                }
              />
              {voice.name}
            </label>
 
            {/* Preview Audio */}
            <audio controls className="ml-2">
              <source src={voice.file_path} type="audio/wav" />
              Your browser does not support audio playback.
            </audio>
          </li>
        ))}
      </ul>
    </div>
  </div>

  <div className="modal-actions">
    <button
      className="create-button"
      onClick={handleCreateCourse}
      disabled={loading}
    >
      {loading ? "Creating..." : "Create Course"}
    </button>
  </div>
           </>

          )}
        </div>
      </Modal>

      {/* Course Viewer Modal */}
    {selectedCourse && (
      <Modal
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        variant="side-panel"    
      >
        <MaterialViewer courseId={selectedCourse.course_id} 
        />
      </Modal>
    )}

    </div>
  );
};

export default Courses;
