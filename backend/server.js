require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const { startTaskReminderJob } = require("./jobs/taskReminderJob");
const {
  addSecurityHeaders,
  createRateLimiter,
  requestLogger,
} = require("./middlewares/securityMiddleware");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const taskRoutes = require("./routes/taskRoutes")
const reportRoutes = require("./routes/reportRoutes")
const noticeRoutes = require("./routes/noticeRoutes")
const matterRoutes = require("./routes/matterRoutes")
const caseRoutes = require("./routes/caseRoutes")
const documentRoutes = require("./routes/documentRoutes")
const invoiceRoutes = require("./routes/invoiceRoutes")


const app = express();

app.disable("x-powered-by");

// Middleware to handle CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(requestLogger);
app.use(addSecurityHeaders);
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 120 }));

//Connect Database
connectDB();

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/matters", matterRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/invoices", invoiceRoutes);

//Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

app.use(notFoundHandler);
app.use(errorHandler);

//Start Server
const PORT = process.env.PORT || 5000;
startTaskReminderJob();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));