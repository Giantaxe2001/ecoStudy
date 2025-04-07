
const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { protect } = require('../middleware/authMiddleware');
const { studentMiddleware, teacherMiddleware } = require('../middleware/roleMiddleware');

// Sinh viên nộp bài tập (endpoint dự phòng)
router.post('/assignments/:assignmentId/submit', protect, studentMiddleware, submissionController.submitAssignment);

// Lấy danh sách bài nộp của một bài tập (endpoint dự phòng)
router.get('/assignments/:assignmentId', protect, submissionController.getSubmissions);
router.get('/assignments/:assignmentId/submissions', protect, submissionController.getSubmissions);
router.get('/assignment/:assignmentId', protect, submissionController.getSubmissions);

// Xóa bài nộp
router.delete('/:submissionId', protect, studentMiddleware, submissionController.deleteSubmission);

// Giáo viên chấm điểm bài nộp
router.post('/:submissionId/grade', protect, teacherMiddleware, submissionController.gradeSubmission);

module.exports = router;
