const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        // Tìm người dùng
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Save changes
        await user.save();

        res.json({ message: "Thay đổi mật khẩu thành công" });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};
