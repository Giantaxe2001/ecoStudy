const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  filename: { type: String },
  originalname: { type: String },
  path: { type: String },
  size: { type: Number },
  mimetype: { type: String }
});

const SubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileUrl: { type: String }, 
  files: [FileSchema],
  comment: { type: String },
  submittedAt: { type: Date, default: Date.now },
  isLate: { type: Boolean, default: false },
  grade: { type: Number, min: 0, max: 10 }, 
  feedback: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Submission", SubmissionSchema);
