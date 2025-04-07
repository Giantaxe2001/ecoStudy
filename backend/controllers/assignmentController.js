const Assignment = require("../models/Assignment");
const Class = require("../models/Class");
const Notification = require("../models/Notification");
const Subject = require("../models/Subject");
const User = require("../models/User");
const io = require("../server").io; // Import Socket.io từ server

// Giáo viên tạo bài tập
exports.createAssignment = async (req, res) => {
  try {
    const { classId, subjectId, title, description, dueDate, totalPoints, type } = req.body;

    // Kiểm tra lớp học có tồn tại không
    const classInfo = await Class.findById(classId);
    if (!classInfo) return res.status(404).json({ message: "Lớp học không tồn tại!" });

    // Kiểm tra môn học có tồn tại không
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Môn học không tồn tại!" });

    // Kiểm tra người dùng có phải giáo viên không
    if (req.user.role !== "admin" && req.user.id !== classInfo.teacherId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền tạo bài tập cho lớp này!" });
    }

    // Tạo bài tập
    const assignment = await Assignment.create({
      classId,
      subjectId,
      teacherId: req.user.id,
      title,
      description,
      dueDate,
      totalPoints: totalPoints || 10,
      type: type || 'homework'
    });

    // Lấy danh sách sinh viên trong lớp
    const students = await User.find({ 
      role: "student",
      classes: classId
    });

    // Gửi thông báo đến tất cả sinh viên trong lớp
    for (let student of students) {
      await Notification.create({
        userId: student._id,
        message: `Bài tập mới: ${title} (${subject.name})`,
        link: `/assignments/${assignment._id}`,
      });

      // Gửi thông báo real-time qua Socket.io
      if (io) {
        io.to(student._id.toString()).emit("newAssignment", { 
          message: `Bài tập mới: ${title} (${subject.name})`,
          link: `/assignments/${assignment._id}`
        });
      }
    }

    res.status(201).json({ message: "Tạo bài tập thành công!", assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Giáo viên cập nhật bài tập
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, totalPoints, type, subjectId, classId } = req.body;

    console.log('Update assignment request:', {
      id,
      body: req.body
    });

  
    const assignment = await Assignment.findById(id).populate('teacherId').populate('subjectId');
    if (!assignment) {
      return res.status(404).json({ message: "Bài tập không tồn tại!" });
    }

    console.log('Found assignment:', {
      id: assignment._id,
      title: assignment.title,
      subjectId: assignment.subjectId,
      currentSubjectId: assignment.subjectId?._id || assignment.subjectId
    });


    const assignmentTeacherId = assignment.teacherId?._id || assignment.teacherId;
    if (req.user.role !== "admin" && req.user.id !== (assignmentTeacherId?.toString() || '')) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật bài tập này!" });
    }

    if (subjectId) {
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Môn học không tồn tại!" });
      }
      console.log('Found subject:', {
        id: subject._id,
        name: subject.name
      });
    }

    // Cập nhật bài tập
    const updateData = {};
    
    // Chỉ cập nhật các trường được cung cấp
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (totalPoints !== undefined) updateData.totalPoints = totalPoints;
    if (type !== undefined) updateData.type = type;
    if (subjectId !== undefined) updateData.subjectId = subjectId;
    if (classId !== undefined) updateData.classId = classId;

    console.log('Updating with data:', updateData);

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate('teacherId').populate('subjectId');

    console.log('Updated assignment:', {
      id: updatedAssignment._id,
      title: updatedAssignment.title,
      subjectId: updatedAssignment.subjectId?._id || updatedAssignment.subjectId
    });

    res.json({ message: "Cập nhật bài tập thành công!", assignment: updatedAssignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Giáo viên xóa bài tập
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Bài tập không tồn tại!" });
    }
    if (req.user.role !== "admin" && req.user.id !== assignment.teacherId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bài tập này!" });
    }
    await Assignment.findByIdAndDelete(id);
    res.json({ message: "Xóa bài tập thành công!" });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

// Lấy danh sách bài tập
exports.getAssignments = async (req, res) => {
  try {
    const { classId, subjectId, teacherId, search } = req.query;
    let query = {};
    
    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;
    if (teacherId) query.teacherId = teacherId;
    
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    if (req.user.role === "student") {
      const classes = await Class.find({ students: req.user._id });
      const classIds = classes.map(c => c._id);
      query.classId = { $in: classIds };
    }
  
    else if (req.user.role === "teacher") {
      query.teacherId = req.user._id;
    }
    
    console.log('Query for assignments:', query);
    
    const assignments = await Assignment.find(query)
      .populate('classId', 'name')
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 });
    
    console.log('Found assignments:', assignments.length);
    console.log('Sample assignment:', assignments.length > 0 ? {
      id: assignments[0]._id,
      title: assignments[0].title,
      subjectId: assignments[0].subjectId,
      hasSubjectName: assignments[0].subjectId && assignments[0].subjectId.name
    } : 'No assignments');
    
    res.json({ assignments });
  } catch (error) {
    console.error('Error getting assignments:', error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};
