const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// Tải xuống một file
exports.downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const { originalname } = req.query;
    
    console.log(`Attempting to download file: ${filename}, original name: ${originalname}`);
    
    const rootUploadDir = path.join(__dirname, '../../../uploads');
    const baseUploadDir = path.join(__dirname, '../uploads');
    
    console.log(`Root upload directory: ${rootUploadDir}`);
    console.log(`Base upload directory: ${baseUploadDir}`);
    
    
    const pathsToCheck = [
    
      path.join(rootUploadDir, filename),                    // /New folder/uploads/filename
      path.join(rootUploadDir, 'submissions', filename),     // /New folder/uploads/submissions/filename
      path.join(rootUploadDir, 'assignments', filename),     // /New folder/uploads/assignments/filename
      path.join(baseUploadDir, filename),                    // /backend/uploads/filename
      path.join(baseUploadDir, 'assignments', filename),     // /backend/uploads/assignments/filename
      path.join(baseUploadDir, 'submissions', filename)      // /backend/uploads/submissions/filename
    ];
    
    let filePath = null;
    for (const pathToCheck of pathsToCheck) {
      console.log(`Checking path: ${pathToCheck}`);
      if (fs.existsSync(pathToCheck)) {
        filePath = pathToCheck;
        console.log(`File found at: ${filePath}`);
        break;
      }
    }
    
    if (!filePath) {
      console.log(`File not found: ${filename}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy file',
        checkedPaths: pathsToCheck
      });
    }
    

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalname || filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tải xuống file', 
      error: error.message 
    });
  }
};

// Tải xuống tất cả file của một bài nộp
exports.downloadAllFilesFromSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Tìm bài nộp
    const submission = await Submission.findById(submissionId)
      .populate('studentId', 'name studentId')
      .populate('assignmentId', 'title');
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài nộp' 
      });
    }
    
    if (req.user) {
      console.log('User authenticated:', req.user.role, req.user.id);
      if (req.user.role === 'student' && submission.studentId && submission.studentId._id.toString() !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bạn không có quyền tải xuống bài nộp này' 
        });
      }
    } else {
      console.log('No user authenticated, proceeding with public access');
    }
    
    // Kiểm tra xem có file không
    if (!submission.files || submission.files.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bài nộp không có file nào' 
      });
    }
    
    // Tạo tên cho file zip
    const studentName = submission.studentId.name.replace(/[^a-zA-Z0-9]/g, '_');
    const assignmentTitle = submission.assignmentId.title.replace(/[^a-zA-Z0-9]/g, '_');
    const zipFileName = `${studentName}_${assignmentTitle}_files.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);
    res.setHeader('Content-Type', 'application/zip');
    
    // Tạo archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Mức độ nén tối đa
    });
    
    // Pipe archive đến response
    archive.pipe(res);
    
    // Thêm các file vào archive
    for (const file of submission.files) {
      console.log(`Processing file: ${file.filename}, original name: ${file.originalname}`);
      
      const exactUploadDir = 'C:\\Users\\Admin\\Desktop\\New folder\\uploads\\submissions';
      const baseUploadDir = path.join(__dirname, '../uploads');
      const rootUploadDir = path.join(__dirname, '../../../uploads');
      
      console.log('Exact upload directory:', exactUploadDir);
      console.log('Base upload directory:', baseUploadDir);
      console.log('Root upload directory:', rootUploadDir);
      console.log('Current directory:', __dirname);
      
      // Danh sách các đường dẫn cần kiểm tra
      const pathsToCheck = [
        // Đường dẫn chính xác đến thư mục uploads/submissions
        path.join(exactUploadDir, file.filename),                   // C:\Users\Admin\Desktop\New folder\uploads\submissions\filename
        // Đường dẫn trong thư mục backend
        path.join(baseUploadDir, file.filename),                    // /backend/uploads/filename
        path.join(baseUploadDir, 'submissions', file.filename),     // /backend/uploads/submissions/filename
        // Đường dẫn trong thư mục gốc của dự án
        path.join(rootUploadDir, file.filename),                    // /uploads/filename
        path.join(rootUploadDir, 'submissions', file.filename),     // /uploads/submissions/filename
      ];
      
      // Tìm file trong các đường dẫn khác nhau
      let filePath = null;
      for (const pathToCheck of pathsToCheck) {
        console.log(`Checking path: ${pathToCheck}`);
        if (fs.existsSync(pathToCheck)) {
          filePath = pathToCheck;
          console.log(`File found at: ${filePath}`);
          break;
        }
      }
      
      if (filePath) {
        archive.file(filePath, { name: file.originalname });
      } else {
        console.log(`File not found: ${file.filename}`);
      }
    }
    
    // Finalize archive
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading all files:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tải xuống tất cả file', 
      error: error.message 
    });
  }
};

