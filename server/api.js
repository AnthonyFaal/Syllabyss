const cors = require("cors");
const express = require("express");

require("./src/config/db");
const chatRoutes = require("./src/routes/chatRoute");
const authRoutes = require("./src/routes/auth.routes");
const courseRoutes = require("./src/routes/courseRoute");
const interestRoutes = require("./src/routes/interestRoutes");
const userProgressRoutes = require('./src/routes/userProgressRoutes');
const achievementRoutes = require('./src/routes/achievementRoutes');
const quizRoutes = require('./src/routes/quizRoutes');
const dashRoutes = require('./src/routes/dashboardRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const streakRoutes = require('./src/routes/streakRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes'); // Add this line
const insightsRoutes = require('./src/routes/insightsRoutes');
const leaderboardRoutes = require('./src/routes/leaderRoutes');


const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use("/api", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/courses", courseRoutes);
app.use('/api', achievementRoutes);
app.use('/api/progress', userProgressRoutes);
app.use("/api/interest-flow", interestRoutes);
app.use('/api', quizRoutes);
app.use('/api', dashRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/recommendations', recommendationRoutes); // Add this line
app.use('/api/leaderboard', leaderboardRoutes);

module.exports = app;