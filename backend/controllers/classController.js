const Class = require("../models/Class");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const Attendance = require("../models/Attendance");
const Schedule = require("../models/Schedule");

//Admin - Tạo lớp học
exports.createClass = async (req, res) => {
    try {

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới có thể tạo lớp học!' });
        }
        const { name, teacherId, description } = req.body;
   
        if (!name) {
            return res.status(400).json({ message: "Tên lớp là bắt buộc!" });
        }

        const classData = { 
            name, 
            description,
            createdBy: req.user._id 
        };

        if (teacherId) {
            const teacher = await User.findById(teacherId);
            if (!teacher || teacher.role !== "teacher") {
                return res.status(400).json({ message: "Giáo viên không hợp lệ!" });
            }
            classData.teacherId = teacherId;
        }

        const newClass = await Class.create(classData);
        const populatedClass = await Class.findById(newClass._id)
            .populate('teacherId', 'name email')
            .populate('students', 'name email')
            .populate('subjects', 'name description');

        res.status(201).json({ 
            message: "Tạo lớp thành công!", 
            class: populatedClass 
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error });
    }
};

//Admin - Cập nhật lớp học
exports.updateClass = async (req, res) => {
    try {
       
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới có thể cập nhật lớp học!' });
        }
        const { name, teacherId, description, subjects } = req.body;
        const classId = req.params.classId;

    
        const classObj = await Class.findById(classId);
        if (!classObj) {
            return res.status(404).json({ message: "Lớp học không tồn tại!" });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        if (teacherId) {
            const teacher = await User.findById(teacherId);
            if (!teacher || teacher.role !== "teacher") {
                return res.status(400).json({ message: "Giáo viên không hợp lệ!" });
            }
            updateData.teacherId = teacherId;
        }

        if (subjects && Array.isArray(subjects)) {
            updateData.subjects = subjects;
        }

        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            updateData,
            { new: true }
        )
        .populate('teacherId', 'name email')
        .populate('students', 'name email')
        .populate('subjects', 'name description');

        if (!updatedClass) {
            return res.status(404).json({ message: "Lớp học không tồn tại!" });
        }

        res.json({ message: "Cập nhật lớp thành công!", class: updatedClass });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error });
    }
};

// Admin - Xóa lớp học
exports.deleteClass = async (req, res) => {
    try {

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới có thể xóa lớp học!' });
        }

        const classId = req.params.classId;
        const foundClass = await Class.findById(classId);
        
        if (!foundClass) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học!' });
        }

        await Class.findByIdAndDelete(classId);
        res.json({ message: 'Xóa lớp thành công!' });
    } catch (error) {
        console.error('Error in deleteClass:', error);
        res.status(500).json({ message: 'Lỗi server!', error: error.message });
    }
};

//Admin - Thêm sinh viên vào lớp
exports.addStudentToClass = async (req, res) => {
    try {
  
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới có thể thêm sinh viên vào lớp!' });
        }
        const { studentId } = req.body;
        const classId = req.params.classId;

  
        if (!studentId) {
            return res.status(400).json({ message: "ID sinh viên là bắt buộc!" });
        }

        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return res.status(400).json({ message: "Sinh viên không hợp lệ!" });
        }

        const classObj = await Class.findById(classId);
        if (!classObj) {
            return res.status(404).json({ message: "Lớp học không tồn tại!" });
        }

        if (classObj.hasStudent(studentId)) {
            return res.status(400).json({ message: "Sinh viên đã thuộc lớp này!" });
        }

        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            { $addToSet: { students: studentId } },
            { new: true }
        )
        .populate('teacherId', 'name email')
        .populate('students', 'name email')
        .populate('subjects', 'name description');

        await User.findByIdAndUpdate(
            studentId,
            { $addToSet: { classes: classId } }
        );
        
        res.json({ 
            message: "Thêm sinh viên thành công!", 
            class: updatedClass
        });
    } catch (error) {
        console.error('Error adding student to class:', error);
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Giáo viên & Sinh viên - Xem danh sách lớp học
exports.getClasses = async (req, res) => {
    try {
        let query = {};
        const populateOptions = [
            { path: 'teacherId', select: 'name email' },
            { path: 'students', select: 'name email' },
            { path: 'subjects', select: 'name description' }
        ];

        // Lọc theo vai trò người dùng
        if (req.user.role === "teacher") {
            query.teacherId = req.user._id;
        } else if (req.user.role === "student") {
            query.students = req.user._id;
        }

        const classes = await Class.find(query)
            .populate(populateOptions)
            .sort({ createdAt: -1 });

        res.json({ message: "Danh sách lớp học!", classes });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error });
    }
};

