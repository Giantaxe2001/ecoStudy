const express = require("express");
const { 
  addGrade, 
  getStudentGrades, 
  getMyGrades, 
  updateGrade, 
  deleteGrade,
  getClassSubjectGrades,
  getAllStudentGrades
} = require("../controllers/gradeController");
const { protect, teacherOnly, adminOnly } = require("../middleware/authMiddleware");
const Grade = require("../models/Grade");
const Class = require("../models/Class");

const router = express.Router();

// Giáo viên nhập điểm
router.post("/", protect, teacherOnly, addGrade);

// Lấy điểm số gần đây
router.get("/recent", protect, async (req, res) => {
  try {
    let grades = [];
    
    if (req.user.role === "teacher") {
      const classes = await Class.find({ teacherId: req.user._id });
      const classIds = classes.map(c => c._id);
      grades = await Grade.find({ classId: { $in: classIds } })
        .populate('studentId', 'name')
        .populate('subjectId', 'name')
        .populate('classId', 'name')
        .sort({ createdAt: -1 })
        .limit(10);
    } else if (req.user.role === "student") {
      grades = await Grade.find({ studentId: req.user._id })
        .populate('subjectId', 'name')
        .populate('classId', 'name')
        .sort({ createdAt: -1 })
        .limit(10);
    }
    
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

router.get("/student/:studentId", protect, getStudentGrades);
router.get("/my-grades", protect, getMyGrades);
router.put("/:gradeId", protect, teacherOnly, updateGrade);
router.delete("/:gradeId", protect, teacherOnly, deleteGrade);
router.get("/class/:classId/subject/:subjectId", protect, teacherOnly, getClassSubjectGrades);



module.exports = router;
