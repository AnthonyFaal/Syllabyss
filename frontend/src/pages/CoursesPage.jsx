import { FaSearch, FaFilter, FaBook, FaChartLine, FaLaptopCode, FaRobot } from "react-icons/fa";
import { GiBrain } from "react-icons/gi";
import './CoursePage.css';

const Courses = () => {
  const courses = [
    { 
      id: 1, 
      title: "AI Fundamentals", 
      progress: 65, 
      category: "Artificial Intelligence",
      icon: <FaRobot className="course-icon-img" />,
      lastAccessed: "2 days ago",
      lessonsCompleted: 8,
      totalLessons: 12
    },
    { 
      id: 2, 
      title: "Advanced React", 
      progress: 30, 
      category: "Web Development",
      icon: <FaLaptopCode className="course-icon-img" />,
      lastAccessed: "1 week ago",
      lessonsCompleted: 3,
      totalLessons: 10
    },
    { 
      id: 3, 
      title: "Data Science Basics", 
      progress: 90, 
      category: "Data Science",
      icon: <FaChartLine className="course-icon-img" />,
      lastAccessed: "Yesterday",
      lessonsCompleted: 9,
      totalLessons: 10
    },
    { 
      id: 4, 
      title: "Neural Networks", 
      progress: 15, 
      category: "Machine Learning",
      icon: <GiBrain className="course-icon-img" />,
      lastAccessed: "3 weeks ago",
      lessonsCompleted: 2,
      totalLessons: 14
    }
  ];

  return (
    <div className="courses-container">
      <header className="courses-header">
        <div className="header-content">
          <h1>My Learning Journey</h1>
          <p className="subtitle">Continue where you left off or discover new topics</p>
        </div>
        
        <div className="search-filter-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search courses, topics, or skills..." 
              className="search-input"
            />
          </div>
          <button className="filter-btn">
            <FaFilter className="filter-icon" />
            <span>Filters</span>
          </button>
        </div>
      </header>

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <div className="card-header">
              <div className="course-icon">
                {course.icon}
              </div>
              <div className="course-category">{course.category}</div>
            </div>
            
            <div className="card-body">
              <h3 className="course-title">{course.title}</h3>
              <p className="last-accessed">Last accessed: {course.lastAccessed}</p>
              
              <div className="progress-container">
                <div className="progress-info">
                  <span>Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
                <p className="lessons-completed">
                  {course.lessonsCompleted} of {course.totalLessons} lessons completed
                </p>
              </div>
            </div>
            
            <div className="card-footer">
              <button className="resume-btn">
                {course.progress > 0 ? 'Continue' : 'Start'} Learning
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Courses;