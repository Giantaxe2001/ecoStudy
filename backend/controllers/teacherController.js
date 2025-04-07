const User = require("../models/User");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const crypto = require("crypto");

// Lấy lớp của giáo viên
exports.getMyClasses = async (req, res) => {
    try {
        const classes = await Class.find({ teacherId: req.user.id })
            .populate('students', 'name email')
            .populate('subjects', 'name description')
            .sort({ createdAt: -1 });

        res.json(classes);
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Lấy học sinh thuộc lớp
exports.getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;
        const classDoc = await Class.findOne({
            _id: classId,
            teacherId: req.user.id
        }).populate('students', 'name email');

        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        res.json(classDoc.students);
    } catch (error) {
        console.error('Get class students error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Tạo bài tập
exports.createAssignment = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { title, description, dueDate } = req.body;

        const subject = await Subject.findOne({
            _id: subjectId,
            teachers: req.user.id
        });

        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        subject.assignments.push({
            title,
            description,
            dueDate,
            createdBy: req.user.id
        });

        await subject.save();
        res.status(201).json({
            message: "Assignment created successfully",
            assignment: subject.assignments[subject.assignments.length - 1]
        });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Đánh giá bài tập
exports.gradeAssignment = async (req, res) => {
    try {
        const { subjectId, assignmentId, submissionId } = req.params;
        const { grade, feedback } = req.body;

        const subject = await Subject.findOne({
            _id: subjectId,
            teachers: req.user.id
        });

        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        const assignment = subject.assignments.id(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        const submission = assignment.submissions.id(submissionId);
        if (!submission) {
            return res.status(404).json({ message: "Submission not found" });
        }

        submission.grade = grade;
        submission.feedback = feedback;

        subject.grades.push({
            student: submission.student,
            grade,
            type: 'assignment',
            assignmentId: assignment._id,
            gradedBy: req.user.id,
            comment: feedback
        });

        await subject.save();
        res.json({
            message: "Assignment graded successfully",
            submission
        });
    } catch (error) {
        console.error('Grade assignment error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// tạo mã điểm danh
exports.generateAttendanceCode = async (req, res) => {
    try {
        const { classId } = req.params;
        const { subjectId, expiresInMinutes = 15 } = req.body;

        const classDoc = await Class.findOne({
            _id: classId,
            teacherId: req.user.id
        });

        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        if (!classDoc.subjects.includes(subjectId)) {
            return res.status(400).json({ message: "Subject not in class" });
        }

        // tạo ngẫu nhiên 6 chữ
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60000);

        classDoc.attendanceCodes.push({
            code,
            subject: subjectId,
            date: new Date(),
            expiresAt
        });

        await classDoc.save();
        res.json({
            message: "Attendance code generated successfully",
            code,
            expiresAt
        });
    } catch (error) {
        console.error('Generate attendance code error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// lấy thông tin điểm danh
exports.getAttendanceRecords = async (req, res) => {
    try {
        const { classId, subjectId } = req.params;
        const { date } = req.query;

        const classDoc = await Class.findOne({
            _id: classId,
            teacherId: req.user.id
        }).populate('attendanceCodes.attendees.student', 'name email');

        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        let records = classDoc.attendanceCodes;

        if (subjectId) {
            records = records.filter(r => r.subject.equals(subjectId));
        }

        if (date) {
            const targetDate = new Date(date);
            records = records.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate.toDateString() === targetDate.toDateString();
            });
        }

        res.json(records);
    } catch (error) {
        console.error('Get attendance records error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// cập nhật điểm số
exports.updateGrades = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { studentId, grade, type, comment } = req.body;

        const subject = await Subject.findOne({
            _id: subjectId,
            teachers: req.user.id
        });

        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        const classWithStudent = await Class.findOne({
            subjects: subjectId,
            students: studentId
        });

        if (!classWithStudent) {
            return res.status(400).json({ message: "Student not in subject class" });
        }

        subject.grades.push({
            student: studentId,
            grade,
            type,
            gradedBy: req.user.id,
            comment
        });

        await subject.save();
        res.json({
            message: "Grade updated successfully",
            grade: subject.grades[subject.grades.length - 1]
        });
    } catch (error) {
        console.error('Update grades error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = exports;
