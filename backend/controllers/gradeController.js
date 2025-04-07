const Grade = require("../models/Grade");
const User = require("../models/User");
const Subject = require("../models/Subject");
const Assignment = require("../models/Assignment");
const Class = require("../models/Class");

// Admin lấy tất cả điểm của sinh viên
const getAllStudentGrades = async (req, res) => {
  try {
    // Kiểm tra quyền admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Không có quyền truy cập!" });
    }

    const { page = 1, limit = 10, search, classId, subjectId, type } = req.query;
    const query = {};

    // Lọc theo lớp nếu có
    if (classId) {
      query.classId = classId;
    }

    // Lọc theo môn học nếu có
    if (subjectId) {
      query.subject = subjectId;
    }

    // Lọc theo loại điểm nếu có
    if (type) {
      query.type = type;
    }

    // Tìm kiếm theo tên học sinh
    if (search) {
      const students = await User.find({
        name: { $regex: search, $options: 'i' },
        role: 'student'
      }).select('_id');
      query.student = { $in: students.map(s => s._id) };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'student', select: 'name email' },
        { path: 'subject', select: 'name' },
        { path: 'teacher', select: 'name' },
        { path: 'assignmentId', select: 'title totalPoints' },
        { path: 'classId', select: 'name' }
      ]
    };

    const grades = await Grade.paginate(query, options);

    res.status(200).json({
      message: "Danh sách điểm của tất cả sinh viên",
      data: grades.docs,
      pagination: {
        totalDocs: grades.totalDocs,
        limit: grades.limit,
        totalPages: grades.totalPages,
        page: grades.page,
        hasPrevPage: grades.hasPrevPage,
        hasNextPage: grades.hasNextPage,
        prevPage: grades.prevPage,
        nextPage: grades.nextPage
      }
    });
  } catch (error) {
    console.error("Error getting all student grades:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Giáo viên nhập điểm cho học sinh
const addGrade = async (req, res) => {
  try {
    const { studentId, subjectId, score, feedback, type, assignmentId } = req.body;
    const teacherId = req.user.id;

    if (!studentId || !subjectId || score === undefined) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }

    const student = await User.findById(studentId);
    const subject = await Subject.findById(subjectId);
    if (!student || student.role !== "student") return res.status(404).json({ message: "Không tìm thấy học sinh!" });
    if (!subject) return res.status(404).json({ message: "Không tìm thấy môn học!" });

    const gradeData = { 
      student: studentId, 
      subject: subjectId, 
      grade: score, 
      comment: feedback, 
      teacher: teacherId,
      type: type || "general"
    };

    if (type === "assignment" && assignmentId) {
      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Không tìm thấy bài tập!" });
      }

      if (assignment.subjectId && assignment.subjectId.toString() !== subjectId) {
        return res.status(400).json({ message: "Bài tập không thuộc môn học này!" });
      }
      
      gradeData.assignmentId = assignmentId;
      gradeData.classId = assignment.classId;
      gradeData.title = assignment.title;
    }


    const newGrade = await Grade.create(gradeData);
    const populatedGrade = await Grade.findById(newGrade._id)
      .populate("student", "name")
      .populate("subject", "name")
      .populate("teacher", "name");

    res.status(201).json({ message: "Nhập điểm thành công!", grade: populatedGrade });
  } catch (error) {
    console.error("Error adding grade:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Lấy danh sách điểm của một học sinh theo ID
const getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Không tìm thấy học sinh!" });
    }

    const grades = await Grade.find({ student: studentId })
      .populate("subject", "name")
      .populate("teacher", "name")
      .populate("assignmentId", "title totalPoints");

    res.status(200).json({ message: "Danh sách điểm số của học sinh", grades });
  } catch (error) {
    console.error("Error getting student grades:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Học sinh xem điểm của mình
const getMyGrades = async (req, res) => {
  try {
    const studentId = req.user.id; // Lấy ID từ token

    // Tìm các lớp học mà học sinh đang tham gia
    const enrolledClasses = await Class.find({ students: studentId }).select('subjects');
    
    // Lấy danh sách ID của các môn học từ các lớp mà học sinh đang tham gia
    const enrolledSubjectIds = [];
    enrolledClasses.forEach(cls => {
      cls.subjects.forEach(subjectId => {
        if (!enrolledSubjectIds.includes(subjectId.toString())) {
          enrolledSubjectIds.push(subjectId.toString());
        }
      });
    });

    console.log(`Học sinh ${studentId} có thể xem điểm của ${enrolledSubjectIds.length} môn học`);

    // Chỉ lấy điểm của các môn học thuộc lớp mà học sinh đang học
    const grades = await Grade.find({ 
      student: studentId,
      subject: { $in: enrolledSubjectIds }
    })
      .populate("subject", "name")
      .populate("teacher", "name")
      .populate("assignmentId", "title totalPoints");

    console.log(`Tìm thấy ${grades.length} điểm số thuộc các lớp đang học`);
    
    res.status(200).json({ message: "Danh sách điểm số của bạn", grades });
  } catch (error) {
    console.error("Error getting my grades:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Giáo viên cập nhật điểm số
const updateGrade = async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { score, feedback, type } = req.body;
    const teacherId = req.user.id;

  
    const grade = await Grade.findById(gradeId);
    if (!grade) {
      return res.status(404).json({ message: "Không tìm thấy điểm số!" });
    }

    if (req.user.role !== "admin" && grade.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật điểm số này!" });
    }

    // Cập nhật điểm số
    const updateData = {};
    if (score !== undefined) updateData.grade = score;
    if (feedback !== undefined) updateData.comment = feedback;
    if (type) updateData.type = type;

    const updatedGrade = await Grade.findByIdAndUpdate(
      gradeId,
      updateData,
      { new: true }
    )
      .populate("student", "name")
      .populate("subject", "name")
      .populate("teacher", "name")
      .populate("assignmentId", "title totalPoints");

    res.status(200).json({ message: "Cập nhật điểm số thành công!", grade: updatedGrade });
  } catch (error) {
    console.error("Error updating grade:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Giáo viên xóa điểm số
const deleteGrade = async (req, res) => {
  try {
    const { gradeId } = req.params;
    const teacherId = req.user.id;

    // Tìm điểm số cần xóa
    const grade = await Grade.findById(gradeId);
    if (!grade) {
      return res.status(404).json({ message: "Không tìm thấy điểm số!" });
    }

    // Kiểm tra quyền xóa (chỉ giáo viên tạo điểm hoặc admin)
    if (req.user.role !== "admin" && grade.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: "Bạn không có quyền xóa điểm số này!" });
    }

    // Xóa điểm số
    await Grade.findByIdAndDelete(gradeId);

    res.status(200).json({ message: "Xóa điểm số thành công!" });
  } catch (error) {
    console.error("Error deleting grade:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Lấy điểm số của một lớp học cho một môn học cụ thể
const getClassSubjectGrades = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    
    const classObj = await Class.findById(classId).populate('students');
    const subject = await Subject.findById(subjectId);
    
    if (!classObj) {
      return res.status(404).json({ message: "Không tìm thấy lớp học!" });
    }
    
    if (!subject) {
      return res.status(404).json({ message: "Không tìm thấy môn học!" });
    }
    
    if (!classObj.students || classObj.students.length === 0) {
      return res.json({ grades: [] }); 
    }
    
    const studentIds = classObj.students.map(student => student._id);
    const grades = await Grade.find({
      student: { $in: studentIds },
      subject: subjectId
    })
      .populate("student", "name email studentId")
      .populate("teacher", "name")
      .populate("assignmentId", "title totalPoints")
      .sort({ createdAt: -1 });
    
    res.json({ grades: grades || [] });
  } catch (error) {
    console.error("Error getting class subject grades:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

module.exports = { 
  addGrade, 
  getStudentGrades, 
  getMyGrades, 
  updateGrade, 
  deleteGrade,
  getClassSubjectGrades
};
