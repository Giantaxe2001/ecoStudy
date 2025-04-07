const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date, required: true },
  totalPoints: { type: Number, default: 10 }, 
  type: { type: String, enum: ['homework', 'quiz', 'exam', 'project'], default: 'homework' }, 
  notificationsSent: { type: Boolean, default: false } 
}, { timestamps: true });

module.exports = mongoose.model("Assignment", AssignmentSchema);
