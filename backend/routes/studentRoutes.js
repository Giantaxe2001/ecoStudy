const express = require("express");
const {
    getMySchedule,
    submitAttendance,
    getMyGrades,
    getMyAssignments,
    submitAssignment,
    getStudentGradesByAssignment
} = require("../controllers/studentController");
const Grade = require("../models/Grade");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('student'));

// Schedule routes
router.get("/schedule", getMySchedule);

// Classes routes
router.get("/classes", async (req, res) => {
  try {
    const classes = await Class.find({ students: req.user.id })
      .populate('subjects', 'name description')
      .select('name description students subjects schedule');

    res.status(200).json({ classes });
  } catch (error) {
    console.error('Error getting student classes:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// Attendance routes
router.post("/attendance", submitAttendance);

// Grade routes
// Get student grades by assignment
router.get("/grades/assignments", getStudentGradesByAssignment);

// Get student grades by class or subject
router.get("/grades", async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    const studentId = req.user._id;
    
    let query = { studentId };
    
    if (classId) {
      query.classId = classId;
    }
    
    if (subjectId) {
      query.subjectId = subjectId;
    }
    
    const grades = await Grade.find(query)
      .populate({
        path: 'assignmentId',
        select: 'title description dueDate totalPoints'
      })
      .populate('subjectId', 'name')
      .populate('classId', 'name')
      .sort({ createdAt: -1 });
    
    // Format response to match frontend expectations
    const assignments = grades.map(grade => ({
      _id: grade._id,
      title: grade.title || (grade.assignmentId ? grade.assignmentId.title : 'Bài tập không xác định'),
      description: grade.comment || (grade.assignmentId ? grade.assignmentId.description : ''),
      dueDate: grade.assignmentId ? grade.assignmentId.dueDate : null,
      subject: grade.subject,
      grade: grade.grade, // Sử dụng trường grade thay vì score
      totalPoints: grade.assignmentId ? grade.assignmentId.totalPoints : 100,
      maxScore: grade.assignmentId ? grade.assignmentId.totalPoints : 100,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt
    }));
    
    res.status(200).json({ assignments });
  } catch (error) {
    console.error('Error getting student grades by class/subject:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// Assignment routes
router.get("/assignments", getMyAssignments);
router.post("/subjects/:subjectId/assignments/:assignmentId/submit", submitAssignment);

module.exports = router;
