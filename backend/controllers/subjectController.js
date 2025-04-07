const Subject = require("../models/Subject");
const User = require("../models/User");
const Class = require("../models/Class");

// Lấy danh sách môn học
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();

    if (!subjects) {
      return res.status(200).json({ message: "Danh sách môn học trống", subjects: [] });
    }

    res.status(200).json({ message: "Danh sách môn học", subjects });
  } catch (error) {
    console.error('Error in getSubjects:', error);
    res.status(500).json({ 
      message: "Lỗi khi tải danh sách môn học", 
      error: error.message 
    });
  }
};

//Tạo môn học mới (Chỉ Admin)
exports.createSubject = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể tạo môn học!' });
    }
    const { name, description, credits } = req.body;

    if (!name) return res.status(400).json({ message: "Tên môn học là bắt buộc!" });

    const newSubject = await Subject.create({ 
      name, 
      description: description || '', 
      credits: credits || 3,
      createdBy: req.user._id // Automatically set createdBy from the authenticated user
    });
    res.status(201).json({ message: "Thêm môn học thành công!", subject: newSubject });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};



//Thêm môn học vào lớp học
exports.addSubjectToClass = async (req, res) => {
  try {
    const { subjectId, classId } = req.body;

    const subject = await Subject.findById(subjectId);
    const classData = await Class.findById(classId);

    if (!subject) return res.status(404).json({ message: "Môn học không tồn tại!" });
    if (!classData) return res.status(404).json({ message: "Lớp học không tồn tại!" });

    // Kiểm tra xem môn học đã có trong lớp chưa
    if (classData.subjects.includes(subjectId)) {
      return res.status(400).json({ message: "Môn học đã có trong lớp này!" });
    }

    // Thêm môn học vào lớp
    classData.subjects.push(subjectId);
    await classData.save();

    // Cập nhật lớp trong môn học
    if (!subject.classes) {
      subject.classes = [];
    }
    if (!subject.classes.includes(classId)) {
      subject.classes.push(classId);
      await subject.save();
    }

    // Lấy thông tin lớp đã cập nhật
    const updatedClass = await Class.findById(classId).populate('subjects');

    res.status(200).json({ 
      message: "Thêm môn học vào lớp học thành công!", 
      class: updatedClass 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

//Cập nhật môn học (Chỉ Admin)
exports.updateSubject = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể cập nhật môn học!' });
    }
    const { subjectId } = req.params;
    const { name, description, credits } = req.body;

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Môn học không tồn tại!" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (credits !== undefined) updateData.credits = credits;

    const updatedSubject = await Subject.findByIdAndUpdate(
      subjectId,
      updateData,
      { new: true }
    );

    if (!updatedSubject) return res.status(404).json({ message: "Không tìm thấy môn học!" });

    res.status(200).json({ message: "Cập nhật môn học thành công!", subject: updatedSubject });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

//Xóa môn học (Chỉ Admin)
exports.deleteSubject = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể xóa môn học!' });
    }

    const { subjectId } = req.params;
    const foundSubject = await Subject.findById(subjectId);

    if (!foundSubject) {
      return res.status(404).json({ message: 'Không tìm thấy môn học!' });
    }

    // Check if subject is assigned to any classes
    const classesWithSubject = await Class.find({ subjects: subjectId });
    if (classesWithSubject.length > 0) {
      return res.status(400).json({ 
        message: 'Không thể xóa môn học vì đang được sử dụng trong lớp học!',
        classes: classesWithSubject.map(c => ({ id: c._id, name: c.name }))
      });
    }

    await Subject.findByIdAndDelete(subjectId);
    res.status(200).json({ message: 'Xóa môn học thành công!' });
  } catch (error) {
    console.error('Error in deleteSubject:', error);
    res.status(500).json({ message: 'Lỗi server!', error: error.message });
  }
};
