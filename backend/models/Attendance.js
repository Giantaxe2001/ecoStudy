const mongoose = require("mongoose");

const AttendanceRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["present", "late", "absent"], default: "present" },
  checkedInAt: { type: Date, required: true },
  note: { type: String }
});

const AttendanceSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  code: { type: String, required: true },
  duration: { type: Number, required: true, min: 5, max: 60 }, 
  allowLate: { type: Boolean, default: true },
  date: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  totalStudents: { type: Number, required: true },
  attendedCount: { type: Number, default: 0 },
  attendances: [AttendanceRecordSchema],
  createdAt: { type: Date, default: Date.now }
});

// Index for fast lookups
AttendanceSchema.index({ classId: 1, date: -1 });
AttendanceSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
