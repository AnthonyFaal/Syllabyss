/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaFilePdf,
  FaVideo,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import "./CoursePage.css";
import {
  createCourse,
  getUserById,
  getCoursesByUserId,
  updateCourseStatus,
  getCourseModules,
  updateModule,
} from "../../api/APIs";
import PageLoader from "../../components/Loader/pageLoader";
import { getUserId } from "../../utils/authToken";
import CourseCard from "../../components/Card/courseCard";
import Modal from "../../components/Modal/Modal";
import CountdownTimer from "../../utils/CountdownTimer";
import MaterialViewer from "./MaterialViewer";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseModules, setCourseModules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pageNumber, setPageNumber] = useState(1); // Fixed: Include pageNumber in state
  const [newCourse, setNewCourse] = useState({
    difficulty_level: "beginner",
    content_type: "video",
    prompt: "",
  });
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");

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

  const fetchCourseModules = async (courseId) => {
    setLoading(true);
    try {
      const response = await getCourseModules(courseId);
      if (response?.data?.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch course modules", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = async (course) => {
    try {
      let updatedCourse = course;
      if (course.status !== "in_progress" && course.status !== "completed") {
        const response = await updateCourseStatus(course.course_id, {
          status: "in_progress",
        });
        updatedCourse = response.data.data;
        setCourses(courses.map((c) =>
          c.course_id === course.course_id ? updatedCourse : c
        ));
      }
      const modules = await fetchCourseModules(course.course_id);
      setCourseModules(modules);
      setSelectedCourse(updatedCourse);
    } catch (error) {
      console.error("Error selecting course", error);
    }
  };

  const handleMaterialClick = (material) => {
    setCurrentMaterial(material);
    setPageNumber(1);
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case "video":
        return <FaVideo className="material-icon" />;
      case "article":
        return <FaFileAlt className="material-icon" />;
      case "pdf":
        return <FaFilePdf className="material-icon" />;
      default:
        return <FaFileAlt className="material-icon" />;
    }
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

  const handleBackClick = () => {
    setSelectedCourse(null);
    setCourseModules([]);
    setCurrentMaterial(null);
  };

  const handleMaterialComplete = async (material) => {
    if (!selectedCourse) return;

    try {
      const updatedMaterial = { ...material, completed: true };
      const updatedModules = courseModules.map((module) => ({
        ...module,
        learning_materials: module.learning_materials.map((mat) =>
          mat.material_id === material.material_id ? updatedMaterial : mat
        ),
      }));

      const moduleToUpdate = updatedModules.find((module) =>
        module.learning_materials.some(
          (mat) => mat.material_id === material.material_id
        )
      );

      if (!moduleToUpdate) {
        console.warn("Material not found in any module");
        return;
      }

      const allMaterialsCompleted = moduleToUpdate.learning_materials.every(
        (mat) => mat.completed
      );

      if (allMaterialsCompleted && !moduleToUpdate.is_complete) {
        await updateModule(moduleToUpdate.module_id, { is_complete: true });
        const fullyUpdatedModules = updatedModules.map((module) =>
          module.module_id === moduleToUpdate.module_id
            ? { ...module, is_complete: true }
            : module
        );
        setCourseModules(fullyUpdatedModules);

        const allModulesCompleted = fullyUpdatedModules.every((m) => m.is_complete);
        if (allModulesCompleted && selectedCourse.status !== "completed") {
          const response = await updateCourseStatus(selectedCourse.course_id, {
            status: "completed",
          });
          setCourses(courses.map((c) =>
            c.course_id === selectedCourse.course_id ? response.data : c
          ));
        }
      } else {
        setCourseModules(updatedModules);
      }
    } catch (error) {
      console.error("Failed to update completion status", error);
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
    try {
      setLoading(true);
      const courseData = {
        ...newCourse,
        user_id: userId,
        difficulty_level: userData?.difficulty_level || newCourse.difficulty_level,
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
      {selectedCourse ? (
        <div className="course-detail-view">
          <div className="course-detail-header">
            <button onClick={handleBackClick} className="back-button">
              <FaArrowLeft className="back-icon" />
              Back to Courses
            </button>
          </div>

          <div className="course-detail-content">
            <h2 className="course-detail-title">{selectedCourse.title}</h2>
            <p className="course-detail-description">{selectedCourse.description}</p>

            <div className="course-meta">
              <span className={`difficulty-badge ${selectedCourse.difficulty_level}`}>
                {selectedCourse.difficulty_level}
              </span>
              <span className="content-type-badge">{selectedCourse.content_type}</span>
              {selectedCourse.deadline && (
                <span className="deadline-badge">
                  Due: {new Date(selectedCourse.deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            {courseModules.length > 0 && (
              <div className="modules-section">
                <h3>Modules</h3>
                <div className="modules-list">
                  {courseModules.map((module) => (
                    <div
                      key={module.module_id}
                      className={`module-card ${module.is_complete ? "completed" : ""}`}
                      onClick={() => {
                        console.log("Opening module:", module);
                      }}
                      title={module.is_complete ? "Module Completed. Click to review." : "Click to open module"}
                    >
                      <div className="module-header">
                        <h4>{module.title}</h4>
                        {module.is_complete ? (
                          <FaCheckCircle className="module-status-icon completed" title="Completed" />
                        ) : (
                          <FaClock className="module-status-icon inprogress" title="In Progress" />
                        )}
                      </div>
                      <p>{module.description}</p>

                      {module.learning_materials?.length > 0 && (
                        <div className="materials-list">
                          {module.learning_materials.map((material) => (
                            <div
                              key={material.material_id}
                              className="material-item"
                              data-content-type={material.content_type}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMaterialClick(material);
                              }}
                              title={`Open ${material.title}`}
                            >
                              {React.cloneElement(getMaterialIcon(material.content_type), {
                                "data-content-type": material.content_type,
                              })}
                              <div className="material-info">
                                <span className="material-title">{material.title}</span>
                                <div className="material-meta">
                                  <span className="material-type">{material.content_type}</span>
                                  {material.duration && (
                                    <span className="material-duration">{material.duration} min</span>
                                  )}
                                </div>
                              </div>
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
                {courses.map((course) => (
                  <CourseCard
                    key={course.course_id}
                    course={course}
                    onClick={() => handleCourseClick(course)}
                  />
                ))}
              </div>
            ) : (
              <div className="no-courses">
                <h3>No courses found</h3>
              </div>
            )}
          </div>
        </>
      )}

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
            </>
          )}
        </div>
      </Modal>

      {currentMaterial && (
        <div className="material-viewer-container">
          <MaterialViewer
            material={currentMaterial}
            courseId={selectedCourse?.course_id} 
            onComplete={handleMaterialComplete}
            onClose={() => setCurrentMaterial(null)}
          />
        </div>
      )}
    </div>
  );
};

export default Courses;