const cors = require("cors");
const express = require("express");

require("./src/config/db");
const chatRoutes= require("./src/routes/chatRoute");
const authRoutes = require("./src/routes/auth.routes");
const courseRoutes= require("./src/routes/courseRoute");
const interestRoutes= require("./src/routes/interestRoutes");
const userProgressRoutes = require('./src/routes/userProgressRoutes');
const achievementRoutes = require('./src/routes/achievementRoutes');
const quizRoutes = require('./src/routes/quizRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use("/api", authRoutes);
app.use("/api/chat" , chatRoutes);
app.use("/api/courses", courseRoutes);
app.use('/api', achievementRoutes);
app.use('/api/progress', userProgressRoutes);
app.use("/api/interest-flow", interestRoutes);
app.use('/api', quizRoutes);


module.exports = app;
