const express = require("express");
const {
    createUser,
    getUsersByRole,
    updateUser,
    deleteUser,
    createClass,
    createSubject,
    updateClassSchedule,
    changeUserPassword,
    getAllClasses,
    getAllSubjects,
    assignStudentToClasses
} = require("../controllers/adminController");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('admin'));

// User management routes
router.post("/users", createUser);
router.get("/users/:role", getUsersByRole);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.put("/users/:id/change-password", changeUserPassword);

// Class management routes
router.get("/classes", getAllClasses);
router.post("/classes", createClass);
router.put("/classes/:classId/schedule", updateClassSchedule);

// Student class assignment
router.put("/students/:studentId/classes", assignStudentToClasses);

// Subject management routes
router.get("/subjects", getAllSubjects);
router.post("/subjects", createSubject);

module.exports = router;
