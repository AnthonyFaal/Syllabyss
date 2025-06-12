import React, { useEffect, useState } from "react";
import { 
  FaSearch, 
  FaFilter, 
  FaArrowLeft, 
  FaPlus, 
  FaTrash, 
  FaEdit,
  FaInfoCircle,
  FaPlayCircle,
  FaTachometerAlt,
  FaClock,
  FaCalendarAlt,
  FaSpinner
} from "react-icons/fa";
import {createCourse, getUserById, getCoursesByUserId, deleteCourse} from '../../api/APIs';
import PageLoader from '../../components/Loader/pageLoader';
import { getUserId } from '../../utils/authToken';
import CourseCard from "../../components/Card/courseCard";
import Modal from "../../components/Modal/Modal";

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    difficulty_level: "beginner",
    content_type: "video",
    estimated_duration: 1,
    deadline: "",
    prompt: ""
  });
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const uid = getUserId();
    setUserId(uid);
    if (uid) {
      fetchUserData(uid);
    }
  }, []);
  

  useEffect(() => {
    if (userData?.difficulty_level) {
      setNewCourse(prev => ({
        ...prev,
        difficulty_level: userData.difficulty_level
      }));
    }
  }, [userData]);

  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        const response = await getCoursesByUserId(userId);
        if (response?.data?.success) {
          const userCourses = response.data.data
            .filter(course => course.user_id == userId)
            .map(course => ({
              ...course,
              id: course.id || `${course.user_id}-${course.title}-${Date.now()}`
            }));
          setCourses(userCourses);
        } else {
          setCourses([]);
        }
      } catch (error) {
        console.error("Failed to fetch user courses", error);
        setCourses([]);
      }
      setLoading(false);
    };

    fetchUserCourses();
  }, [userId]);

  const fetchUserData = async (id) => {
    try {
      const response = await getUserById(id);
      setUserData(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setError("Failed to load user data");
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || 
                         (activeFilter === "active" && new Date(course.deadline) > new Date()) ||
                         (activeFilter === "completed" && new Date(course.deadline) <= new Date());
    return matchesSearch && matchesFilter;
  });

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
  };

  const handleBackClick = () => {
    setSelectedCourse(null);
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title || !newCourse.description) {
      setError("Title and description are required");
      return;
    }

    try {
      setLoading(true);
      const courseData = {
        ...newCourse,
        user_id: userId,
        difficulty_level: newCourse.difficulty_level
      };
      
      const response = await createCourse(courseData);
      if (response.data.success) {
        setCourses([...courses, response.data.data]);
        setShowCreateModal(false);
        setNewCourse({
          title: "",
          description: "",
          difficulty_level: userData?.difficulty_level || "beginner",
          content_type: "video",
          estimated_duration: 1,
          deadline: "",
          prompt: ""
        });
      }
    } catch (error) {
      console.error("Failed to create course", error);
      setError("Failed to create course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        setLoading(true);
        await deleteCourse(courseId);
        setCourses(courses.filter(course => course.id !== courseId));
        if (selectedCourse?.id === courseId) {
          setSelectedCourse(null);
        }
      } catch (error) {
        console.error("Failed to delete course", error);
        setError("Failed to delete course. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!userId) return null;

  return (
    <div className="course-container">
      {selectedCourse ? (
        <div className="course-detail-view">
          <div className="course-detail-header">
            <button onClick={handleBackClick} className="back-button">
              <FaArrowLeft className="back-icon" />
              Back to Courses
            </button>
            <div className="course-actions">
              <button className="edit-button">
                <FaEdit className="action-icon" />
                Edit
              </button>
              <button 
                className="delete-button"
                onClick={() => handleDeleteCourse(selectedCourse.id)}
              >
                <FaTrash className="action-icon" />
                Delete
              </button>
            </div>
          </div>
          
          <div className="course-detail-content">
            <h2 className="course-detail-title">{selectedCourse.title}</h2>
            <p className="course-detail-description">{selectedCourse.description}</p>
            
            <div className="course-meta">
              <span className={`difficulty-badge ${selectedCourse.difficulty_level}`}>
                {selectedCourse.difficulty_level}
              </span>
              <span className="content-type-badge">{selectedCourse.content_type}</span>
              <span className="duration">{selectedCourse.estimated_duration} hours</span>
              {selectedCourse.deadline && (
                <span className="deadline-badge">
                  Due: {new Date(selectedCourse.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {selectedCourse.modules?.length > 0 && (
              <div className="modules-section">
                <h3>Modules</h3>
                <div className="modules-list">
                  {selectedCourse.modules.map(module => (
                    <div key={module.module_id} className="module-card">
                      <h4>{module.title}</h4>
                      <p>{module.description}</p>
                      {module.learning_materials?.length > 0 && (
                        <div className="materials-list">
                          {module.learning_materials.map(material => (
                            <div key={material.material_id} className="material-item">
                              <span>{material.title}</span>
                              <span className="material-type">{material.content_type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
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
            <div className="filter-options">
              <select 
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Courses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <FaFilter className="filter-icon" />
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
            ) : filteredCourses.length > 0 ? (
              <div className="courses-horizontal-scroll">
                {filteredCourses.map(course => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    onClick={() => handleCourseClick(course)}
                    onDelete={() => handleDeleteCourse(course.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="no-courses">
                <h3>No courses found</h3>
                <p>Try adjusting your search or filters</p>
                <button 
                  className="create-course-button"
                  onClick={() => setShowCreateModal(true)}
                >
                  <FaPlus className="create-icon" />
                  Create Your First Course
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="create-course-modal">
          <h2>Create New Course</h2>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Course Title</label>
            <input
              type="text"
              value={newCourse.title}
              onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
              placeholder="e.g. 'Introduction to React'"
              maxLength={100}
            />
            <div className="character-counter">{newCourse.title.length}/100</div>
          </div>
          
          <div className="form-group">
            <label>Course Description</label>
            <textarea
              value={newCourse.description}
              onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
              placeholder="Briefly describe what this course will cover"
              rows="3"
              maxLength={300}
            />
            <div className="character-counter">{newCourse.description.length}/300</div>
          </div>
          
          <div className="form-group">
            <label>
              <FaInfoCircle className="info-icon" /> 
              What should this course cover?
            </label>
            <div className="input-hint">
              Be specific about topics, skills, or concepts you want to learn
            </div>
            <textarea
              value={newCourse.prompt}
              onChange={(e) => setNewCourse({...newCourse, prompt: e.target.value})}
              placeholder="Example: 'I want to learn React hooks, state management with Redux, and building reusable components'"
              rows="4"
              maxLength={500}
              className="prompt-input"
            />
            <div className="character-counter">{newCourse.prompt.length}/500</div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>
                <FaPlayCircle className="input-icon" />
                Content Type
              </label>
              <select
                value={newCourse.content_type}
                onChange={(e) => setNewCourse({...newCourse, content_type: e.target.value})}
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="quiz">Quiz</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaTachometerAlt className="input-icon" />
                Difficulty Level
              </label>
              <select
                value={newCourse.difficulty_level}
                onChange={(e) => setNewCourse({...newCourse, difficulty_level: e.target.value})}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>        
          
          <div className="form-row">
            <div className="form-group">
              <label>
                <FaClock className="input-icon" />
                Estimated Duration (hours)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={newCourse.estimated_duration}
                onChange={(e) => setNewCourse({...newCourse, estimated_duration: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>
                <FaCalendarAlt className="input-icon" />
                Deadline (optional)
              </label>
              <input
                type="date"
                value={newCourse.deadline}
                onChange={(e) => setNewCourse({...newCourse, deadline: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="cancel-button"
              onClick={() => {
                setShowCreateModal(false);
                setError("");
              }}
            >
              Cancel
            </button>
            <button 
              className="create-button"
              onClick={handleCreateCourse}
              disabled={loading}
            >
              {loading ? <FaSpinner className="spin-icon" /> : "Create Course"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Courses;