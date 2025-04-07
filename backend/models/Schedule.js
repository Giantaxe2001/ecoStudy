const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  description: { type: String },
  attendanceCode: { type: String } // Mã điểm danh
}, { timestamps: true });

module.exports = mongoose.model("Schedule", ScheduleSchema);
