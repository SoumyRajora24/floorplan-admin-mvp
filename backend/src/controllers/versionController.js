const versionControl = require('../services/versionControl');
const db = require('../models');

exports.getVersionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const versions = await versionControl.getVersionHistory(id, limit);

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    next(error);
  }
};

exports.getVersion = async (req, res, next) => {
  try {
    const { versionId } = req.params;

    const version = await db.FloorPlanVersion.findByPk(versionId, {
      include: [{ model: db.User, as: 'author', attributes: ['id', 'name', 'email'] }]
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    next(error);
  }
};

exports.rollback = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user.id;

    const version = await versionControl.rollback(id, versionId, userId);

    // Emit socket event
    req.io.to(`floorplan:${id}`).emit('floorPlanRolledBack', {
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

exports.compareVersions = async (req, res, next) => {
  try {
    const { version1, version2 } = req.params;

    const [v1, v2] = await Promise.all([
      db.FloorPlanVersion.findByPk(version1),
      db.FloorPlanVersion.findByPk(version2)
    ]);

    if (!v1 || !v2) {
      return res.status(404).json({
        success: false,
        message: 'One or both versions not found'
      });
    }

    const diff = versionControl.calculateDiff(v1.snapshot, v2.snapshot);

    res.json({
      success: true,
      data: {
        version1: v1,
        version2: v2,
        diff
      }
    });
  } catch (error) {
    next(error);
  }
};
