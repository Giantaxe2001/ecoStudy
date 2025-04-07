const express = require("express");
const { getNotifications, markAsRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Lấy danh sách thông báo của user
router.get("/", protect, getNotifications);

// Đánh dấu tất cả thông báo là đã đọc
router.put("/mark-as-read", protect, markAsRead);

module.exports = router;
