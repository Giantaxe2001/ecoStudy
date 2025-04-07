const express = require("express");
const router = express.Router();
const { createSchedule, updateSchedule, deleteSchedule, getScheduleByClass, getMySchedule } = require("../controllers/scheduleController");
const { protect, adminOnly, teacherOnly } = require("../middleware/authMiddleware");
const Schedule = require("../models/Schedule");
const Class = require("../models/Class");

// Admin hoặc Giáo viên tạo buổi học
router.post("/", protect, async (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ message: "Không có quyền thực hiện thao tác này!" });
  }
}, createSchedule);

// Admin hoặc Giáo viên cập nhật buổi học
router.put("/:scheduleId", protect, async (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ message: "Không có quyền thực hiện thao tác này!" });
  }
}, updateSchedule);

// Admin hoặc Giáo viên xóa buổi học
router.delete("/:scheduleId", protect, async (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ message: "Không có quyền thực hiện thao tác này!" });
  }
}, deleteSchedule);

// Giáo viên hoặc sinh viên xem lịch của lớp
router.get("/class/:classId", protect, getScheduleByClass);

// Sinh viên xem lịch học của mình
router.get("/me", protect, getMySchedule);

// Lấy danh sách buổi học
router.get("/upcoming", protect, async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    let query = {
      date: { $gte: today, $lte: nextWeek }
    };

    if (req.user.role === "teacher") {
      const classes = await Class.find({ teacherId: req.user._id });
      const classIds = classes.map(c => c._id);
      query.classId = { $in: classIds };
    }

    else if (req.user.role === "student") {
      const classes = await Class.find({ students: req.user._id });
      const classIds = classes.map(c => c._id);
      query.classId = { $in: classIds };
    }

    const schedules = await Schedule.find(query)
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .sort({ date: 1, startTime: 1 });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

module.exports = router;
