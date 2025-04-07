const express = require("express");
const {
  getSubjects,
  createSubject,
  addSubjectToClass,
  updateSubject,
  deleteSubject
} = require("../controllers/subjectController"); // Đảm bảo đường dẫn đúng

const { protect, adminOnly } = require("../middleware/authMiddleware"); 

const router = express.Router();

// Public routes (protected but not admin-only)
router.get("/", protect, getSubjects);

// Admin routes
router.post("/admin", protect, adminOnly, createSubject);

router.post("/admin/add-class", protect, adminOnly, addSubjectToClass);
router.put("/admin/:subjectId", protect, adminOnly, updateSubject);
router.delete("/admin/:subjectId", protect, adminOnly, deleteSubject);

module.exports = router;
