import { FaChartLine, FaRegClock, FaRegCalendarAlt, FaChartBar, FaRegStar } from "react-icons/fa"; // Changed FaBarChart to FaChartBar
import './Insights.css';

const Insights = () => {
  return (
    <div className="insights">
      <h1><FaChartLine /> Learning Insights</h1>
      <div className="insights-grid">
        {/* Progress Over Time */}
        <div className="insight-card large">
          <h3>Progress Over Time</h3>
          {/* Chart placeholder */}
          <div className="chart-placeholder"></div>
        </div>

        {/* Time Spent Learning */}
        <div className="insight-card">
          <h3>Time Spent Learning</h3>
          <div className="metric">
            <FaRegClock />
            <span>12.5 hours</span>
          </div>
          <p>This week</p>
        </div>

        {/* Learning Trends */}
        <div className="insight-card">
          <h3>Learning Trends</h3>
          <div className="metric">
            <FaChartBar /> {/* Changed icon here */}
            <span>AI up 20%</span>
          </div>
          <p>Trending topics this month</p>
        </div>

        {/* Streak */}
        <div className="insight-card">
          <h3>Streak</h3>
          <div className="metric">
            <FaRegCalendarAlt />
            <span>7 days</span>
          </div>
          <p>Current streak</p>
        </div>

        {/* Skill Distribution */}
        <div className="insight-card large">
          <h3>Skill Distribution</h3>
          {/* Another chart placeholder */}
          <div className="chart-placeholder"></div>
        </div>

        {/* Top Performing Topics */}
        <div className="insight-card">
          <h3>Top Performing Topics</h3>
          <div className="metric">
            <FaRegStar />
            <span>Data Science</span>
          </div>
          <p>Most engaged topic this month</p>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="recommendations">
        <h2>AI Recommendations</h2>
        <div className="recommendation-list">
          <div className="recommendation">
            <p>You're spending most time on AI content. Try balancing with other topics.</p>
          </div>
          <div className="recommendation">
            <p>Your retention is highest in the mornings. Schedule learning sessions then.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
