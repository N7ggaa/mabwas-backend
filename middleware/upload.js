const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File type validation
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',

  // Documents (if needed for the application)
  'application/pdf': '.pdf',

  // Audio (for game sounds, etc.)
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',

  // Video (for game replays, etc.)
  'video/mp4': '.mp4',
  'video/webm': '.webm'
};

// File size limits based on subscription type
const FILE_SIZE_LIMITS = {
  free: 5 * 1024 * 1024,      // 5MB for free users
  premium: 25 * 1024 * 1024,  // 25MB for premium users
  pro: 100 * 1024 * 1024      // 100MB for pro users
};

// Storage configuration
const createStorage = (mediaDir) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      // Create user-specific directory if user is authenticated
      let uploadDir = mediaDir;

      if (req.user && req.user.userId) {
        const userDir = path.join(mediaDir, req.user.userId.toString());
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        uploadDir = userDir;
      }

      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate secure filename with timestamp and random string
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const ext = path.extname(file.originalname).toLowerCase();
      const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');

      // Limit basename length to prevent extremely long filenames
      const shortBasename = basename.substring(0, 50);

      const filename = `${timestamp}_${random}_${shortBasename}${ext}`;
      cb(null, filename);
    }
  });
};

// File filter function
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_FILE_TYPES[file.mimetype]) {
    return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }

  // Additional security check: verify file extension matches MIME type
  const expectedExt = ALLOWED_FILE_TYPES[file.mimetype];
  const actualExt = path.extname(file.originalname).toLowerCase();

  if (expectedExt !== actualExt) {
    return cb(new Error('File extension does not match file type'), false);
  }

  // Check for suspicious filenames
  const suspiciousPatterns = [
    /\.php$/i,
    /\.js$/i,
    /\.exe$/i,
    /\.bat$/i,
    /\.sh$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /\.pl$/i,
    /\.py$/i,
    /\.rb$/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
    return cb(new Error('Suspicious file extension detected'), false);
  }

  cb(null, true);
};

// Get file size limit based on user subscription
const getFileSizeLimit = (req) => {
  if (!req.user || !req.user.subscription) {
    return FILE_SIZE_LIMITS.free; // Default to free tier for unauthenticated users
  }

  return FILE_SIZE_LIMITS[req.user.subscription] || FILE_SIZE_LIMITS.free;
};

// Create multer instance with dynamic limits
const createUploadMiddleware = (mediaDir) => {
  return (req, res, next) => {
    const storage = createStorage(mediaDir);
    const fileSizeLimit = getFileSizeLimit(req);

    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: fileSizeLimit,
        files: 10, // Maximum 10 files per upload
        fieldSize: 1024 * 1024 // 1MB for non-file fields
      }
    });

    // Handle single file upload
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      upload.single('file')(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                error: 'File too large',
                message: `File size exceeds limit of ${Math.round(fileSizeLimit / (1024 * 1024))}MB`
              });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return res.status(400).json({
                error: 'Too many files',
                message: 'Maximum 10 files allowed per upload'
              });
            }
            if (err.code === 'LIMIT_FIELD_KEY') {
              return res.status(400).json({
                error: 'Too many fields',
                message: 'Request contains too many fields'
              });
            }
          }

          return res.status(400).json({
            error: 'Upload failed',
            message: err.message
          });
        }

        // Add file metadata to request
        if (req.file) {
          req.fileInfo = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path,
            uploadedAt: new Date()
          };
        }

        next();
      });
    } else {
      next();
    }
  };
};

// Multiple files upload middleware
const createMultipleUploadMiddleware = (mediaDir, maxCount = 10) => {
  return (req, res, next) => {
    const storage = createStorage(mediaDir);
    const fileSizeLimit = getFileSizeLimit(req);

    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: fileSizeLimit,
        files: maxCount,
        fieldSize: 1024 * 1024
      }
    });

    upload.array('files', maxCount)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'File too large',
              message: `File size exceeds limit of ${Math.round(fileSizeLimit / (1024 * 1024))}MB`
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              error: 'Too many files',
              message: `Maximum ${maxCount} files allowed per upload`
            });
          }
        }

        return res.status(400).json({
          error: 'Upload failed',
          message: err.message
        });
      }

      // Add files metadata to request
      if (req.files && req.files.length > 0) {
        req.filesInfo = req.files.map(file => ({
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path,
          uploadedAt: new Date()
        }));
      }

      next();
    });
  };
};

// File cleanup utility
const cleanupUploadedFiles = (files) => {
  if (!files) return;

  const filesToDelete = Array.isArray(files) ? files : [files];

  filesToDelete.forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Error deleting file:', file.path, error);
      }
    }
  });
};

// Virus scanning simulation (placeholder for actual implementation)
const scanForViruses = (filePath) => {
  // This is a placeholder for actual virus scanning
  // In a real implementation, you would integrate with a service like:
  // - ClamAV
  // - VirusTotal API
  // - Cloud-based antivirus services

  return new Promise((resolve) => {
    // For now, just resolve as clean
    // In production, implement actual virus scanning
    setTimeout(() => {
      resolve({ clean: true, threats: [] });
    }, 100);
  });
};

module.exports = {
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  createUploadMiddleware,
  createMultipleUploadMiddleware,
  cleanupUploadedFiles,
  scanForViruses
};