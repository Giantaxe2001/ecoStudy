const Schedule = require("../models/Schedule");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");

// Thêm buổi học (Admin hoặc Giáo viên)
exports.createSchedule = async (req, res) => {
  try {
    const { classId, subjectId, date, startTime, endTime, description } = req.body;

    const foundClass = await Class.findById(classId);
    const subjectExists = await Subject.findById(subjectId);

    if (!foundClass) return res.status(404).json({ message: "Lớp học không tồn tại!" });
    if (!subjectExists) return res.status(404).json({ message: "Môn học không tồn tại!" });

    if (!foundClass.subjects.includes(subjectId)) {
      return res.status(400).json({ message: "Môn học không thuộc lớp này!" });
    }

    const schedule = await Schedule.create({
      classId, subjectId, date, startTime, endTime, description
    });

    res.status(201).json({ message: "Tạo buổi học thành công!", schedule });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Chỉnh sửa buổi học (Admin hoặc Giáo viên)
exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, description } = req.body;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ message: "Buổi học không tồn tại!" });

    schedule.date = date || schedule.date;
    schedule.startTime = startTime || schedule.startTime;
    schedule.endTime = endTime || schedule.endTime;
    schedule.description = description || schedule.description;

    await schedule.save();
    res.status(200).json({ message: "Cập nhật buổi học thành công!", schedule });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Xóa buổi học (Admin hoặc Giáo viên)
exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findByIdAndDelete(scheduleId);
    if (!schedule) return res.status(404).json({ message: "Buổi học không tồn tại!" });

    res.status(200).json({ message: "Xóa buổi học thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Giáo viên hoặc sinh viên xem thời khóa biểu của lớp học
exports.getScheduleByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const schedules = await Schedule.find({ classId })
      .populate({ path: "subjectId", select: "name code" })
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({ message: "Danh sách buổi học của lớp", schedules });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Sinh viên xem thời khóa biểu cá nhân
exports.getMySchedule = async (req, res) => {
  try {
    const studentId = req.user.id;

    const studentClasses = await Class.find({ students: studentId }).select("_id");

    const schedules = await Schedule.find({ classId: { $in: studentClasses } })
      .populate({
        path: "classId",
        select: "name teacherId",
        populate: {
          path: "teacherId",
          select: "name email"
        }
      })
      .populate("subjectId", "name")
      .sort({ date: 1, startTime: 1 });

    // Định dạng lại dữ liệu để dễ sử dụng ở frontend
    const formattedSchedules = schedules.map(schedule => {
      const teacherInfo = schedule.classId && schedule.classId.teacherId 
        ? {
            id: schedule.classId.teacherId._id,
            name: schedule.classId.teacherId.name,
            email: schedule.classId.teacherId.email
          } 
        : null;

      return {
        _id: schedule._id,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        description: schedule.description,
        subject: schedule.subjectId ? schedule.subjectId.name : "Không xác định",
        class: schedule.classId ? schedule.classId.name : "Không xác định",
        teacher: teacherInfo ? teacherInfo.name : "Không xác định",
        teacherInfo: teacherInfo,
        room: schedule.room || "Không xác định"
      };
    });

    res.status(200).json({ 
      message: "Lịch học của bạn", 
      schedules: formattedSchedules,
      rawSchedules: schedules // Gửi thêm dữ liệu gốc để frontend có thể xử lý nếu cần
    });
  } catch (error) {
    console.error("Error in getMySchedule:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};
