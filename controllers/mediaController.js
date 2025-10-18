const fs = require('fs');
const path = require('path');

const mediaDir = path.join(__dirname, '../media');

exports.upload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Return enhanced file information
    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: req.fileInfo.uploadedAt,
        // Generate public URL for the file
        url: `/media/${req.user ? req.user.userId + '/' : ''}${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload controller error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: 'An error occurred while processing the upload'
    });
  }
};

exports.list = (req, res) => {
  fs.readdir(mediaDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list media' });
    res.json({ files });
  });
};
