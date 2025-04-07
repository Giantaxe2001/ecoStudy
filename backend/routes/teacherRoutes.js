const express = require("express");
const {
    getMyClasses,
    getClassStudents,
    createAssignment,
    gradeAssignment,
    generateAttendanceCode,
    getAttendanceRecords,
    updateGrades
} = require("../controllers/teacherController");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('teacher'));

// Class management routes
router.get("/classes", getMyClasses);
router.get("/classes/:classId/students", getClassStudents);

// Assignment routes
router.post("/subjects/:subjectId/assignments", createAssignment);
router.put("/subjects/:subjectId/assignments/:assignmentId/submissions/:submissionId/grade", gradeAssignment);

// Attendance routes
router.post("/classes/:classId/attendance", generateAttendanceCode);
router.get("/classes/:classId/attendance", getAttendanceRecords);
router.get("/classes/:classId/subjects/:subjectId/attendance", getAttendanceRecords);

// Grade management routes
router.post("/subjects/:subjectId/grades", updateGrades);

module.exports = router;
