const User = require("../models/User");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const bcrypt = require("bcryptjs");

// tạo user teacher và student
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!["teacher", "student"].includes(role)) {
            return res.status(400).json({ message: "Invalid role specified" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            createdBy: req.user.id
        });

        res.status(201).json({
            message: "User created successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Lấy users theo role
exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        if (!["teacher", "student"].includes(role)) {
            return res.status(400).json({ message: "Invalid role specified" });
        }

        const users = await User.find({ role })
            .select('-password')
            .sort({ name: 1 });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// cập nhật user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        if (email && email !== user.email) {
            return res.status(400).json({ message: "Không được phép thay đổi email" });
        }

        if (name) user.name = name;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            message: "Cập nhật thông tin thành công",
            user: userResponse
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// xóa user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        if (user.role === 'student') {
            await Class.updateMany(
                { students: user._id },
                { $pull: { students: user._id } }
            );
        }

    
        if (user.role === 'teacher') {
            // Check if teacher is still assigned to any subjects
            const subjectsWithTeacher = await Subject.find({ teachers: user._id });
            
            if (subjectsWithTeacher.length > 0) {
                return res.status(400).json({
                    message: "Không thể xóa giáo viên vì đang phụ trách môn học",
                    subjects: subjectsWithTeacher.map(s => s.name)
                });
            }

           
            await Class.updateMany(
                { teachers: user._id },
                { $pull: { teachers: user._id } }
            );
        }

    
        await User.findByIdAndDelete(id);
        res.json({ message: "Xóa user thành công" });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Tạo lớp học
exports.createClass = async (req, res) => {
    try {
        const { name, teacherId, studentIds, subjectIds } = req.body;

        // Validate teacher
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(400).json({ message: "Invalid teacher specified" });
        }

        // Validate students
        if (studentIds && studentIds.length > 0) {
            const students = await User.find({
                _id: { $in: studentIds },
                role: 'student'
            });
            if (students.length !== studentIds.length) {
                return res.status(400).json({ message: "Invalid student(s) specified" });
            }
        }

        // Validate subjects
        if (subjectIds && subjectIds.length > 0) {
            const subjects = await Subject.find({
                _id: { $in: subjectIds }
            });
            if (subjects.length !== subjectIds.length) {
                return res.status(400).json({ message: "Invalid subject(s) specified" });
            }
        }

        const newClass = await Class.create({
            name,
            teacherId,
            students: studentIds || [],
            subjects: subjectIds || [],
            createdBy: req.user.id
        });

        // Add class reference to subjects
        if (subjectIds && subjectIds.length > 0) {
            await Subject.updateMany(
                { _id: { $in: subjectIds } },
                { $addToSet: { classes: newClass._id } }
            );
        }

        const populatedClass = await newClass.populate([
            { path: 'teacherId', select: 'name email' },
            { path: 'students', select: 'name email' },
            { path: 'subjects', select: 'name description' }
        ]);

        res.status(201).json({
            message: "Class created successfully",
            class: populatedClass
        });
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// tạo môn học
exports.createSubject = async (req, res) => {
    try {
        const { name, description, teacherIds } = req.body;

      
        if (teacherIds && teacherIds.length > 0) {
            const teachers = await User.find({
                _id: { $in: teacherIds },
                role: 'teacher'
            });
            if (teachers.length !== teacherIds.length) {
                return res.status(400).json({ message: "Invalid teacher(s) specified" });
            }
        }

        const subject = await Subject.create({
            name,
            description,
            teachers: teacherIds || [],
            createdBy: req.user.id
        });

        res.status(201).json({
            message: "Subject created successfully",
            subject: await subject.populate('teachers', 'name email')
        });
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// thay đổi lịch học
exports.updateClassSchedule = async (req, res) => {
    try {
        const { classId } = req.params;
        const { schedule } = req.body;

        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

   
        const subjectIds = schedule.map(s => s.subject);
        const subjects = await Subject.find({ _id: { $in: subjectIds } });
        if (subjects.length !== subjectIds.length) {
            return res.status(400).json({ message: "Invalid subject(s) in schedule" });
        }

        for (const session of schedule) {
            if (!classDoc.subjects.includes(session.subject)) {
                return res.status(400).json({ 
                    message: "Schedule contains subject not assigned to class" 
                });
            }
            
            if (session.dayOfWeek < 0 || session.dayOfWeek > 6) {
                return res.status(400).json({ message: "Invalid day of week" });
            }
        }

        classDoc.schedule = schedule;
        await classDoc.save();

        res.json({
            message: "Class schedule updated successfully",
            class: await classDoc.populate([
                { path: 'schedule.subject', select: 'name' }
            ])
        });
    } catch (error) {
        console.error('Update class schedule error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Change user password (admin only)
exports.changeUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: "Không thể thay đổi mật khẩu của admin khác" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: "Thay đổi mật khẩu thành công" });
    } catch (error) {
        console.error('Change user password error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Thêm sinh viên vào lớp
exports.assignStudentToClasses = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { classIds } = req.body;

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: "Học sinh không tồn tại" });
        }

       
        const classes = await Class.find({ _id: { $in: classIds } });
        if (classes.length !== classIds.length) {
            return res.status(400).json({ message: "Một số lớp học không tồn tại" });
        }

   
        student.classes = classIds;
        await student.save();


        await Promise.all(classes.map(async (cls) => {
            if (!cls.students.includes(studentId)) {
                cls.students.push(studentId);
                await cls.save();
            }
        }));

        res.json({ message: "Cập nhật lớp học thành công", student });
    } catch (error) {
        console.error('Assign student to classes error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Get all classes
exports.getAllClasses = async (req, res) => {
    try {
        const classes = await Class.find()
            .populate('teacherId', 'name')
            .populate('students', 'name')
            .populate('subjects', 'name')
            .sort({ name: 1 });
        res.json(classes);
    } catch (error) {
        console.error('Get all classes error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Get all subjects
exports.getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ name: 1 });
        res.json(subjects);
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

module.exports = {
    createUser: exports.createUser,
    getUsersByRole: exports.getUsersByRole,
    updateUser: exports.updateUser,
    deleteUser: exports.deleteUser,
    createClass: exports.createClass,
    createSubject: exports.createSubject,
    updateClassSchedule: exports.updateClassSchedule,
    changeUserPassword: exports.changeUserPassword,
    assignStudentToClasses: exports.assignStudentToClasses,
    getAllClasses: exports.getAllClasses,
    getAllSubjects: exports.getAllSubjects
};
