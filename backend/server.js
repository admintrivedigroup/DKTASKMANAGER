require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// 1️⃣ Connect DB BEFORE importing routes/models
const connectDB = require("./config/db");
connectDB(); // MUST RUN BEFORE ROUTES

// Import middlewares
const { startTaskReminderJob } = require("./jobs/taskReminderJob");
const {
  addSecurityHeaders,
  createRateLimiter,
  requestLogger,
} = require("./middlewares/securityMiddleware");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const matterRoutes = require("./routes/matterRoutes");
const caseRoutes = require("./routes/caseRoutes");
const documentRoutes = require("./routes/documentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

const app = express();
app.disable("x-powered-by");


// ⭐⭐⭐ HEALTH CHECK ROUTES — MUST BE BEFORE ANY SECURITY MIDDLEWARE ⭐⭐⭐

// Respond to GET /
app.get("/", (req, res) => {
  res.status(200).send("Backend is running!");
});

// Respond to HEAD / (UptimeRobot uses HEAD)
app.head("/", (req, res) => {
  res.status(200).end();
});


// ⭐⭐⭐ SECURITY, LOGGING, RATE LIMITING — AFTER HEALTH CHECK ⭐⭐⭐

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security middlewares
app.use(requestLogger);
app.use(addSecurityHeaders);
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 120 }));

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));


// ⭐⭐⭐ ROUTES ⭐⭐⭐

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/matters", matterRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/invoices", invoiceRoutes);


// Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Error handlers (LAST)
app.use(notFoundHandler);
app.use(errorHandler);


// ⭐⭐⭐ START SERVER ⭐⭐⭐

const PORT = process.env.PORT || 10000;
startTaskReminderJob();

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
