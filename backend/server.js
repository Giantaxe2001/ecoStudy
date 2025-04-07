const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require("http"); // 
const socketIo = require("socket.io"); // 

dotenv.config();
connectDB();

const app = express();

// CORS middleware - must be before any routes
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Create HTTP server and socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// Socket connection handling
const userSockets = {};
io.on("connection", (socket) => {
  console.log(" User connected:", socket.id);

  // userId socketId 
  socket.on("register", (userId) => {
    userSockets[userId] = socket.id;
  });

  socket.on("disconnect", () => {
    console.log(" User disconnected:", socket.id);
    for (let userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
      }
    }
  });
});

// Import Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminClassRoutes = require("./routes/adminClassRoutes");
const adminSubjectRoutes = require("./routes/adminSubjectRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const gradeRoutes = require("./routes/gradeRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const classRoutes = require("./routes/classRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const userRoutes = require("./routes/userRoutes");
const fileRoutes = require("./routes/fileRoutes");

// Middleware logging cho debug
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Use Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin/classes", adminClassRoutes);
app.use("/api/v1/admin/subjects", adminSubjectRoutes);
app.use("/api/v1/teacher", teacherRoutes);
app.use("/api/v1/student", studentRoutes);
app.use("/api/v1/classes", classRoutes);
app.use("/api/v1/grades", gradeRoutes);
app.use("/api/v1/subjects", subjectRoutes);
app.use("/api/v1/schedules", scheduleRoutes);
app.use("/api/v1/assignments", assignmentRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/files", fileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Start server
const PORT = process.env.PORT || 8041;
server.listen(PORT, () => console.log(` Server running on http://localhost:${PORT}`));

// Export necessary variables
module.exports = { app, server, io };
