const express = require("express");
const { 
  createAssignment, 
  updateAssignment, 
  deleteAssignment,
  getAssignments
} = require("../controllers/assignmentController");
const { protect, teacherOnly } = require("../middleware/authMiddleware");
const Assignment = require("../models/Assignment");
const Class = require("../models/Class");
const submissionController = require("../controllers/submissionController");

const router = express.Router();

router.get("/", protect, getAssignments);
router.get("/upcoming", protect, async (req, res) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let query = {
      dueDate: { $gt: now, $lt: nextWeek }
    };
    if (req.user.role === "student") {
      const classes = await Class.find({ students: req.user._id });
      const classIds = classes.map(c => c._id);
      query.classId = { $in: classIds };
    }
    else if (req.user.role === "teacher") {
      const classes = await Class.find({ teacherId: req.user._id });
      const classIds = classes.map(c => c._id);
      query.classId = { $in: classIds };
    }

    const assignments = await Assignment.find(query)
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .sort({ dueDate: 1 })
      .limit(5);

    res.json(assignments);
  } catch (error) {
    console.error('Error getting upcoming assignments:', error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách bài tập sắp đến hạn" });
  }
});


router.post("/", protect, teacherOnly, createAssignment);


router.put("/:id", protect, teacherOnly, updateAssignment);
router.patch("/:id", protect, teacherOnly, updateAssignment);


router.delete("/:id", protect, teacherOnly, deleteAssignment);


router.get("/class/:classId", protect, async (req, res) => {
  try {
    const { classId } = req.params;
    
    if (req.user.role === "student") {
      const studentClass = await Class.findOne({ 
        _id: classId,
        students: req.user._id
      });
      
      if (!studentClass) {
        return res.status(403).json({ message: "Bạn không có quyền xem bài tập của lớp này!" });
      }
    } else if (req.user.role === "teacher") {
      const teacherClass = await Class.findOne({
        _id: classId,
        teacherId: req.user._id
      });
      
      if (!teacherClass) {
        return res.status(403).json({ message: "Bạn không phải là giáo viên của lớp này!" });
      }
    }
    

    const assignments = await Assignment.find({ classId })
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ assignments, message: "Lấy danh sách bài tập thành công" });
  } catch (error) {
    console.error('Error getting class assignments:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});


router.get("/upcoming", protect, async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    let query = {
      dueDate: { $gte: today, $lte: nextWeek }
    };


    if (req.user.role === "teacher") {
      query.teacherId = req.user._id;
    }

    else if (req.user.role === "student") {
      const classes = await Class.find({ students: req.user._id });
      const classIds = classes.map(c => c._id);
      query.classId = { $in: classIds };
    }

    const assignments = await Assignment.find(query)
      .populate('classId', 'name')
      .sort({ dueDate: 1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findById(id)
      .populate('classId', 'name')
      .populate('teacherId', 'name email')
      .populate('subjectId', 'name');
      
    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập!" });
    }
    
    if (req.user.role === 'student') {
      const Submission = require('../models/Submission');
      const submission = await Submission.findOne({ 
        assignmentId: id,
        studentId: req.user.id
      });
      
      if (submission) {
        assignment.submission = submission;
      }
    }
    
    res.json({ assignment });
  } catch (error) {
    console.error('Error getting assignment details:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

const { submitAssignment } = require("../controllers/submissionController");
router.post("/:assignmentId/submit", protect, submitAssignment);


router.get("/:assignmentId/submissions", protect, submissionController.getSubmissions);


module.exports = router;
