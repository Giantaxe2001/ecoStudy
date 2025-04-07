const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify token and attach user to request
const protect = async (req, res, next) => {
  try {
    // 1) Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'You are not logged in. Please log in to get access.' });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists - kiểm tra cả id và userId để đảm bảo tính nhất quán
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    // 4) Check if user changed password after the token was issued
    if (user.changedPasswordAfter && typeof user.changedPasswordAfter === 'function' && user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ message: 'User recently changed password! Please log in again.' });
    }

    // Grant access to protected route
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(401).json({ message: 'Invalid token. Please log in again.', error: error.message });
  }
};

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};

// Role-based middleware
const adminOnly = restrictTo('admin');
const teacherOnly = restrictTo('teacher');
const studentOnly = restrictTo('student');

module.exports = { protect, restrictTo, adminOnly, teacherOnly, studentOnly };
