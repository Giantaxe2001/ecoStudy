const studentMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Chỉ sinh viên mới có quyền truy cập tài nguyên này'
    });
  }
};

const teacherMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Chỉ giáo viên mới có quyền truy cập tài nguyên này'
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Chỉ quản trị viên mới có quyền truy cập tài nguyên này'
    });
  }
};

module.exports = {
  studentMiddleware,
  teacherMiddleware,
  adminMiddleware
};
