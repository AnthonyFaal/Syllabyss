const cors = require("cors");
const express = require("express");

require("./src/config/db");
const chatRoutes = require("./src/routes/chatRoute");
const authRoutes = require("./src/routes/auth.routes");
const courseRoutes = require("./src/routes/courseRoute");
const interestRoutes = require("./src/routes/interestRoutes");
const userProgressRoutes = require('./src/routes/userProgressRoutes');
const goalRoutes = require('./src/routes/goalRoutes');
const quizRoutes = require('./src/routes/quizRoutes');
const dashRoutes = require('./src/routes/dashboardRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes'); // Add this line
const insightsRoutes = require('./src/routes/insightsRoutes');
const leaderboardRoutes = require('./src/routes/leaderRoutes');
const tutorRoutes = require('./src/routes/tutorRoutes');
const feedbackRoutes = require('./src/routes/feedbackRoutes');


const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use("/api", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/courses", courseRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/progress', userProgressRoutes);
app.use("/api/interest-flow", interestRoutes);
app.use('/api', quizRoutes);
app.use('/api', dashRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/recommendations', recommendationRoutes); // Add this line
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/assistant', tutorRoutes);
app.use('/api/feedback', feedbackRoutes);

module.exports = app;