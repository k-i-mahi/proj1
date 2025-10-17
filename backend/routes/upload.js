const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const ensureUploadsDir = async () => {
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5, // Max 5 files per request
  },
  fileFilter: fileFilter,
});

/**
 * @route   POST /api/upload/single
 * @desc    Upload single image
 * @access  Private
 */
router.post('/single', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading file',
    });
  }
});

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple images (max 5)
 * @access  Private
 */
router.post(
  '/multiple',
  protect,
  upload.array('images', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const files = req.files.map((file) => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        path: file.path,
      }));

      res.status(200).json({
        success: true,
        message: `${files.length} file(s) uploaded successfully`,
        data: files,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error uploading files',
      });
    }
  },
);

/**
 * @route   DELETE /api/upload/:filename
 * @desc    Delete uploaded file
 * @access  Private
 */
router.delete('/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;

    // Prevent directory traversal
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename',
      });
    }

    const filePath = path.join(uploadsDir, filename);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
    });
  }
});

/**
 * @route   GET /api/upload/files
 * @desc    List all uploaded files (admin only)
 * @access  Private/Admin
 */
router.get('/files', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
    }

    await ensureUploadsDir();
    const files = await fs.readdir(uploadsDir);

    const fileDetails = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(uploadsDir, filename);
        const stats = await fs.stat(filePath);

        return {
          filename,
          size: stats.size,
          url: `/uploads/${filename}`,
          uploadedAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: fileDetails.length,
      data: fileDetails,
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing files',
    });
  }
});

/**
 * @route   POST /api/upload/cleanup
 * @desc    Clean up orphaned files (admin only)
 * @access  Private/Admin
 */
router.post('/cleanup', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
    }

    const Issue = require('../models/Issue');
    const files = await fs.readdir(uploadsDir);

    // Get all image URLs from database
    const issues = await Issue.find({}, 'images');
    const usedFiles = new Set();

    issues.forEach((issue) => {
      issue.images?.forEach((img) => {
        const filename = path.basename(img.url);
        usedFiles.add(filename);
      });
    });

    // Find orphaned files
    const orphanedFiles = files.filter((file) => !usedFiles.has(file));

    // Delete orphaned files
    let deletedCount = 0;
    for (const file of orphanedFiles) {
      try {
        await fs.unlink(path.join(uploadsDir, file));
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${file}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      message: `Cleanup completed. ${deletedCount} orphaned file(s) deleted.`,
      data: {
        totalFiles: files.length,
        usedFiles: usedFiles.size,
        orphanedFiles: orphanedFiles.length,
        deletedFiles: deletedCount,
      },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name in upload.',
      });
    }
  }

  res.status(400).json({
    success: false,
    message: error.message || 'Error uploading file',
  });
});

module.exports = router;
