const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  submitAttendance,
  getAttendanceStats,
  getAttendanceHistory,
  generateAttendanceCode,
  closeAttendance,
  getClassAttendance,
  refreshAttendanceCode,
  getAttendanceDetails,
  markAttendanceManually,
  checkInAttendance
} = require('../controllers/attendanceController');

router.use(protect);
router.route('/student/submit')
  .post(authorize('student'), checkInAttendance);

router.route('/stats')
  .get(authorize('student'), getAttendanceStats);

router.route('/history')
  .get(authorize('student'), getAttendanceHistory);

router.route('/generate')
  .post(authorize('teacher'), generateAttendanceCode);

router.route('/class/:classId')
  .get(getClassAttendance);

router.route('/close/:id')
  .post(authorize('teacher'), closeAttendance);

router.route('/refresh/:id')
  .post(refreshAttendanceCode);

router.route('/details/:id')
  .get(authorize('teacher', 'admin'),getAttendanceDetails);

router.route('/mark-manual')
  .post(markAttendanceManually);

module.exports = router;