// Tải xuống tất cả bài nộp của một bài tập
exports.downloadAllSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    console.log(`Attempting to download all submissions for assignment: ${assignmentId}`);
    console.log('User authenticated:', req.user ? 'Yes' : 'No');
    
    // Tìm bài tập
    const assignment = await Assignment.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài tập' 
      });
    }
    
    // Tìm tất cả bài nộp của bài tập
    const submissions = await Submission.find({ assignmentId })
      .populate('studentId', 'name studentId');
    
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không có bài nộp nào cho bài tập này' 
      });
    }
    
    // Tạo tên cho file zip
    const assignmentTitle = assignment.title.replace(/[^a-zA-Z0-9]/g, '_');
    const zipFileName = `${assignmentTitle}_all_submissions.zip`;
    
    // Thiết lập header để tải xuống
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);
    res.setHeader('Content-Type', 'application/zip');
    
    // Tạo archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Mức độ nén tối đa
    });
    
    // Pipe archive đến response
    archive.pipe(res);
    
    // Thêm các bài nộp vào archive
    for (const submission of submissions) {
      if (submission.files && submission.files.length > 0) {
        const studentName = submission.studentId.name.replace(/[^a-zA-Z0-9]/g, '_');
        const studentId = submission.studentId.studentId || '';
        const folderName = `${studentName}_${studentId}`;
        
        // Thêm file comment.txt chứa comment của sinh viên
        if (submission.comment) {
          const commentContent = `Ghi chú của sinh viên: ${submission.comment}\n\nThời gian nộp: ${submission.submittedAt}\n${submission.isLate ? 'Nộp muộn' : 'Nộp đúng hạn'}\n\nĐiểm số: ${submission.grade !== undefined ? submission.grade : 'Chưa chấm'}\nNhận xét: ${submission.feedback || 'Không có'}`;
          archive.append(commentContent, { name: `${folderName}/comment.txt` });
        }
        
        // Thêm các file vào archive
        for (const file of submission.files) {
          const filePath = path.join(__dirname, '../uploads', file.filename);
          
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: `${folderName}/${file.originalname}` });
          }
        }
      }
    }
    
    // Finalize archive
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading all submissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tải xuống tất cả bài nộp', 
      error: error.message 
    });
  }
};

