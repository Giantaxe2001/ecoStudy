const Class = require("../models/Class");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Subject = require("../models/Subject");

// Giáo viên tạo mã điểm danh cho lớp học
exports.generateAttendanceCode = async (req, res) => {
  try {
    const { classId, subjectId } = req.body;
    const { duration = 15, allowLate = true } = req.body;


    const classObj = await Class.findById(classId);
    if (!classObj) return res.status(404).json({ message: "Lớp học không tồn tại!" });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Môn học không tồn tại!" });


    if (req.user.role !== "admin" && !classObj.teacherId?.equals(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền tạo mã điểm danh cho lớp này!" });
    }


    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
 
    const existingAttendance = await Attendance.findOne({
      classId,
      subjectId,
      isActive: true
    });

    if (existingAttendance) {
      return res.status(400).json({ message: "Đã có phiên điểm danh đang hoạt động cho lớp và môn học này!" });
    }


    const attendance = await Attendance.create({
      classId,
      subjectId,
      teacherId: req.user._id,
      code,
      duration,
      allowLate,
      expiresAt: new Date(Date.now() + duration * 60000), // Convert minutes to milliseconds
      isActive: true,
      date: new Date(),
      totalStudents: classObj.students.length,
      attendedCount: 0
    });

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Error generating attendance code:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Sinh viên điểm danh
exports.checkInAttendance = async (req, res) => {
  try {
    const { code } = req.body;
    const studentId = req.user._id;


    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã điểm danh'
      });
    }


    const attendance = await Attendance.findOne({ code: code.trim().toUpperCase() });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Mã điểm danh không hợp lệ'
      });
    }

    const existingAttendance = attendance.attendances.find(
      a => a.studentId.toString() === studentId.toString()
    );

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã điểm danh rồi'
      });
    }


    attendance.attendances.push({
      studentId,
      status: 'present',
      checkedInAt: new Date()
    });

    attendance.attendedCount = (attendance.attendedCount || 0) + 1;
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Điểm danh thành công'
    });

  } catch (error) {
    console.error('Lỗi điểm danh:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

// Giáo viên xem danh sách điểm danh của lớp
exports.getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    
  
    const classObj = await Class.findById(classId);
    if (!classObj) return res.status(404).json({ message: "Lớp học không tồn tại!" });


    if (req.user.role !== "admin" && !classObj.teacherId.equals(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền xem danh sách điểm danh!" });
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find({ classId })
      .populate('subjectId', 'name')
      .populate('attendances.studentId', 'name email studentId')
      .populate('teacherId', 'name')
      .sort({ date: -1 });

    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error('Error getting class attendance:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Giáo viên đóng phiên điểm danh
exports.closeAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy phiên điểm danh!" });
    }

    // Check teacher permission
    if (req.user.role !== "admin" && !attendance.teacherId.equals(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền đóng phiên điểm danh này!" });
    }

    attendance.isActive = false;
    await attendance.save();

    res.status(200).json({ message: "Đã đóng phiên điểm danh!" });
  } catch (error) {
    console.error('Error closing attendance:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

//Giáo viên làm mới mã điểm danh
exports.refreshAttendanceCode = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy phiên điểm danh!" });
    }

    // Check teacher permission
    if (req.user.role !== "admin" && !attendance.teacherId.equals(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền làm mới mã điểm danh này!" });
    }

    // Check if attendance is still active
    if (!attendance.isActive) {
      return res.status(400).json({ message: "Phiên điểm danh đã đóng!" });
    }

    // Generate new code and update expiry
    attendance.code = Math.random().toString(36).substring(2, 8).toUpperCase();
    attendance.expiresAt = new Date(Date.now() + attendance.duration * 60000);
    await attendance.save();

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Error refreshing attendance code:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

//Giáo viên xem chi tiết điểm danh với danh sách học sinh
exports.getAttendanceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Tìm bản ghi điểm danh
    const attendance = await Attendance.findById(id)
      .populate('subjectId', 'name')
      .populate('teacherId', 'name')
      .populate('classId');
    
    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy phiên điểm danh!" });
    }

    // Kiểm tra quyền giáo viên - Cho phép tất cả giáo viên xem chi tiết điểm danh
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ message: "Bạn không có quyền xem chi tiết điểm danh này!" });
    }

    // Lấy danh sách học sinh trong lớp
    const classObj = await Class.findById(attendance.classId)
      .populate('students', 'name email studentId');
    
    if (!classObj) {
      return res.status(404).json({ message: "Lớp học không tồn tại!" });
    }

    // Tạo danh sách học sinh đã điểm danh và chưa điểm danh
    const attendedStudents = [];
    const absentStudents = [];

    // Tạo map các học sinh đã điểm danh
    const attendedMap = new Map();
    attendance.attendances.forEach(record => {
      attendedMap.set(record.studentId.toString(), record);
    });

    // Phân loại học sinh
    classObj.students.forEach(student => {
      const studentId = student._id.toString();
      const attendanceRecord = attendedMap.get(studentId);
      
      if (attendanceRecord) {
        attendedStudents.push({
          _id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId,
          checkedInAt: attendanceRecord.checkedInAt,
          status: attendanceRecord.status
        });
      } else {
        absentStudents.push({
          _id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId
        });
      }
    });

    res.status(200).json({
      attendance,
      attendedStudents,
      absentStudents
    });
  } catch (error) {
    console.error('Error getting attendance details:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

//Giáo viên điểm danh thủ công cho học sinh
exports.markAttendanceManually = async (req, res) => {
  try {
    const { attendanceId, studentId, status = "present" } = req.body;
    
    // Tìm bản ghi điểm danh
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy phiên điểm danh!" });
    }

    // Kiểm tra quyền giáo viên
    if (req.user.role !== "admin" && !attendance.teacherId.equals(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền điểm danh thủ công!" });
    }

    // Kiểm tra học sinh có trong lớp không
    const classObj = await Class.findById(attendance.classId);
    if (!classObj.students.some(student => student.toString() === studentId)) {
      return res.status(400).json({ message: "Học sinh không thuộc lớp này!" });
    }

    // Kiểm tra học sinh đã điểm danh chưa
    const existingAttendanceIndex = attendance.attendances.findIndex(
      a => a.studentId.toString() === studentId
    );

    if (existingAttendanceIndex >= 0) {
      // Cập nhật trạng thái nếu đã điểm danh
      attendance.attendances[existingAttendanceIndex].status = status;
    } else {
      // Thêm mới nếu chưa điểm danh
      attendance.attendances.push({
        studentId,
        status,
        checkedInAt: new Date()
      });
      attendance.attendedCount += 1;
    }

    await attendance.save();
    res.status(200).json({ message: "Đã cập nhật điểm danh thủ công!" });
  } catch (error) {
    console.error('Error marking attendance manually:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Lấy thống kê điểm danh của sinh viên

exports.getAttendanceStats = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Lấy tất cả điểm danh của sinh viên
    const attendances = await Attendance.find({
      'attendances.studentId': studentId
    });

    // Tính toán thống kê
    const stats = {
      totalSessions: attendances.length,
      present: attendances.filter(a => 
        a.attendances.some(att => 
          att.studentId.equals(studentId) && att.status === 'present'
        )
      ).length,
      late: attendances.filter(a => 
        a.attendances.some(att => 
          att.studentId.equals(studentId) && att.status === 'late'
        )
      ).length,
      absent: attendances.filter(a => 
        !a.attendances.some(att => att.studentId.equals(studentId))
      ).length
    };

    stats.presentRate = ((stats.present + stats.late) / stats.totalSessions * 100).toFixed(1);

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({ message: "Lỗi khi lấy thống kê điểm danh", error: error.message });
  }
};

//  Lấy lịch sử điểm danh của sinh viên

exports.getAttendanceHistory = async (req, res) => {
  try {
    const studentId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Lấy tổng số bản ghi để tính pagination
    const total = await Attendance.countDocuments({
      'attendances.studentId': studentId
    });

    // Lấy lịch sử điểm danh và populate thông tin lớp học
    const attendances = await Attendance.find({
      'attendances.studentId': studentId
    })
    .populate('classId', 'name code')
    .populate('subjectId', 'name code')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

    // Format dữ liệu trả về
    const history = attendances.map(record => {
      const studentAttendance = record.attendances.find(a => 
        a.studentId.equals(studentId)
      );

      return {
        _id: record._id,
        date: record.date,
        subject: {
          name: record.subjectId.name,
          code: record.subjectId.code
        },
        class: {
          name: record.classId.name,
          code: record.classId.code
        },
        status: studentAttendance ? studentAttendance.status : 'absent',
        checkedInAt: studentAttendance?.checkedInAt,
        isLate: studentAttendance?.status === 'late',
        note: studentAttendance?.note
      };
    });

    res.status(200).json({
      history,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Error getting attendance history:', error);
    res.status(500).json({ message: "Lỗi khi lấy lịch sử điểm danh", error: error.message });
  }
};

// Sinh viên điểm danh bằng mã code

exports.submitAttendance = async (req, res) => {
  try {
    const { code } = req.body;
    const studentId = req.user._id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã điểm danh'
      });
    }


    const attendance = await Attendance.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('classId').populate('subjectId');

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Mã điểm danh không hợp lệ hoặc đã hết hạn'
      });
    }

    if (!attendance.classId.students.includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không thuộc lớp học này'
      });
    }

    if (attendance.attendances.some(a => a.studentId.equals(studentId))) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã điểm danh cho buổi học này rồi'
      });
    }

    const now = new Date();
    const startTime = attendance.date;
    const lateThreshold = attendance.allowLate ? 15 : 0; // 15 phút nếu cho phép đi muộn
    const status = now > new Date(startTime.getTime() + lateThreshold * 60000) 
      ? 'late' 
      : 'present';


    attendance.attendances.push({
      studentId,
      status,
      checkedInAt: now,
      note: status === 'late' ? 'Điểm danh muộn' : ''
    });

    attendance.attendedCount += 1;
    await attendance.save();

    res.status(200).json({
      success: true,
      message: status === 'late' ? 'Điểm danh thành công (Muộn)' : 'Điểm danh thành công',
      data: {
        status,
        checkedInAt: now,
        subject: attendance.subjectId.name,
        class: attendance.classId.name
      }
    });
  } catch (error) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi điểm danh',
      error: error.message
    });
  }
};
