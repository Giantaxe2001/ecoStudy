const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  // Thông tin cơ bản
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Thông tin thêm
  studentId: { type: String, default: "" },
  phone: { type: String, default: "" },

  // Phân quyền
  role: {
    type: String,
    enum: ["admin", "teacher", "student"],
    default: "student",
  },

  // Liên kết
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Quản lý bảo mật
  passwordChangedAt: Date,
}, {
  timestamps: true,
});

// Middleware mã hóa mật khẩu
userSchema.pre("save", async function (next) {
  if (this._skipPasswordHashing) return next();
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  this.passwordChangedAt = Date.now() - 1000;
});

// So sánh mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Kiểm tra thay đổi mật khẩu sau JWT
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Các tiện ích phân quyền
userSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

userSchema.methods.isTeacher = function () {
  return this.role === "teacher";
};

userSchema.methods.isStudent = function () {
  return this.role === "student";
};

module.exports = mongoose.model("User", userSchema);
