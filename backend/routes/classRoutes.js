const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Class = require("../models/Class");
const Grade = require("../models/Grade");
const User = require("../models/User"); // Added User model
const {
    createClass, updateClass, deleteClass,
    addStudentToClass, getClasses, getClassById, getClassStats
} = require("../controllers/classController");

const router = express.Router();

// Create a separate router for the teacher endpoint
const teacherRouter = express.Router();
router.use('/teacher', teacherRouter);

// 🌟 Lấy danh sách lớp của giáo viên
teacherRouter.get("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Chỉ giáo viên mới có thể truy cập!" });
    }
    
    const classes = await Class.find({ teacherId: req.user._id })
      .populate('students', 'name email')
      .populate('subjects', 'name code');
    
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// 🌟 Giáo viên - Cập nhật thông tin lớp học
teacherRouter.patch("/:classId", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Chỉ giáo viên mới có thể truy cập!" });
    }
    
    const classId = req.params.classId;
    const { name, description } = req.body;
    
    // Tìm lớp học và kiểm tra quyền
    const classObj = await Class.findById(classId);
    if (!classObj) {
      return res.status(404).json({ message: "Không tìm thấy lớp học!" });
    }
    
    // Kiểm tra xem giáo viên có phải là người phụ trách lớp này không
    if (classObj.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa lớp học này!" });
    }
    
    // Cập nhật thông tin lớp học
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      updateData,
      { new: true }
    );
    
    res.json({ 
      message: "Cập nhật thông tin lớp học thành công!", 
      class: updatedClass 
    });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// 🌟 Admin - Tạo, sửa, xóa lớp học
router.post("/", protect, createClass);         // Tạo lớp học
router.patch("/:classId", protect, updateClass); // Cập nhật lớp học
router.delete("/:classId", protect, deleteClass); // Xóa lớp học

// 🌟 Admin - Thêm sinh viên vào lớp
router.post("/:classId/add-student", protect, addStudentToClass);

// 🌟 Giáo viên & Sinh viên - Xem danh sách lớp
router.get("/", protect, getClasses);

router.get("/:classId", protect, getClassById);
router.get("/:classId/stats", protect, getClassStats);

// 🌟 Xem danh sách môn học và sinh viên của lớp
router.get("/:classId/subjects", protect, async (req, res) => {
    try {
        const classId = req.params.classId;
        const foundClass = await Class.findById(classId).populate('subjects', 'name code description');
        
        if (!foundClass) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }

        res.json({ message: "Danh sách môn học!", subjects: foundClass.subjects || [] });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error });
    }
});

router.get("/:classId/students", protect, async (req, res) => {
    try {
        const classId = req.params.classId;
        const foundClass = await Class.findById(classId);
        
        if (!foundClass) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }

        // Get the list of student IDs from the class
        const studentIds = foundClass.students || [];
        
        // Fetch only the students that are in the studentIds array
        const students = await User.find({ 
            _id: { $in: studentIds },
            role: 'student'
        }).select('name email studentId phone');
        
        console.log(`Found ${students.length} students in class ${classId}`);
        
        res.json({ message: "Danh sách sinh viên!", students: students || [] });
    } catch (error) {
        console.error('Error fetching class students:', error);
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
});

// Update student information (for teachers)
router.put("/:classId/students/:studentId", protect, async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        const { name, email } = req.body;
        
        // Check if class exists
        const foundClass = await Class.findById(classId);
        if (!foundClass) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }
        
        // Check if user is teacher of this class
        if (req.user.role !== "admin" && foundClass.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa thông tin của lớp này!" });
        }
        
        // Check if student is in this class
        if (!foundClass.students.includes(studentId)) {
            return res.status(404).json({ message: "Sinh viên không thuộc lớp này!" });
        }
        
        // Find and update student
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Không tìm thấy sinh viên!" });
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
            student: {
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

// 🌟 Xem điểm số theo lớp và môn học
router.get("/:classId/subjects/:subjectId/grades", protect, async (req, res) => {
    try {
        const { classId, subjectId } = req.params;
        const foundClass = await Class.findById(classId).populate('students');
        
        if (!foundClass) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }

        const grades = await Grade.find({
            student: { $in: foundClass.students.map(s => s._id) },
            subject: subjectId
        })
        .populate('student', 'name email studentId')
        .populate('assignmentId', 'title totalPoints')
        .populate('subject', 'name');

        res.json({ message: "Danh sách điểm số!", grades: grades || [] });
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ message: "Lỗi server!", error });
    }
});

module.exports = router;