// Tải xuống các file được chọn
exports.downloadSelectedFiles = async (req, res) => {
  try {
    const { fileIds } = req.body;
    
    console.log('Request body:', req.body);
    console.log('File IDs received:', fileIds);
    console.log('User authenticated:', req.user ? 'Yes' : 'No');
    console.log('Headers:', req.headers);
    console.log('Request method:', req.method);
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng chọn ít nhất một file để tải xuống' 
      });
    }
    
    console.log(`Attempting to download ${fileIds.length} selected files`);
    
    // Tìm thông tin file từ database - sử dụng toString() để đảm bảo so sánh chuỗi với ObjectId
    const submissions = await Submission.find({
      'files._id': { $in: fileIds.map(id => id.toString()) }
    }).populate('studentId', 'name studentId');
    
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy file nào' 
      });
    }
    
    // Tạo tên cho file zip
    const zipFileName = `selected_files_${Date.now()}.zip`;
    
    // Thiết lập header để tải xuống
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);
    res.setHeader('Content-Type', 'application/zip');
    
    // Tạo archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Mức độ nén tối đa
    });
    
    // Pipe archive đến response
    archive.pipe(res);
    
    // Tìm và thêm các file được chọn vào archive
    let filesAdded = 0;
    
    console.log('Found submissions:', submissions.length);
    if (submissions.length === 0) {
      console.log('No submissions found for the provided file IDs');
      // Thử tìm kiếm theo cách khác - tìm tất cả bài nộp và lọc theo file ID
      const allSubmissions = await Submission.find({}).populate('studentId', 'name studentId');
      console.log(`Found ${allSubmissions.length} total submissions, checking for matching files`);
      
      // Lọc các bài nộp có chứa file ID được chọn
      const filteredSubmissions = allSubmissions.filter(sub => {
        if (!sub.files || !Array.isArray(sub.files)) return false;
        return sub.files.some(file => fileIds.includes(file._id.toString()));
      });
      
      if (filteredSubmissions.length > 0) {
        console.log(`Found ${filteredSubmissions.length} submissions with matching files using alternative method`);
        submissions.push(...filteredSubmissions);
      }
    }
    
    for (const submission of submissions) {
      const studentName = submission.studentId?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown_student';
      const studentId = submission.studentId?.studentId || '';
      
      if (!submission.files || !Array.isArray(submission.files)) {
        console.log(`Submission ${submission._id} has no files array, skipping`);
        continue;
      }
      
      for (const file of submission.files) {
        // So sánh ID dưới dạng chuỗi để tránh lỗi so sánh ObjectId với chuỗi
        const fileIdStr = file._id.toString();
        if (fileIds.includes(fileIdStr)) {
          console.log(`Processing selected file: ${file.filename}, original name: ${file.originalname}, ID: ${fileIdStr}`);
          
          // Sử dụng đường dẫn chính xác đến thư mục uploads/submissions
          const exactUploadDir = 'C:\\Users\\Admin\\Desktop\\New folder\\uploads\\submissions';
          const rootUploadDir = path.join(__dirname, '../../../uploads');
          const baseUploadDir = path.join(__dirname, '../uploads');
          
          console.log('Exact upload directory:', exactUploadDir);
          console.log('Root upload directory:', rootUploadDir);
          console.log('Base upload directory:', baseUploadDir);
          console.log('Current directory:', __dirname);
          
          // Danh sách các đường dẫn cần kiểm tra
          const pathsToCheck = [
            // Đường dẫn chính xác đến thư mục uploads/submissions
            path.join(exactUploadDir, file.filename),                   // C:\Users\Admin\Desktop\New folder\uploads\submissions\filename
            // Đường dẫn trong thư mục gốc của dự án
            path.join(rootUploadDir, 'submissions', file.filename),     // /New folder/uploads/submissions/filename
            // Đường dẫn trong thư mục backend
            path.join(baseUploadDir, 'submissions', file.filename)      // /backend/uploads/submissions/filename
          ];
          
          // Tìm file trong các đường dẫn khác nhau
          let filePath = null;
          for (const pathToCheck of pathsToCheck) {
            console.log(`Checking path: ${pathToCheck}`);
            if (fs.existsSync(pathToCheck)) {
              filePath = pathToCheck;
              console.log(`File found at: ${filePath}`);
              break;
            }
          }
          
          if (filePath) {
            const folderName = `${studentName}_${studentId}`;
            archive.file(filePath, { name: `${folderName}/${file.originalname}` });
            filesAdded++;
          } else {
            console.log(`File not found: ${file.filename}`);
          }
        }
      }
    }
    
    if (filesAdded === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy file nào để tải xuống' 
      });
    }
    
    // Finalize archive
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading selected files:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tải xuống các file được chọn', 
      error: error.message 
    });
  }
};
