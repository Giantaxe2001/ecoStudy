const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
    createSubject,
    updateSubject,
    deleteSubject,
    addSubjectToClass
} = require("../controllers/subjectController");

const router = express.Router();

// Admin - Tạo, sửa, xóa môn học
router.post("/", protect, createSubject);         
router.patch("/:subjectId", protect, updateSubject); 
router.put("/:subjectId", protect, updateSubject); 
router.delete("/:subjectId", protect, deleteSubject); 

// Admin - Thêm môn học vào lớp
router.post("/add-class", protect, addSubjectToClass);

module.exports = router;
