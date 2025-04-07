const express = require('express');
const router = express.Router();
const { changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Change password route
router.put('/change-password', changePassword);

module.exports = router;
