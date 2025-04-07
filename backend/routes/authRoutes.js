const express = require("express");
const {
  signup,
  login,
  getTeachers,
  getStudents,
  getProfile,
  updateProfile,
  updateUser,
  changePassword
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Class = require("../models/Class");
const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes
router.use(protect);
router.get("/teachers", getTeachers);
router.get("/students", getStudents);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/users/:id", updateUser);
router.put("/change-password", changePassword);

// Teacher route to update student information
router.put("/teacher/students/:id", async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Chỉ giáo viên mới có thể truy cập!" });
    }
    
    const studentId = req.params.id;
    const { name, email } = req.body;
    
    // Check if the student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên!" });
    }
    
    // Check if the student is in one of the teacher's classes
    const teacherClasses = await Class.find({ teacherId: req.user._id });
    const classIds = teacherClasses.map(c => c._id.toString());
    
    // Check if student is in any of the teacher's classes
    const studentInClass = await Class.findOne({
      _id: { $in: classIds },
      students: studentId
    });
    
    if (!studentInClass) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa thông tin của sinh viên này!" });
    }
    
    // Update student information
    if (email && email !== student.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: studentId } });
      if (emailExists) {
        return res.status(400).json({ message: "Email đã tồn tại!" });
      }
      student.email = email;
    }
    
    student.name = name || student.name;
    await student.save();
    
    res.json({
      message: "Cập nhật thông tin sinh viên thành công!",
      user: {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// Get students taught by a teacher
router.get("/teacher/students", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Chỉ giáo viên mới có thể truy cập!" });
    }
    
    // Find all classes taught by this teacher
    const classes = await Class.find({ teacherId: req.user._id });
    const classIds = classes.map(c => c._id);
    
    // Find all students in these classes
    const studentIds = classes.reduce((acc, c) => {
      if (c.students && c.students.length) {
        return [...acc, ...c.students];
      }
      return acc;
    }, []);
    
    // Remove duplicates
    const uniqueStudentIds = [...new Set(studentIds.map(id => id.toString()))];
    
    // Get student details
    const students = await User.find({ 
      _id: { $in: uniqueStudentIds },
      role: "student"
    }).select('name email');
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// Search for students
router.get("/search/students", async (req, res) => {
  try {
    const { query } = req.query;
    
    console.log('Search query:', query);
    
    if (!query || query.trim().length < 2) {
      console.log('Search query too short');
      return res.json([]);
    }
    
    // Search students by name or email
    const students = await User.find({
      role: "student",
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('_id name email').limit(20);
    
    console.log(`Found ${students.length} students matching "${query}"`);
    console.log('Students:', students);
    
    // Return the results directly as an array
    res.json(students);
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// Get all students not in a specific class
router.get("/students-not-in-class/:classId", async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Find the class to get its students
    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({ message: "Không tìm thấy lớp học!" });
    }
    
    // Get the IDs of students already in the class
    const classStudentIds = foundClass.students.map(id => id.toString());
    console.log(`Class ${classId} has ${classStudentIds.length} students`);
    
    // Find all students not in this class
    // This includes students with empty classes array or classes array that doesn't include this class
    const students = await User.find({
      role: "student",
      $or: [
        { classes: { $exists: false } },
        { classes: { $size: 0 } },
        { classes: { $nin: [classId] } }
      ]
    }).select('_id name email studentId').limit(50);
    
    console.log(`Found ${students.length} students not in class ${classId}`);
    
    res.json(students);
  } catch (error) {
    console.error('Error getting students not in class:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// Development route to create test students (should be removed in production)
router.post("/dev/create-test-students", async (req, res) => {
  try {
    console.log('Creating test students...');
    const testStudents = [
      { name: "Nguyễn Văn A", email: "nguyenvana@example.com", password: "password123", role: "student" },
      { name: "Trần Thị B", email: "tranthib@example.com", password: "password123", role: "student" },
      { name: "Lê Văn C", email: "levanc@example.com", password: "password123", role: "student" },
      { name: "Phạm Thị D", email: "phamthid@example.com", password: "password123", role: "student" },
      { name: "Hoàng Văn E", email: "hoangvane@example.com", password: "password123", role: "student" },
    ];

    const createdStudents = [];
    
    for (const student of testStudents) {
      // Check if student already exists
      const existingUser = await User.findOne({ email: student.email });
      if (existingUser) {
        console.log(`Student ${student.email} already exists`);
        createdStudents.push({ ...student, _id: existingUser._id, status: "already exists" });
        continue;
      }
      
      // Create new student
      const newUser = new User(student);
      await newUser.save();
      console.log(`Created student ${student.email}`);
      createdStudents.push({ ...student, _id: newUser._id, status: "created" });
    }
    
    console.log(`Created/found ${createdStudents.length} test students`);
    res.status(201).json({ 
      message: "Test students created successfully", 
      students: createdStudents 
    });
  } catch (error) {
    console.error('Error creating test students:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

module.exports = router;
