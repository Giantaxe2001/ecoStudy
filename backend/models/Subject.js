const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  // Thông tin môn học
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  credits: { type: Number, required: true, default: 3 },

  // Danh sách bài tập
  assignments: [{
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submissions: [{
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      submittedAt: { type: Date, default: Date.now },
      content: { type: String, required: true },
      grade: { type: Number, min: 0, max: 10 },
      feedback: String,
    }],
  }],

  // Danh sách điểm số
  grades: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    grade: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    type: {
      type: String,
      enum: ["midterm", "final", "assignment"],
      required: true,
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gradedAt: { type: Date, default: Date.now },
    comment: String,
  }],

  // Người tạo môn học
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, {
  timestamps: true,
});


// Lấy điểm của 1 học sinh
subjectSchema.methods.getStudentGrade = function (studentId) {
  return this.grades.filter(grade => grade.student.equals(studentId));
};

// Lấy bài nộp theo assignment
subjectSchema.methods.getAssignmentSubmissions = function (assignmentId) {
  const assignment = this.assignments.id(assignmentId);
  return assignment ? assignment.submissions : [];
};

// Tính điểm tổng kết
subjectSchema.methods.calculateFinalGrade = function (studentId) {
  const studentGrades = this.grades.filter(g => g.student.equals(studentId));
  if (studentGrades.length === 0) return null;

  const midtermGrade = studentGrades.find(g => g.type === 'midterm')?.grade || 0;
  const finalGrade = studentGrades.find(g => g.type === 'final')?.grade || 0;
  const assignmentGrades = studentGrades
    .filter(g => g.type === 'assignment')
    .map(g => g.grade);

  const avgAssignmentGrade = assignmentGrades.length > 0
    ? assignmentGrades.reduce((a, b) => a + b) / assignmentGrades.length
    : 0;

  return (midtermGrade * 0.3) + (finalGrade * 0.5) + (avgAssignmentGrade * 0.2);
};

module.exports = mongoose.model("Subject", subjectSchema);
