const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const subjectRoutes = require('./routes/subjects');
const assignmentRoutes = require('./routes/assignments');
const submissionRoutes = require('./routes/submissions');
const gradeRoutes = require('./routes/grades');
const attendanceRoutes = require('./routes/attendance');
const scheduleRoutes = require('./routes/schedules');
const notificationRoutes = require('./routes/notifications');
const fileRoutes = require('./routes/fileRoutes');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();

// Middleware
// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload
app.use(fileUpload());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS
app.use(cors());

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/files', fileRoutes);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!', error: err.message });
});

const PORT = process.env.PORT || 8041;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
