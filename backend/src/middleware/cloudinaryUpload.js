const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Configure multer to use memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allow images and PDFs
  const allowedTypes = /jpeg|jpg|png|gif|pdf|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, SVG) and PDF files are allowed!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Middleware to upload to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.warn('Cloudinary not configured, falling back to local storage');
      return next();
    }

    // Convert buffer to stream
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'floorplans',
        resource_type: 'auto', // auto-detect image or raw (for PDFs)
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return next(error);
        }
        
        // Store Cloudinary URL and public_id in request
        req.cloudinaryUrl = result.secure_url;
        req.cloudinaryPublicId = result.public_id;
        next();
      }
    );

    // Pipe buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(stream);

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    next(error);
  }
};

module.exports = { upload, uploadToCloudinary };

