import { useState, useEffect } from 'react';
import { FaChartLine, FaChartBar, FaRegStar, FaTrophy, FaBook, FaBullseye } from "react-icons/fa";
import { BarChartComponent, PieChartComponent, StatsCard } from "../components/Charts/Charts";
import './Insights.css';
import {
  getUserKPIs,
  getUserQuizTrends,
  getUserRecentActivity,
  getUserXPBreakdown,
} from "../api/APIs";
import PageLoader from "../components/Loader/pageLoader";
import { getUserId } from "../utils/authToken";

const Insights = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [quizTrends, setQuizTrends] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [xpBreakdown, setXpBreakdown] = useState([]);
  const userId = getUserId();

  useEffect(() => {
   const fetchData = async () => {
  try {
    setLoading(true);
    const [kpisData, trendsData, activityData, xpData] = await Promise.all([
      getUserKPIs(userId),
      getUserQuizTrends(userId),
      getUserRecentActivity(userId),
      getUserXPBreakdown(userId)
    ]);
    
    setKpis(kpisData.data);
    setQuizTrends(trendsData.data);
    setRecentActivity(Array.isArray(activityData?.data) ? activityData.data : []);
    setXpBreakdown(Array.isArray(xpData?.data) ? xpData.data : []);
  } catch (error) {
    console.error("Error fetching insights data:", error);
  } finally {
    setLoading(false);
  }
};

    fetchData();
  }, [userId]);

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

  const goalProgressData = kpis?.goals ? [
    { name: 'Completed', value: kpis.data.goals.completed },
    { name: 'In Progress', value: kpis.data.goals.inProgress },
    { name: 'Not Started', value: kpis.data.goals.notStarted }
  ] : [];

  const topTopic = Array.isArray(recentActivity) 
  ? recentActivity.reduce((acc, activity) => {
      if (activity?.course) {
        acc[activity.course] = (acc[activity.course] || 0) + 1;
      }
      return acc;
    }, {})
  : {};

  const mostActiveTopic = Object.entries(topTopic).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No activity';

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
          <h3>Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="activity-list">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-content">
                    <p className="activity-title">{activity.quizId ? `Quiz: ${activity.title}` : activity.description || 'Completed activity'}</p>
                    <small className="activity-meta">
                      {activity.course && <span>{activity.course}</span>}
                      {activity.date && <span>{new Date(activity.date).toLocaleDateString()}</span>}
                    </small>
                  </div>
                  {activity.score && (
                    <div className={`activity-score ${activity.score >= 80 ? 'high-score' : activity.score >= 50 ? 'medium-score' : 'low-score'}`}>
                      {activity.score}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No recent activity</div>
          )}
        </div>
      </div>

      {/* Top Topics */}
      <div className="insight-card full-width">
        <h3>Top Performing Topics</h3>
        <div className="top-topics">
          <div className="topic-item">
            <FaRegStar className="topic-icon" />
            <div className="topic-info">
              <h4>Most Active</h4>
              <p>{mostActiveTopic}</p>
            </div>
          </div>
          {xpBreakdown.length > 0 && (
            <div className="topic-item">
              <FaChartBar className="topic-icon" />
              <div className="topic-info">
                <h4>Highest XP</h4>
                <p>{xpBreakdown.reduce((max, item) => item.xp > max.xp ? item : max, xpBreakdown[0])?.topic}</p>
              </div>
            </div>
          )}
        </div>
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
          {recentActivity.length === 0 && (
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