// Admin - Xóa sinh viên khỏi lớp
exports.removeStudentFromClass = async (req, res) => {
    try {

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới có thể xóa sinh viên khỏi lớp!' });
        }

        const { studentId } = req.body;
        const classId = req.params.classId;

        if (!studentId) {
            return res.status(400).json({ message: "ID sinh viên là bắt buộc!" });
        }

        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return res.status(400).json({ message: "Sinh viên không hợp lệ!" });
        }

        const classObj = await Class.findById(classId);
        if (!classObj) {
            return res.status(404).json({ message: "Lớp học không tồn tại!" });
        }
        if (!classObj.hasStudent(studentId)) {
            return res.status(400).json({ message: "Sinh viên không thuộc lớp này!" });
        }

        // Xóa sinh viên khỏi lớp
        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            { $pull: { students: studentId } },
            { new: true }
        )
        .populate('teacherId', 'name email')
        .populate('students', 'name email')
        .populate('subjects', 'name description');

        await User.findByIdAndUpdate(
            studentId,
            { $pull: { classes: classId } }
        );
        
        res.json({ 
            message: "Xóa sinh viên khỏi lớp thành công!", 
            class: updatedClass
        });
    } catch (error) {
        console.error('Error removing student from class:', error);
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};


exports.getClassById = async (req, res) => {
    try {
        const classId = req.params.classId;
        const foundClass = await Class.findById(classId).populate("teacherId students subjects");

        if (!foundClass) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }

        res.json({ message: "Thông tin lớp học!", class: foundClass });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error });
    }
};

// Thống kê thông tin lớp học
exports.getClassStats = async (req, res) => {
    try {
        const { classId } = req.params;
        const foundClass = await Class.findById(classId)
            .populate('students')
            .populate('subjects');

        if (!foundClass) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }

       
        const assignmentsCount = await Assignment.countDocuments({ classId });

      
        const attendances = await Attendance.find({ classId });
        const totalAttendances = attendances.length;
        const totalStudents = foundClass.students.length;
        let attendanceRate = 0;

        if (totalAttendances > 0 && totalStudents > 0) {
            const totalAttended = attendances.reduce((sum, attendance) => 
                sum + (attendance.students?.length || 0), 0);
            attendanceRate = Math.round((totalAttended / (totalAttendances * totalStudents)) * 100);
        }

     
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const [upcomingAssignments, upcomingSchedules] = await Promise.all([
            Assignment.find({
                classId,
                dueDate: { $gte: today, $lte: nextWeek }
            }).sort({ dueDate: 1 }).limit(2),
            Schedule.find({
                classId,
                date: { $gte: today, $lte: nextWeek }
            }).populate('subjectId', 'name').sort({ date: 1, startTime: 1 }).limit(2)
        ]);

        const upcomingEvents = [
            ...upcomingAssignments.map(assignment => ({
                type: 'assignment',
                title: assignment.title,
                date: assignment.dueDate
            })),
            ...upcomingSchedules.map(schedule => ({
                type: 'schedule',
                title: `${schedule.subjectId?.name || 'N/A'} - Buổi học`,
                date: schedule.date
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        const stats = {
            totalStudents: foundClass.students.length,
            totalSubjects: foundClass.subjects.length,
            totalAssignments: assignmentsCount,
            attendanceRate,
            upcomingEvents
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting class stats:', error);
        res.status(500).json({ message: "Lỗi server!", error });
    }
};
