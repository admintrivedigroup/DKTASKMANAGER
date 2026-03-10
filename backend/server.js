if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");

// â­ SMTP DEBUG CHECK (safe output)
console.log("=== SMTP CONFIG CHECK ===");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "LOADED" : "MISSING");
console.log("=========================\n");

// 1ï¸âƒ£ Connect DB BEFORE importing routes/models
const connectDB = require("./config/db");
connectDB(); // MUST RUN BEFORE ROUTES

// Import middlewares
const { startTaskReminderJob } = require("./jobs/taskReminderJob");
require("./cron/weeklySummaryEmail.cron");
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
const emailRoutes = require("./routes/emailRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const roleRoutes = require("./routes/roleRoutes");
const weeklySummaryRoutes = require("./routes/weeklySummary.routes");
const dueDateRequestRoutes = require("./routes/dueDateRequestRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const { initSocket } = require("./utils/socket");

const app = express();
app.disable("x-powered-by");

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const cronEnabled = (() => {
  if (process.env.CRON_ENABLED === undefined) return true;
  return ["true", "1", "yes"].includes(
    String(process.env.CRON_ENABLED).toLowerCase()
  );
})();

// â­â­â­ UPTIMEROBOT IP ALLOWLIST â­â­â­
const uptimeRobotIPs = [
  "63.143.42.242",
  "69.162.124.226",
  "69.162.124.227",
  "69.162.124.228",
  "69.162.124.229",
  "69.162.124.230",
  "69.162.124.231",
  "69.162.124.232",
  "69.162.124.233",
  "69.162.124.234",
  "216.245.221.82",
  "216.245.221.83",
  "216.245.221.84",
  "216.245.221.85",
];

app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  if (uptimeRobotIPs.some((allowedIP) => ip?.includes(allowedIP))) {
    return next(); // allow UptimeRobot bypass
  }

  next();
});


// â­â­â­ HEALTH CHECK ROUTES â­â­â­

// Respond to GET /
app.get("/", (req, res) => {
  res.status(200).send("Backend is running!");
});

// Respond to HEAD / (UptimeRobot uses HEAD)
app.head("/", (req, res) => {
  res.status(200).end();
});


// â­â­â­ SECURITY, LOGGING, RATE LIMITING â­â­â­

const clientOrigins = [
  "https://triveditask.com",
  "https://www.triveditask.com",
  "http://localhost:5173",
];

// CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (clientOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Security middlewares
app.use(requestLogger);
app.use(addSecurityHeaders);
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 120 }));

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));


// â­â­â­ ROUTES â­â­â­
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/matters", matterRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/weekly-summary", weeklySummaryRoutes);
app.use("/api/due-date-requests", dueDateRequestRoutes);
app.use("/api/leaves", leaveRoutes);

// Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Error handlers (LAST)
app.use(notFoundHandler);
app.use(errorHandler);


// â­â­â­ START SERVER â­â­â­
const PORT = process.env.PORT || 3000;

if (cronEnabled) {
  require("./cron/weeklySummary.cron");
  require("./cron/dailyCompletedSummary.cron");
  startTaskReminderJob();
} else {
  console.warn("Cron jobs are disabled via CRON_ENABLED.");
}

const server = http.createServer(app);
initSocket(server, { corsOrigin: clientOrigins });

server.listen(PORT, () =>
  console.log(`dYs? Server running on port ${PORT}`)
);
