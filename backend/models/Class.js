const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { 
        type: String, 
        required: true, 
        unique: true 
    },
    description: {
        type: String,
        trim: true
    },
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User"
    },
    students: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }],
    subjects: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Subject" 
    }],
    schedule: [{
        dayOfWeek: { 
            type: Number, 
            required: true,
            min: 0,
            max: 6 
        },
        startTime: { 
            type: String, 
            required: true 
        },
        endTime: { 
            type: String, 
            required: true 
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true
        }
    }],
    attendanceCodes: [{
        code: { 
            type: String, 
            required: true 
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true
        },
        date: { 
            type: Date, 
            required: true 
        },
        expiresAt: { 
            type: Date, 
            required: true 
        },
        attendees: [{
            student: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            attendedAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Kiểm tra xem học sinh có trong lớp không
classSchema.methods.hasStudent = function(studentId) {
    return this.students.some(id => id.equals(studentId));
};

// Kiểm tra xem môn học có trong lớp không
classSchema.methods.hasSubject = function(subjectId) {
    return this.subjects.some(id => id.equals(subjectId));
};

// Lấy mã điểm danh đang hoạt động cho môn học
classSchema.methods.getActiveAttendanceCode = function(subjectId) {
    const now = new Date();
    return this.attendanceCodes.find(code => 
        code.subject.equals(subjectId) && code.expiresAt > now
    );
};

// Lấy danh sách điểm danh cho môn học
classSchema.methods.getAttendanceForSubject = function(subjectId) {
    return this.attendanceCodes
        .filter(code => code.subject.equals(subjectId))
        .sort((a, b) => b.date - a.date);
};

// Kiểm tra xem học sinh có điểm danh cho môn học vào ngày cụ thể không
classSchema.methods.hasAttendance = function(studentId, subjectId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.attendanceCodes.some(code => 
        code.subject.equals(subjectId) &&
        code.date >= startOfDay &&
        code.date <= endOfDay &&
        code.attendees.some(a => a.student.equals(studentId))
    );
};

// Kiểm tra xem giáo viên có phải là giáo viên chủ nhiệm không
classSchema.methods.isTeacherOf = function(teacherId) {
    return this.teacherId && this.teacherId.equals(teacherId);
};

module.exports = mongoose.model("Class", classSchema);
