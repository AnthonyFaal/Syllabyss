const express = require("express");
const cors = require("cors");
require("./src/config/db");
const authRoutes = require("./src/routes/auth.routes");
const interestRoutes= require("./src/routes/interestRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use("/api", authRoutes);
app.use("/api", interestRoutes);

module.exports = app;
