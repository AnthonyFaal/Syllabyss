/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { 
  FaChartLine, FaChartBar, 
  FaRegStar, FaTrophy, FaBook, FaBullseye,
  FaRegClock, FaRegCheckCircle, FaPlay, FaAward, 
  FaBookOpen, FaExclamationTriangle, FaInbox } from 'react-icons/fa';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { BarChartComponent, PieChartComponent, StatsCard } from "../components/Charts/Charts";
import './Insights.css';
import {
  getUserKPIs,
  getUserQuizTrends,
  getUserXPBreakdown,
  getBestPerformingCourse,
  getUserActivityLog
} from "../api/APIs";
import PageLoader from "../components/Loader/pageLoader";

const Insights = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [quizTrends, setQuizTrends] = useState([]);
  const [xpBreakdown, setXpBreakdown] = useState([]);
  const [bestCourse, setBestCourse] = useState(null);
  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
   const fetchData = async () => {
  try {
    setLoading(true);
    const [kpisData, 
      trendsData, 
      xpData,
      bestCourseData,
      activityLogData
    ] = await Promise.all([
      getUserKPIs(),
      getUserQuizTrends(),
      getUserXPBreakdown(),
      getBestPerformingCourse(),
      getUserActivityLog()
    ]);
    
    setKpis(kpisData.data);
    setQuizTrends(trendsData.data);
    setXpBreakdown(Array.isArray(xpData?.data) ? xpData.data : []);
    setBestCourse(bestCourseData?.data || null);
    setActivityLog(Array.isArray(activityLogData?.data) ? activityLogData.data : []);
  } catch (error) {
    console.error("Error fetching insights data:", error);
  } finally {
    setLoading(false);
  }
};

    fetchData();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  // Process data for charts
  const progressOverTimeData = quizTrends.data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: item.avg_score || 0,
    attempts: item.attempts || 0
  })).filter(item => item.score > 0); // Only show days with activity

  const courseProgressData = kpis?.data.courses ? [
    { name: 'Completed', value: kpis.data.courses.completed },
    { name: 'In Progress', value: kpis.data.courses.inProgress },
    { name: 'Not Started', value: kpis.data.courses.notStarted }
  ] : [];

  const goalProgressData = kpis?.data.goals ? [
    { name: 'Completed', value: kpis.data.goals.completed },
    { name: 'In Progress', value: kpis.data.goals.inProgress },
    { name: 'Not Started', value: kpis.data.goals.notStarted }
  ] : [];

 
  return (
    <div className="insights-container">
      <h1 className="insights-header"><FaChartLine /> Learning Insights</h1>
      
     <div className="stats-grid">
  <StatsCard 
    title="Quiz Performance" 
    value={`${kpis?.data.avgQuizPercentage || 0}%`} 
    change={`${kpis?.data.totalAttempts || 0} attempts`}
    icon={<FaChartBar />}
    color="blue"
  />
  <StatsCard 
    title="Total XP" 
    value={kpis?.data.totalXP || 0} 
    change={`Rank #${kpis?.data.rank || 'N/A'}`}
    icon={<FaTrophy />}
    color="purple"
  />
  <StatsCard 
    title="Courses" 
    value={`${kpis?.data.courses?.inProgress || 0} active`} 
    change={`${kpis?.data.courses?.completed || 0} completed`}
    icon={<FaBook />}
    color="green"
  />
  <StatsCard 
    title="Goals" 
    value={`${kpis?.data.goals?.inProgress || 0} in progress`} 
    change={`${kpis?.data.goals?.completed || 0} achieved`}
    icon={<FaBullseye />}
    color="orange"
  />
</div>

      <div className="insights-grid">
        {/* Progress Over Time */}
        <div className="insight-card large">
          <h3>Progress Over Time</h3>
          {progressOverTimeData.length > 0 ? (
            <BarChartComponent 
              data={progressOverTimeData}
              xKey="date"
              yKey="score"
              title="Average Quiz Scores"
              color="#4e73df"
            />
          ) : (
            <div className="no-data">No quiz data available</div>
          )}
        </div>

        {/* Course Progress */}
        <div className="insight-card">
          <h3>Course Progress</h3>
          {courseProgressData.length > 0 ? (
            <PieChartComponent 
              data={courseProgressData}
              dataKey="value"
              nameKey="name"
            />
          ) : (
            <div className="no-data">No course data available</div>
          )}
        </div>

        {/* Goal Progress */}
        <div className="insight-card">
          <h3>Goal Progress</h3>
          {goalProgressData.length > 0 ? (
            <PieChartComponent 
              data={goalProgressData}
              dataKey="value"
              nameKey="name"
            />
          ) : (
            <div className="no-data">No goal data available</div>
          )}
        </div>
        
        {/* Recent Activity */}
     <div className="insight-card large">
        <h3><HiOutlineAcademicCap className="section-icon" /> Activity Log</h3>
        {activityLog.length > 0 ? (
          <ul className="activity-log">
            {activityLog.slice(0, 5).map((log) => (
              <li key={log.activity_id} className="activity-item">
                <div className="activity-content">
                  <div className="activity-icon">
                    {log.activity_type === "quiz_completed" && <FaRegCheckCircle className="quiz-icon" />}
                    {log.activity_type === "course_started" && <FaPlay className="course-icon" />}
                    {log.activity_type === "course_completed" && <FaAward className="complete-icon" />}
                    {!["quiz_completed", "course_started", "course_completed"].includes(log.activity_type) && 
                      <FaExclamationTriangle className="default-icon" />}
                  </div>
                  <div className="activity-text">
                    {log.activity_type === "quiz_completed" && (
                      <>
                        <div className="activity-type">Completed quiz</div>
                        <div className="activity-title">
                          <FaBook className="title-icon" /> {log.quiz_title}
                        </div>
                        {log.description && (
                          <div className="activity-detail">
                            <FaChartBar className="detail-icon" />
                            Score: {log.description.match(/score (\d+\.?\d*)/)?.[1]}%
                          </div>
                        )}
                      </>
                    )}
                    {log.activity_type === "course_started" && (
                      <>
                        <div className="activity-type">Started course</div>
                        <div className="activity-title">
                          <FaBookOpen className="title-icon" /> {log.course_title}
                        </div>
                      </>
                    )}
                    {log.activity_type === "course_completed" && (
                      <>
                        <div className="activity-type">Completed course</div>
                        <div className="activity-title">
                          <FaBook className="title-icon" /> {log.course_title}
                        </div>
                      </>
                    )}
                    {!["quiz_completed", "course_started", "course_completed"].includes(log.activity_type) && (
                      <div className="activity-title">
                        <FaExclamationTriangle className="title-icon" />
                        {log.description || log.activity_type.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                  <div className="activity-time">
                    <FaRegClock className="time-icon" />
                    {new Date(log.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-data">
            <FaInbox className="no-data-icon" />
            No recent activity
          </div>
        )}
      </div>
    </div>

      {/* performance */}
   <div className="insight-card">
      <h3>Best Performing Course</h3>
      {bestCourse ? (
        <div>
          <div className="top-topics">
            <div className="topic-item">
              <FaRegStar className="topic-icon" />
              <div className="topic-info">
                <h4>{bestCourse.title}</h4>
              </div>
            </div>
            <div className="topic-item">
              <FaChartBar className="topic-icon" />
              <div className="topic-info">
                <h4>Score</h4>
                <p>{bestCourse.avgScore}%</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">No best course data available</div>
      )}
    </div>

      {/* Recommendations */}
      <div className="recommendations">
        <h2>AI Recommendations</h2>
        <div className="recommendation-list">
          {kpis?.avgQuizPercentage < 50 && (
            <div className="recommendation">
              <p>Your quiz scores are below average. Try reviewing the material before attempting quizzes.</p>
            </div>
          )}
          {kpis?.courses?.inProgress > 3 && (
            <div className="recommendation">
              <p>You have many courses in progress. Consider focusing on completing one at a time.</p>
            </div>
          )}
          {activityLog.length === 0 && (
            <div className="recommendation">
              <p>Start a new course or quiz to begin tracking your learning progress.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;