const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded.userId;
      
      if (userId) {

        User.findById(userId).then(user => {
          if (user) {
            req.user = user;
            req.token = token;
          }
          next();
        }).catch(err => {
          console.error('Error finding user:', err);
          next();
        });
        return;
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();   
  }
};

router.get('/submissions/:submissionId/download-all', optionalAuth, fileController.downloadAllFilesFromSubmission);
router.get('/assignments/:assignmentId/download-all-submissions', optionalAuth, fileController.downloadAllSubmissions);
router.post('/download-selected', optionalAuth, fileController.downloadSelectedFiles);
router.get('/:filename', optionalAuth, fileController.downloadFile);

module.exports = router;
