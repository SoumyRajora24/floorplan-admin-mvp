const db = require('../models');
const versionControl = require('../services/versionControl');
const conflictResolution = require('../services/conflictResolution');
const auditLogger = require('../services/auditLogger');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

exports.createFloorPlan = async (req, res, next) => {
  try {
    const { name, description, buildingName, floorNumber, initialData } = req.body;
    const userId = req.user.id;

    // Get image URL - prefer Cloudinary, fallback to local
    const imageUrl = req.cloudinaryUrl || (req.file ? `/api/floorplans/images/${req.file.filename}` : null);
    const cloudinaryPublicId = req.cloudinaryPublicId || null;

    const floorPlan = await db.FloorPlan.create({
      name,
      description,
      buildingName,
      floorNumber,
      imageUrl
    });

    // Create initial version
    const version = await versionControl.createVersion(
      floorPlan.id,
      userId,
      initialData || { rooms: [], seats: [], zones: [] },
      'Initial floor plan creation'
    );

    await auditLogger.log({
      entityType: 'floor_plan',
      entityId: floorPlan.id,
      action: 'create',
      userId,
      changes: { floorPlan, version },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: {
        floorPlan,
        version
      }
    });
  } catch (error) {
    // Clean up uploaded file if floor plan creation fails
    if (req.cloudinaryPublicId) {
      // Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(req.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    } else if (req.file) {
      // Delete local file
      const filePath = path.join(__dirname, '../../uploads/floorplans', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    next(error);
  }
};

exports.getFloorPlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const floorPlan = await db.FloorPlan.findByPk(id);

    if (!floorPlan) {
      return res.status(404).json({
        success: false,
        message: 'Floor plan not found'
      });
    }

    // Get current version if it exists
    let currentVersion = null;
    if (floorPlan.currentVersionId) {
      currentVersion = await db.FloorPlanVersion.findByPk(floorPlan.currentVersionId);
    }

    // Convert to JSON and add currentVersion
    const floorPlanData = floorPlan.toJSON();
    if (currentVersion) {
      floorPlanData.currentVersion = currentVersion;
    }

    res.json({
      success: true,
      data: floorPlanData
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFloorPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { changes, baseVersionId: providedBaseVersionId, changeSummary } = req.body;
    const userId = req.user.id;

    // Get floor plan to determine baseVersionId if not provided
    const floorPlan = await db.FloorPlan.findByPk(id);
    if (!floorPlan) {
      return res.status(404).json({
        success: false,
        message: 'Floor plan not found'
      });
    }

    // Update image URL if new file was uploaded - prefer Cloudinary, fallback to local
    let oldImagePath = null;
    let oldCloudinaryPublicId = null;
    
    if (req.cloudinaryUrl || req.file) {
      // Delete old image if it exists
      if (floorPlan.imageUrl) {
        // Check if old image is from Cloudinary (contains res.cloudinary.com)
        if (floorPlan.imageUrl.includes('res.cloudinary.com')) {
          // Extract public_id from Cloudinary URL
          // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
          const urlParts = floorPlan.imageUrl.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
            oldCloudinaryPublicId = urlParts.slice(uploadIndex + 2).join('/').replace(/\.[^/.]+$/, '');
          }
        } else {
          // Local file - extract filename
          const oldFilename = floorPlan.imageUrl.split('/').pop();
          oldImagePath = path.join(__dirname, '../../uploads/floorplans', oldFilename);
        }
      }
      
      // Set new image URL
      floorPlan.imageUrl = req.cloudinaryUrl || (req.file ? `/api/floorplans/images/${req.file.filename}` : floorPlan.imageUrl);
      await floorPlan.save();
      
      // Delete old image after successful update
      if (oldCloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(oldCloudinaryPublicId);
        } catch (error) {
          console.error('Error deleting old Cloudinary image:', error);
        }
      } else if (oldImagePath && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Use provided baseVersionId or fall back to currentVersionId
    const baseVersionId = providedBaseVersionId || floorPlan.currentVersionId;

    // Only detect conflicts if we have a baseVersionId
    let hasConflict = false;
    if (baseVersionId) {
      hasConflict = await conflictResolution.detectConflict(id, baseVersionId);
    }

    if (hasConflict) {
      // Resolve conflict
      const resolution = await conflictResolution.resolveConflict(
        id,
        baseVersionId,
        changes,
        userId
      );

      if (resolution.resolution === 'manual') {
        // Return conflict data for manual resolution
        return res.status(409).json({
          success: false,
          conflict: true,
          data: resolution
        });
      }

      // Auto-resolved
      const version = await versionControl.createVersion(
        id,
        userId,
        resolution.mergedSnapshot,
        changeSummary || `Auto-resolved conflict (${resolution.resolution})`,
        baseVersionId
      );

      version.conflictResolution = resolution;

      await auditLogger.log({
        entityType: 'floor_plan',
        entityId: id,
        action: 'update_with_conflict',
        userId,
        changes: { resolution, version },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.json({
        success: true,
        conflictResolved: true,
        data: { version, resolution }
      });
    }

    // No conflict, create new version
    const version = await versionControl.createVersion(
      id,
      userId,
      changes,
      changeSummary || 'Floor plan update',
      baseVersionId
    );

    await auditLogger.log({
      entityType: 'floor_plan',
      entityId: id,
      action: 'update',
      userId,
      changes: version,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Emit socket event
    req.io.to(`floorplan:${id}`).emit('floorPlanUpdated', {
      floorPlanId: id,
      version,
      author: req.user
    });

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    // Clean up uploaded file if update fails
    if (req.cloudinaryPublicId) {
      // Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(req.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    } else if (req.file) {
      // Delete local file
      const filePath = path.join(__dirname, '../../uploads/floorplans', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    next(error);
  }
};

exports.resolveConflictManually = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolvedSnapshot, changeSummary, baseVersionId } = req.body;
    const userId = req.user.id;

    const version = await versionControl.createVersion(
      id,
      userId,
      resolvedSnapshot,
      changeSummary || 'Manual conflict resolution',
      baseVersionId
    );

    await auditLogger.log({
      entityType: 'floor_plan',
      entityId: id,
      action: 'manual_conflict_resolution',
      userId,
      changes: version,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    req.io.to(`floorplan:${id}`).emit('conflictResolved', {
      floorPlanId: id,
      version
    });

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    next(error);
  }
};

exports.listFloorPlans = async (req, res, next) => {
  try {
    const floorPlans = await db.FloorPlan.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'description', 'buildingName', 'floorNumber', 'imageUrl', 'createdAt']
    });

    res.json({
      success: true,
      data: floorPlans
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFloorPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const floorPlan = await db.FloorPlan.findByPk(id);

    if (!floorPlan) {
      return res.status(404).json({
        success: false,
        message: 'Floor plan not found'
      });
    }

    if (!floorPlan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Floor plan is already deleted'
      });
    }

    // Soft delete - set isActive to false
    floorPlan.isActive = false;
    await floorPlan.save();

    // Delete associated image from Cloudinary or local storage
    if (floorPlan.imageUrl) {
      if (floorPlan.imageUrl.includes('res.cloudinary.com')) {
        // Extract public_id from Cloudinary URL
        const urlParts = floorPlan.imageUrl.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
          const publicId = urlParts.slice(uploadIndex + 2).join('/').replace(/\.[^/.]+$/, '');
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (cloudinaryError) {
            console.error('Error deleting image from Cloudinary:', cloudinaryError);
            // Continue even if image deletion fails
          }
        }
      } else {
        // Local file - extract filename and delete
        const filename = floorPlan.imageUrl.split('/').pop();
        const filePath = path.join(__dirname, '../../uploads/floorplans', filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileError) {
            console.error('Error deleting local image file:', fileError);
            // Continue even if file deletion fails
          }
        }
      }
    }

    // Log the deletion
    await auditLogger.log({
      entityType: 'floor_plan',
      entityId: id,
      action: 'delete',
      userId,
      changes: { floorPlan: { id, name: floorPlan.name } },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Emit socket event
    req.io.emit('floorPlanDeleted', {
      floorPlanId: id,
      deletedBy: req.user
    });

    res.json({
      success: true,
      message: 'Floor plan deleted successfully',
      data: { id: floorPlan.id }
    });
  } catch (error) {
    next(error);
  }
};

exports.serveImage = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, '../../uploads/floorplans', filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Determine content type from file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf'
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', contentType);

    // Send file
    res.sendFile(imagePath);
  } catch (error) {
    next(error);
  }
};
