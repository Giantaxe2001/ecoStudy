const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true, enum: ["general", "midterm", "final", "assignment"], default: "general" },
  grade: { type: Number, required: true, min: 0, max: 100 },
  comment: { type: String },
  title: { type: String },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment" },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" }
}, { timestamps: true });

module.exports = mongoose.model("Grade", gradeSchema);
