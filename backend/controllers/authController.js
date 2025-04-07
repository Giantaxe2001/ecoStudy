const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: "7d" });
};

// Đăng ký user
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email đã tồn tại!" });
    }

    const newUser = await User.create({ name, email, password, role });
    const token = generateToken(newUser._id);

    res.status(201).json({
      message: "Đăng ký thành công!",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Đăng nhập user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email không đúng!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu không đúng!" });
    }

    const token = generateToken(user._id);
    res.json({
      message: "Đăng nhập thành công!",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-password')
      .sort({ name: 1 });
    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Get all students
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ name: 1 });
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, id } = req.body;
  
    const targetId = id && req.user.role === 'admin' ? id : req.user.id;
    
    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: targetId } });
      if (emailExists) {
        return res.status(400).json({ message: "Email đã tồn tại" });
      }
      user.email = email;
    }

    user.name = name || user.name;
    await user.save();

    res.json({
      message: "Cập nhật thông tin thành công",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Update user by admin
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, studentId, phone } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email đã tồn tại" });
      }
      user.email = email;
    }

    user.name = name || user.name;
    
    // Update studentId and phone if provided
    if (studentId !== undefined) {
      user.studentId = studentId;
    }
    
    if (phone !== undefined) {
      user.phone = phone;
    }
    
    await user.save();

    res.json({
      message: "Cập nhật thông tin thành công",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
