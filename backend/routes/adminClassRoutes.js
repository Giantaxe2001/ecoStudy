const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
    createClass,
    updateClass,
    deleteClass,
    addStudentToClass,
    removeStudentFromClass
} = require("../controllers/classController");

const router = express.Router();

// Admin - Tạo, sửa, xóa lớp học
router.post("/", protect, createClass);         // Tạo lớp học
router.patch("/:classId", protect, updateClass); // Cập nhật lớp học
router.delete("/:classId", protect, deleteClass); // Xóa lớp học

// Admin - Thêm/xóa sinh viên vào/khỏi lớp
router.post("/:classId/add-student", protect, addStudentToClass);
router.delete("/:classId/remove-student", protect, removeStudentFromClass);

module.exports = router;
