const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
  destination: function(req, file, cb) {

    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'submissions');
    console.log('Upload directory:', uploadDir);
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory...');
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Upload directory created successfully');
      } catch (err) {
        console.error('Error creating upload directory:', err);
      }
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + '-' + file.originalname);
  }
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/octet-stream'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Loại file không được hỗ trợ'), false);
  }
};

// Cấu hình upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, 
    files: 5 
  }
}).array('files', 5);

// Sinh viên nộp bài tập
exports.submitAssignment = async (req, res) => {
  try {
    console.log('Starting assignment submission process...');
    console.log('Request params:', req.params);
    console.log('Request user:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    
    // Kiểm tra xem có user đang đăng nhập không
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Bạn cần đăng nhập để nộp bài!" });
    }
    
    // Kiểm tra thư mục uploads
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const submissionsDir = path.join(uploadsDir, 'submissions');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log(`Creating uploads directory: ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    if (!fs.existsSync(submissionsDir)) {
      console.log(`Creating submissions directory: ${submissionsDir}`);
      fs.mkdirSync(submissionsDir, { recursive: true });
    }

    // Kiểm tra vai trò người dùng
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: "Chỉ sinh viên mới có thể nộp bài tập!" });
    }

    // Kiểm tra assignmentId
    const assignmentId = req.params.assignmentId || req.params.id;
    if (!assignmentId) {
      return res.status(400).json({ success: false, message: "Thiếu ID bài tập!" });
    }

    console.log(`Processing submission for assignment ID: ${assignmentId}`);

    // Kiểm tra bài tập tồn tại trước khi xử lý file
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      console.log(`Assignment not found with ID: ${assignmentId}`);
      return res.status(404).json({ success: false, message: "Không tìm thấy bài tập" });
    }

    console.log(`Found assignment: ${assignment.title}`);

    // Xử lý upload file
    upload(req, res, async function(err) {
      console.log('Upload callback triggered');
      console.log('Request files after upload:', req.files);
      console.log('Request body after upload:', req.body);
      
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        // Xử lý các lỗi cụ thể từ multer
        switch(err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({ 
              success: false,
              message: "Kích thước file vượt quá giới hạn cho phép (10MB)",
              code: 'FILE_TOO_LARGE'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({ 
              success: false,
              message: "Số lượng file vượt quá giới hạn cho phép (tối đa 5 file)",
              code: 'TOO_MANY_FILES'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({ 
              success: false,
              message: "Loại file không được hỗ trợ",
              code: 'INVALID_FILE_TYPE'
            });
          default:
            return res.status(400).json({ 
              success: false,
              message: "Lỗi khi tải file lên: " + err.message,
              code: 'UPLOAD_ERROR'
            });
        }
      } else if (err) {
        console.error('Unknown error during upload:', err);
        return res.status(500).json({ 
          success: false,
          message: "Lỗi không xác định khi tải file",
          error: err.message,
          code: 'UNKNOWN_ERROR'
        });
      }

      try {
        const { comment } = req.body;
        const studentId = req.user.id;
        
        console.log(`Processing submission from student ID: ${studentId}`);
        
        // Kiểm tra hạn nộp
        const now = new Date();
        const dueDate = new Date(assignment.dueDate);
        const isOverdue = now > dueDate;
        
        if (isOverdue) {
          console.log(`Submission is late. Due date was: ${dueDate.toISOString()}, current time: ${now.toISOString()}`);
        }
        
        // Kiểm tra xem đã có bài nộp chưa
        let submission = await Submission.findOne({ 
          assignmentId, 
          studentId 
        });
        
        if (submission) {
          console.log(`Found existing submission with ID: ${submission._id}`);
        }
        
        // Xử lý file upload
        const uploadedFiles = [];
        
        // Kiểm tra có file upload không
        if (!req.files || req.files.length === 0) {
          console.log('No files were uploaded');
          if (!comment || comment.trim() === '') {
            return res.status(400).json({ 
              success: false, 
              message: "Vui lòng chọn ít nhất một file hoặc thêm nhận xét để nộp!" 
            });
          }
        } else {
          console.log(`${req.files.length} files were uploaded`);
          
          // Kiểm tra kích thước tổng các file
          const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
          if (totalSize > 50 * 1024 * 1024) { // 50MB tổng
            return res.status(400).json({ 
              success: false, 
              message: "Tổng kích thước các file không được vượt quá 50MB!" 
            });
          }

          // Xử lý các file đã upload
          for (const file of req.files) {
            console.log(`Processing file: ${file.originalname}, size: ${file.size} bytes`);
            uploadedFiles.push({
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path
            });
          }
        }
        
        // Nếu đã có bài nộp, cập nhật
        if (submission) {
          console.log('Updating existing submission');
          submission.comment = comment || submission.comment;
          
          // Thêm file mới vào danh sách file hiện tại
          if (uploadedFiles.length > 0) {
            submission.files = [...submission.files, ...uploadedFiles];
          }
          
          submission.updatedAt = now;
          
          await submission.save();
          
          console.log('Submission updated successfully');
          return res.status(200).json({ 
            success: true,
            message: "Cập nhật bài nộp thành công", 
            submission 
          });
        }
        
        try {
          // Tạo bài nộp mới
          console.log('Creating new submission');
          submission = await Submission.create({
            assignmentId,
            studentId,
            comment: comment || '',
            files: uploadedFiles,
            submittedAt: now,
            isLate: isOverdue
          });
          
          // Tạo thông báo cho giáo viên
          try {
            const student = await User.findById(studentId);
            const teacherId = assignment.teacherId;
            
            if (teacherId && student) {
              await Notification.create({
                userId: teacherId,
                title: 'Bài tập mới được nộp',
                message: `${student.name} đã nộp bài tập ${assignment.title}`,
                type: 'submission',
                relatedId: submission._id,
                isRead: false
              });
              console.log('Notification created for teacher');
            }
          } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
            // Không cần trả về lỗi vì đây không phải là lỗi nghiêm trọng
          }
          
          console.log(`New submission created with ID: ${submission._id}`);
          return res.status(201).json({ 
            success: true,
            message: "Nộp bài thành công", 
            submission 
          });
        } catch (error) {
          console.error('Error creating submission:', error);
          return res.status(500).json({
            success: false,
            message: "Lỗi khi tạo bài nộp",
            error: error.message
          });
        }
      } catch (error) {
        console.error('Error processing submission:', error);
        return res.status(500).json({ 
          success: false,
          message: "Lỗi khi xử lý bài nộp", 
          error: error.message 
        });
      }
    });
  } catch (error) {
    console.error('Unhandled error in submitAssignment:', error);
    return res.status(500).json({ 
      success: false,
      message: "Lỗi server khi nộp bài tập", 
      error: error.message 
    });
  }
};

// 🔵 Lấy danh sách bài nộp của một bài tập
exports.getSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Kiểm tra bài tập tồn tại
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài tập" });
    }

    let submissions = [];

    // Nếu là giáo viên, lấy tất cả bài nộp của bài tập
    if (userRole === 'teacher') {
      // Kiểm tra xem giáo viên có phải là người tạo bài tập không
      if (assignment.teacherId.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Bạn không có quyền xem bài nộp của bài tập này" });
      }

      submissions = await Submission.find({ assignmentId })
        .populate('studentId', 'name email')
        .sort({ submittedAt: -1 });
    } 
    // Nếu là học sinh, chỉ lấy bài nộp của học sinh đó
    else if (userRole === 'student') {
      submissions = await Submission.find({ 
        assignmentId, 
        studentId: userId 
      }).sort({ submittedAt: -1 });
    }

    return res.status(200).json({ 
      success: true,
      submissions 
    });
  } catch (error) {
    console.error('Error getting submissions:', error);
    
    // Trả về mảng rỗng thay vì lỗi nếu không tìm thấy bài nộp
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(200).json({ 
        success: true,
        submissions: [],
        message: "Không tìm thấy bài nộp nào"
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: "Lỗi khi lấy danh sách bài nộp", 
      error: error.message,
      submissions: [] // Trả về mảng rỗng để tránh lỗi ở frontend
    });
  }
};

// 🔵 Giáo viên chấm điểm bài nộp
exports.gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;
    const teacherId = req.user.id;

    // Kiểm tra vai trò người dùng
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: "Chỉ giáo viên mới có thể chấm điểm" });
    }

    // Kiểm tra bài nộp tồn tại
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài nộp" });
    }

    // Kiểm tra bài tập tồn tại
    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài tập" });
    }

    // Kiểm tra xem giáo viên có phải là người tạo bài tập không
    if (assignment.teacherId.toString() !== teacherId) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền chấm điểm bài nộp này" });
    }

    // Kiểm tra điểm hợp lệ
    const maxScore = assignment.totalPoints || 10;
    if (score < 0 || score > maxScore) {
      return res.status(400).json({ success: false, message: `Điểm phải nằm trong khoảng từ 0 đến ${maxScore}` });
    }

    // Cập nhật điểm và nhận xét
    submission.grade = score; // Sử dụng trường grade thay vì score để phù hợp với model
    submission.feedback = feedback;
    submission.gradedAt = new Date();
    submission.gradedBy = teacherId;
    
    console.log('Updated submission with grade:', submission);

    await submission.save();

    // Tạo thông báo cho học sinh
    try {
      const student = await User.findById(submission.studentId);
      
      if (student) {
        await Notification.create({
          userId: submission.studentId,
          title: 'Bài tập đã được chấm điểm',
          message: `Bài tập ${assignment.title} của bạn đã được chấm điểm: ${score}/${assignment.totalPoints || 10}`,
          type: 'grade',
          relatedId: submission._id,
          isRead: false
        });
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Không cần trả về lỗi vì đây không phải là lỗi nghiêm trọng
    }

    return res.status(200).json({ 
      success: true,
      message: "Chấm điểm thành công", 
      submission 
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    return res.status(500).json({ 
      success: false,
      message: "Lỗi khi chấm điểm bài nộp", 
      error: error.message 
    });
  }
};

// 🔵 Sinh viên hủy bài nộp
exports.deleteSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const studentId = req.user.id;

    // Kiểm tra vai trò người dùng
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: "Chỉ sinh viên mới có thể hủy bài nộp" });
    }

    // Kiểm tra bài nộp tồn tại
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài nộp" });
    }

    // Kiểm tra xem sinh viên có phải là người nộp bài không
    if (submission.studentId.toString() !== studentId) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền hủy bài nộp này" });
    }

    // Kiểm tra xem bài nộp đã được chấm điểm chưa
    if (submission.score !== undefined && submission.score !== null) {
      return res.status(400).json({ success: false, message: "Không thể hủy bài nộp đã được chấm điểm" });
    }

    // Xóa các file đã upload
    if (submission.files && submission.files.length > 0) {
      for (const file of submission.files) {
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`Deleted file: ${file.path}`);
          }
        } catch (fileError) {
          console.error(`Error deleting file ${file.path}:`, fileError);
          // Tiếp tục xóa các file khác ngay cả khi có lỗi
        }
      }
    }

    // Lấy thông tin assignment để cập nhật
    const assignment = await Assignment.findById(submission.assignmentId);
    
    // Xóa bài nộp
    await Submission.findByIdAndDelete(submissionId);
    
    // Ghi log chi tiết
    console.log(`Submission ${submissionId} deleted successfully`);
    console.log(`Assignment ID associated with this submission: ${submission.assignmentId}`);
    
    // Cập nhật cache trong localStorage
    return res.status(200).json({ 
      success: true,
      message: "Hủy bài nộp thành công",
      assignmentId: submission.assignmentId,
      submissionId: submissionId
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({ 
      success: false,
      message: "Lỗi khi hủy bài nộp", 
      error: error.message 
    });
  }
};
