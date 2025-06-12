import React, { useEffect, useState } from "react";
import {
  FaSearch, 
  FaFilter, 
  FaArrowLeft, 
  FaPlus, 
  FaTrash, 
  FaEdit,
 } from "react-icons/fa";
import './CoursePage.css';
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
    difficulty_level: "beginner",
    content_type: "video",
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
    if (!newCourse.prompt || !newCourse.difficulty_level) {
      setError("Input prompt");
      return;
    }

    try {
      setLoading(true);
      const courseData = {
        ...newCourse,
        user_id: userId,
        difficulty_level: userData?.difficulty_level || newCourse.difficulty_level
      };
      
      const response = await createCourse(courseData);
      if (response.data.success) {
        setCourses([...courses, response.data.data]);
        setShowCreateModal(false);
        setNewCourse({
          difficulty_level: userData?.difficulty_level || "beginner",
          content_type: "video",
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
          {/* Search and Filter */}
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

          {/* Course Content */}
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

      {/* Create Course Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="create-course-modal">
          <h2>Create New Course</h2>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>
              What should the AI create for you? 
              <span className="info-note">
                (E.g., “Create an introductory biology course”)
              </span>
            </label>
            <textarea
              value={newCourse.prompt}
              onChange={(e) => {
                if (e.target.value.length <= 300) {
                  setNewCourse({ ...newCourse, prompt: e.target.value });
                }
              }}
              placeholder="Type your request here... Be specific about the topic and what you expect."
              rows="4"
              className="prompt-input"
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
                onChange={(e) => setNewCourse({...newCourse, content_type: e.target.value})}
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Difficulty Level</label>
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
              {loading ? "Creating..." : "Create Course"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Courses;