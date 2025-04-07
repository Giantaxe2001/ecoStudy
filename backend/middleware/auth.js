const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware bảo vệ route yêu cầu đăng nhập
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No auth token found' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user - kiểm tra cả id và userId để đảm bảo tính nhất quán
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user to request
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
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

// Middleware kiểm tra role của user
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập chức năng này'
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
